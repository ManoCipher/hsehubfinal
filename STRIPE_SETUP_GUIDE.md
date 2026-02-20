# Stripe Integration Setup Guide

## Required Supabase Secrets

Set these via the Supabase Dashboard → Project Settings → Edge Functions → Secrets,
or with the CLI:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PRICE_BASIC=price_...
supabase secrets set STRIPE_PRICE_STANDARD=price_...
supabase secrets set STRIPE_PRICE_PREMIUM=price_...
supabase secrets set SITE_URL=https://yourdomain.com
```

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
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy the Webhook Signing Secret and set it as `STRIPE_WEBHOOK_SECRET`

## Stripe Price IDs

1. Go to Stripe Dashboard → Products
2. Create three products: Basic ($99/mo), Standard ($199/mo), Premium ($299/mo)
3. Each should be a **recurring** subscription price
4. Copy each Price ID (starts with `price_`) and set as secrets above

## Billing Portal Configuration

1. Go to Stripe Dashboard → Settings → Billing → Customer Portal
2. Enable the features you want (cancel subscription, update payment method, etc.)
3. Set your business branding

## How It Works

| Action | Flow |
|--------|------|
| **Manage Billing** button | Opens Stripe Customer Portal (manage cards, cancel, update billing info) |
| **Upgrade Plan** button | Opens Stripe Checkout for the selected plan |
| **Payment webhook** | Auto-creates invoice records in Supabase when Stripe invoices are paid |
| **Subscription webhook** | Updates `companies.subscription_tier/status` when subscription changes |
