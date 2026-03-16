export const STRIPE_PAYMENT_LINKS = {
  basic: {
    monthly: "https://buy.stripe.com/cNi4gy9vEenj9jxgWNeME03", // Package S Monthly
    yearly: "https://buy.stripe.com/28E14m6jsdjf2V9fSJeME04",   // Package S Yearly
  },
  standard: {
    monthly: "https://buy.stripe.com/00w00idLU0wt53hdKBeME05",  // Package M Monthly
    yearly: "https://buy.stripe.com/14A14m37g2EBeDRdKBeME06",   // Package M Yearly
  },
  premium: {
    monthly: "https://buy.stripe.com/9B628q6js2EB9jxaypeME07",  // Package L Monthly
    yearly: "https://buy.stripe.com/cNibJ00Z81AxgLZ0XPeME08",   // Package L Yearly
  }
} as const;
