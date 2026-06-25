import Stripe from "stripe";

let _stripe: Stripe | undefined;
export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY. Add it in project secrets to enable checkout.");
  _stripe = new Stripe(key);
  return _stripe;
}

export function getAppUrl(req?: Request): string {
  const fromEnv = process.env.APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const origin = req?.headers.get("origin");
  if (origin) return origin;
  return "http://localhost:8080";
}