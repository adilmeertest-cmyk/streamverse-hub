import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const planIdSchema = z.object({ planId: z.string().uuid() });

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => planIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { getStripe, getAppUrl } = await import("./billing.server");
    const stripe = getStripe();
    const req = getRequest();
    const appUrl = getAppUrl(req ?? undefined);

    const { data: plan, error: planErr } = await context.supabase
      .from("subscription_plans")
      .select("id,name,price_cents,currency,interval,trial_days,stripe_price_id")
      .eq("id", data.planId)
      .maybeSingle();
    if (planErr || !plan) throw new Error("Plan not found");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email,stripe_customer_id,display_name")
      .eq("id", context.userId)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email ?? undefined,
        name: profile?.display_name ?? undefined,
        metadata: { user_id: context.userId },
      });
      customerId = customer.id;
      await supabaseAdmin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", context.userId);
    }

    // Use existing stripe_price_id or create a price on the fly per plan
    let priceId = plan.stripe_price_id ?? null;
    if (!priceId) {
      const product = await stripe.products.create({ name: plan.name, metadata: { plan_id: plan.id } });
      const price = await stripe.prices.create({
        product: product.id,
        currency: (plan.currency ?? "usd").toLowerCase(),
        unit_amount: plan.price_cents,
        recurring: { interval: plan.interval === "yearly" ? "year" : "month" },
      });
      priceId = price.id;
      await supabaseAdmin.from("subscription_plans").update({ stripe_price_id: priceId }).eq("id", plan.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: plan.trial_days ? { trial_period_days: plan.trial_days } : undefined,
      allow_promotion_codes: true,
      success_url: `${appUrl}/account?checkout=success`,
      cancel_url: `${appUrl}/pricing?checkout=cancel`,
      metadata: { user_id: context.userId, plan_id: plan.id },
    });

    return { url: session.url };
  });

export const createBillingPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getStripe, getAppUrl } = await import("./billing.server");
    const stripe = getStripe();
    const req = getRequest();
    const appUrl = getAppUrl(req ?? undefined);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.stripe_customer_id) throw new Error("No billing account found. Subscribe to a plan first.");

    const portal = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/account`,
    });
    return { url: portal.url };
  });

export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("subscriptions")
      .select("id,status,current_period_end,cancel_at_period_end,plan_id,stripe_subscription_id, subscription_plans(name,tier,interval,price_cents,currency,max_quality,max_screens)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ?? null;
  });

export const isStripeConfigured = createServerFn({ method: "GET" }).handler(async () => {
  return { configured: Boolean(process.env.STRIPE_SECRET_KEY) };
});