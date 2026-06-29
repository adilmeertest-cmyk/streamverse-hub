import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { getStripe } = await import("@/lib/billing.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const stripe = getStripe();

        const sig = request.headers.get("stripe-signature");
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!sig || !secret) return new Response("Missing signature/secret", { status: 400 });

        const raw = await request.text();
        let event;
        try {
          event = await stripe.webhooks.constructEventAsync(raw, sig, secret);
        } catch (err) {
          console.error("[stripe-webhook] invalid signature", err);
          return new Response("Invalid signature", { status: 400 });
        }

        async function upsertSubFromStripe(sub: { id: string; customer: string | { id: string }; status: string; current_period_start: number; current_period_end: number; cancel_at_period_end: boolean; items: { data: { price: { id: string } }[] }; metadata?: Record<string, string> }) {
          const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();
          const userId = profile?.id ?? sub.metadata?.user_id;
          if (!userId) {
            console.error("[stripe-webhook] cannot resolve user for customer", customerId);
            return;
          }
          const priceId = sub.items.data[0]?.price.id;
          let planId = sub.metadata?.plan_id ?? null;
          if (!planId && priceId) {
            const { data: plan } = await supabaseAdmin
              .from("subscription_plans")
              .select("id")
              .eq("stripe_price_id", priceId)
              .maybeSingle();
            planId = plan?.id ?? null;
          }
          if (!planId) {
            console.error("[stripe-webhook] cannot resolve plan for price", priceId);
            return;
          }
          await supabaseAdmin.from("subscriptions").upsert({
            user_id: userId,
            plan_id: planId,
            status: sub.status as never,
            stripe_subscription_id: sub.id,
            stripe_customer_id: customerId,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          }, { onConflict: "stripe_subscription_id" });
        }

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const session = event.data.object as { subscription?: string };
              if (session.subscription) {
                const sub = await stripe.subscriptions.retrieve(session.subscription);
                await upsertSubFromStripe(sub as never);
              }
              break;
            }
            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted": {
              await upsertSubFromStripe(event.data.object as never);
              break;
            }
            case "invoice.payment_failed": {
              const inv = event.data.object as { subscription?: string };
              if (inv.subscription) {
                await supabaseAdmin
                  .from("subscriptions")
                  .update({ status: "past_due" as never, updated_at: new Date().toISOString() })
                  .eq("stripe_subscription_id", inv.subscription);
              }
              break;
            }
          }
        } catch (err) {
          console.error("[stripe-webhook] handler error", err);
          return new Response("Handler error", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});