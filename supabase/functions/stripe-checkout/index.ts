import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.5.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map plan names to Stripe Price IDs – set these in your Stripe dashboard and
// store the IDs in Supabase secrets (STRIPE_PRICE_BASIC, _STANDARD, _PREMIUM).
function getPriceId(tier: string): string {
  const map: Record<string, string> = {
    basic: Deno.env.get("STRIPE_PRICE_BASIC") ?? "",
    standard: Deno.env.get("STRIPE_PRICE_STANDARD") ?? "",
    premium: Deno.env.get("STRIPE_PRICE_PREMIUM") ?? "",
  };
  return map[tier] ?? "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Auth – verify JWT
    const authHeader = req.headers.get("authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Parse body
    const body = await req.json().catch(() => ({}));
    const tier: string = body.tier ?? "standard";
    const siteUrl: string = Deno.env.get("SITE_URL") ?? "";
    const successUrl: string = body.success_url ?? `${siteUrl}/invoices?checkout=success`;
    const cancelUrl: string = body.cancel_url ?? `${siteUrl}/invoices?checkout=cancelled`;

    const priceId = getPriceId(tier);
    if (!priceId) {
      return new Response(
        JSON.stringify({ error: `No Stripe price configured for plan: ${tier}. Add STRIPE_PRICE_${tier.toUpperCase()} secret.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Load company
    const { data: profile } = await supabase
      .from("user_company_roles")
      .select("company_id")
      .eq("user_id", user.id)
      .single();

    const companyId = profile?.company_id;
    if (!companyId) {
      return new Response(JSON.stringify({ error: "No company found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: company } = await supabase
      .from("companies")
      .select("stripe_customer_id, name, billing_email, email")
      .eq("id", companyId)
      .single();

    // 4. Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    let customerId: string = company?.stripe_customer_id ?? "";

    // Auto-create customer if not present
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: company?.billing_email ?? company?.email ?? user.email,
        name: company?.name ?? "Company",
        metadata: { company_id: companyId },
      });
      customerId = customer.id;
      await supabase.from("companies").update({ stripe_customer_id: customerId }).eq("id", companyId);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        company_id: companyId,
        plan: tier,
      },
      subscription_data: {
        metadata: { company_id: companyId, plan: tier },
      },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("stripe-checkout error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
