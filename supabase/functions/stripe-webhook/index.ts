import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.5.0?target=deno";

serve(async (req) => {
  const signature = req.headers.get("stripe-signature") ?? "";
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

  let event: Stripe.Event;

  try {
    const body = await req.text();
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Webhook Error", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    switch (event.type) {
      // ── Subscription activated / updated ───────────────────────────────────
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const companyId = sub.metadata?.company_id;
        if (!companyId) break;

        const plan = sub.metadata?.plan ?? "basic";
        const statusMap: Record<string, string> = {
          active: "active",
          trialing: "trial",
          past_due: "active",
          canceled: "cancelled",
          unpaid: "inactive",
          incomplete: "inactive",
          incomplete_expired: "inactive",
          paused: "inactive",
        };

        await supabase.from("companies").update({
          subscription_tier: plan,
          subscription_status: statusMap[sub.status] ?? "active",
          stripe_subscription_id: sub.id,
          subscription_start_date: new Date(sub.start_date * 1000).toISOString(),
          subscription_end_date: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
        }).eq("id", companyId);
        break;
      }

      // ── Subscription cancelled ─────────────────────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const companyId = sub.metadata?.company_id;
        if (!companyId) break;

        await supabase.from("companies").update({
          subscription_status: "cancelled",
          subscription_end_date: sub.canceled_at
            ? new Date(sub.canceled_at * 1000).toISOString()
            : null,
        }).eq("id", companyId);
        break;
      }

      // ── Invoice paid ───────────────────────────────────────────────────────
      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;
        const companyId = (inv.subscription_details?.metadata as Record<string, string>)?.company_id
          ?? (inv.metadata as Record<string, string>)?.company_id;
        if (!companyId) break;

        const invoiceNumber =
          inv.number ??
          `INV-${new Date().getFullYear()}-${String(inv.created).slice(-5)}`;

        // Upsert invoice record
        await supabase.from("invoices").upsert({
          company_id: companyId,
          invoice_number: invoiceNumber,
          status: "paid",
          subtotal: (inv.subtotal ?? 0) / 100,
          tax_amount: (inv.tax ?? 0) / 100,
          total: (inv.amount_paid ?? inv.total ?? 0) / 100,
          currency: (inv.currency ?? "usd").toUpperCase(),
          paid_at: inv.status_transitions?.paid_at
            ? new Date(inv.status_transitions.paid_at * 1000).toISOString()
            : new Date().toISOString(),
          payment_method: "stripe",
          due_date: inv.due_date ? new Date(inv.due_date * 1000).toISOString() : null,
          billing_period_start: inv.period_start
            ? new Date(inv.period_start * 1000).toISOString()
            : null,
          billing_period_end: inv.period_end
            ? new Date(inv.period_end * 1000).toISOString()
            : null,
          notes: inv.description ?? null,
          line_items: (inv.lines?.data ?? []).map((line) => ({
            description: line.description ?? "Subscription",
            quantity: line.quantity ?? 1,
            unit_price: (line.unit_amount_excluding_tax ?? line.amount ?? 0) / 100,
            total: (line.amount ?? 0) / 100,
          })),
          metadata: { stripe_invoice_id: inv.id, stripe_hosted_url: inv.hosted_invoice_url ?? null },
        }, { onConflict: "invoice_number" });
        break;
      }

      // ── Invoice payment failed ─────────────────────────────────────────────
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const invoiceNumber = inv.number;
        if (!invoiceNumber) break;

        await supabase.from("invoices")
          .update({ status: "overdue" })
          .eq("invoice_number", invoiceNumber);
        break;
      }

      // ── Checkout completed ─────────────────────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Session;
        const companyId = session.metadata?.company_id;
        const plan = session.metadata?.plan;
        if (!companyId || !plan) break;

        await supabase.from("companies").update({
          subscription_tier: plan,
          subscription_status: "active",
        }).eq("id", companyId);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response("Handler Error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
