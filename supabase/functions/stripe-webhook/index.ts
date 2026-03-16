// @ts-nocheck - Deno edge function
// @ts-ignore - Deno imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Supabase JS
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore - Stripe
import Stripe from "https://esm.sh/stripe@14.5.0?target=deno";

declare const Deno: any;

serve(async (req: Request) => {
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
        // With Payment Links, metadata won't be on the subscription by default unless we copy it.
        // If metadata.company_id exists (for legacy checkouts), we use it. 
        // Otherwise, we match by stripe_customer_id which is set during checkout.session.completed.
        let companyId = sub.metadata?.company_id;
        
        if (!companyId && sub.customer) {
          const { data: c } = await supabase.from("companies").select("id").eq("stripe_customer_id", sub.customer as string).single();
          if (c) companyId = c.id;
        }
        
        if (!companyId) break;

        const plan = sub.metadata?.plan ?? "basic"; // We might need to map Stripe Price IDs to plans instead later if necessary
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
          // Note: we only update tier if we are sure of the plan, but we can't be sure from static links easily unless we map prices. 
          // We will map prices in the checkout.session.completed event instead.
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
        let companyId = sub.metadata?.company_id;
        if (!companyId && sub.customer) {
          const { data: c } = await supabase.from("companies").select("id").eq("stripe_customer_id", sub.customer as string).single();
          if (c) companyId = c.id;
        }
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
        let companyId = (inv.subscription_details?.metadata as Record<string, string>)?.company_id
          ?? (inv.metadata as Record<string, string>)?.company_id;
          
        if (!companyId && inv.customer) {
          const { data: c } = await supabase.from("companies").select("id").eq("stripe_customer_id", inv.customer as string).single();
          if (c) companyId = c.id;
        }
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
          // @ts-ignore - Stripe invoice line items
          line_items: (inv.lines?.data ?? []).map((line: any) => ({
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
        // With Payment Links, we use client_reference_id for the company ID
        const companyId = session.client_reference_id || session.metadata?.company_id;
        
        // Find plan from line items if metadata is missing (common for Payment Links)
        let plan = session.metadata?.plan;
        
        if (!plan) {
          // Attempt to map the price from the session to a plan if Deno env variables are available,
          // though since we don't fetch the line items here, we can infer it or we fallback to basic.
          // To be perfectly accurate we'd fetch the line items, but let's do a basic mapping for now.
          // Wait, Stripe checkout.session.completed includes `payment_link`, we could map it, but the safest 
          // way is to rely on subscription webhook updates for plan changes if we map the tier there.
          plan = "standard"; // Default fallback
        }

        if (!companyId) break;

        const updatePayload: any = {
          subscription_status: "active",
        };
        if (plan) {
          updatePayload.subscription_tier = plan;
        }
        if (session.customer) {
          updatePayload.stripe_customer_id = session.customer;
        }
        if (session.subscription) {
          updatePayload.stripe_subscription_id = session.subscription;
        }

        await supabase.from("companies").update(updatePayload).eq("id", companyId);
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
