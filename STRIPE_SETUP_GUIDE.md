# Stripe Integration Setup Guide

## Required Supabase Secrets

Set these via the Supabase Dashboard → Project Settings → Edge Functions → Secrets,
or with the CLI:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PRICE_BASIC_MONTHLY=price_...
supabase secrets set STRIPE_PRICE_BASIC_YEARLY=price_...
supabase secrets set STRIPE_PRICE_STANDARD_MONTHLY=price_...
supabase secrets set STRIPE_PRICE_STANDARD_YEARLY=price_...
supabase secrets set STRIPE_PRICE_PREMIUM_MONTHLY=price_...
supabase secrets set STRIPE_PRICE_PREMIUM_YEARLY=price_...
supabase secrets set SITE_URL=https://yourdomain.com
```

Optional (if you want webhook payment-link URL mapping to be managed by secrets instead of defaults):

```bash
supabase secrets set STRIPE_PAYMENT_LINK_BASIC_MONTHLY_URL=https://buy.stripe.com/...
supabase secrets set STRIPE_PAYMENT_LINK_BASIC_YEARLY_URL=https://buy.stripe.com/...
supabase secrets set STRIPE_PAYMENT_LINK_STANDARD_MONTHLY_URL=https://buy.stripe.com/...
supabase secrets set STRIPE_PAYMENT_LINK_STANDARD_YEARLY_URL=https://buy.stripe.com/...
supabase secrets set STRIPE_PAYMENT_LINK_PREMIUM_MONTHLY_URL=https://buy.stripe.com/...
supabase secrets set STRIPE_PAYMENT_LINK_PREMIUM_YEARLY_URL=https://buy.stripe.com/...
```

Legacy fallback for monthly checkout (still supported):

```bash
supabase secrets set STRIPE_PRICE_BASIC=price_...
supabase secrets set STRIPE_PRICE_STANDARD=price_...
supabase secrets set STRIPE_PRICE_PREMIUM=price_...
```

## Database Migration

Apply the new migration for explicit billing cycle tracking:

```bash
supabase migration up
```

This adds `companies.subscription_billing_interval` (`month` / `year`).

## Deploy Edge Functions

```bash
supabase functions deploy stripe-billing-portal
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook
```

## Stripe Webhook Setup

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://<your-supabase-ref>.supabase.co/functions/v1/stripe-webhook`
3. Select these events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy the Webhook Signing Secret and set it as `STRIPE_WEBHOOK_SECRET`

## Stripe Price IDs

1. Go to Stripe Dashboard → Products
2. Create three products: Basic, Standard, Premium
3. Create **two recurring prices** per product (`month` and `year`)
4. Copy each Price ID (starts with `price_`) and set as secrets above

## Required Package Mapping

For robust webhook plan detection, ensure `subscription_packages` includes Stripe price IDs:

- `stripe_price_id_monthly`
- `stripe_price_id_yearly`

The webhook uses these IDs first, then payment-link URL mapping, then metadata fallback.

## Billing Portal Configuration

1. Go to Stripe Dashboard → Settings → Billing → Customer Portal
2. Enable the features you want (cancel subscription, update payment method, etc.)
3. Set your business branding

## How It Works

| Action | Flow |
|--------|------|
| **Manage Billing** button | Opens Stripe Customer Portal (manage cards, cancel, update billing info) |
| **Choose Plan (Monthly/Yearly)** | Opens Stripe Payment Link with `client_reference_id` + prefilled email |
| **Payment webhook** | Creates/updates invoice records and updates company status on paid/failed events |
| **Subscription webhook** | Updates `companies.subscription_tier/status/billing_interval/start/end` on subscription changes |
