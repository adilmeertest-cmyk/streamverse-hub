# Subscription and Payment System Architecture for StreamFlix Platform

## Overview
This document describes the comprehensive subscription and payment system architecture for a Netflix-style streaming platform, including monthly/yearly plans, payment integration architecture, subscription management, coupon system, and billing history.

## Architecture Overview

```
Payment System Architecture
├── Subscription Plans
│   ├── Plan Tiers (Basic, Standard, Premium, Family)
│   ├── Billing Intervals (Monthly, Yearly)
│   ├── Plan Features
│   └── Pricing Configuration
├── Payment Processing
│   ├── Stripe Integration
│   ├── Checkout Sessions
│   ├── Payment Methods
│   └── Webhook Handling
├── Subscription Management
│   ├── Subscription Lifecycle
│   ├── Plan Changes/Upgrades
│   ├── Cancellation Handling
│   └── Trial Management
├── Coupon System
│   ├── Coupon Creation
│   ├── Discount Types
│   ├── Usage Tracking
│   └── Expiration Management
├── Billing Management
│   ├── Invoice Generation
│   ├── Payment History
│   ├── Refund Processing
│   └── Billing Portal
└── Revenue Analytics
    ├── Revenue Tracking
    ├── Churn Analysis
    ├── MRR/ARR Calculation
    └── Revenue Forecasting
```

## Subscription Plans

### Plan Configuration
```typescript
interface SubscriptionPlan {
  id: string;
  tier: PlanTier;
  interval: PlanInterval;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  maxScreens: number;
  maxQuality: VideoQuality;
  features: PlanFeature[];
  trialDays: number;
  stripePriceId?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

type PlanTier = 'basic' | 'standard' | 'premium' | 'family';
type PlanInterval = 'monthly' | 'yearly';
type VideoQuality = '720p' | '1080p' | '4K';

interface PlanFeature {
  id: string;
  name: string;
  description: string;
  included: boolean;
}

// Predefined plans
export const SUBSCRIPTION_PLANS: Omit<SubscriptionPlan, 'id' | 'stripePriceId' | 'createdAt' | 'updatedAt'>[] = [
  {
    tier: 'basic',
    interval: 'monthly',
    name: 'Basic',
    description: 'Essential streaming for one screen',
    priceCents: 499, // $4.99
    currency: 'USD',
    maxScreens: 1,
    maxQuality: '720p',
    features: [
      { id: '1', name: '1 Screen', description: 'Watch on one device at a time', included: true },
      { id: '2', name: 'HD 720p', description: 'High definition streaming', included: true },
      { id: '3', name: 'Cancel Anytime', description: 'No long-term contracts', included: true },
      { id: '4', name: 'Downloads', description: 'Download for offline viewing', included: false },
      { id: '5', name: '4K Ultra HD', description: 'Ultra high definition', included: false },
    ],
    trialDays: 14,
    isActive: true,
    displayOrder: 1,
  },
  {
    tier: 'standard',
    interval: 'monthly',
    name: 'Standard',
    description: 'Great for couples or small families',
    priceCents: 999, // $9.99
    currency: 'USD',
    maxScreens: 2,
    maxQuality: '1080p',
    features: [
      { id: '1', name: '2 Screens', description: 'Watch on two devices at a time', included: true },
      { id: '2', name: 'Full HD 1080p', description: 'Full high definition streaming', included: true },
      { id: '3', 'Downloads', description: 'Download for offline viewing', included: true },
      { id: '4', 'Cancel Anytime', description: 'No long-term contracts', included: true },
      { id: '5', name: '4K Ultra HD', description: 'Ultra high definition', included: false },
    ],
    trialDays: 14,
    isActive: true,
    displayOrder: 2,
  },
  {
    tier: 'premium',
    interval: 'monthly',
    name: 'Premium',
    description: 'Ultimate streaming experience',
    priceCents: 1499, // $14.99
    currency: 'USD',
    maxScreens: 4,
    maxQuality: '4K',
    features: [
      { id: '1', name: '4 Screens', description: 'Watch on four devices at a time', included: true },
      { id: '2', name: '4K Ultra HD + HDR', description: 'Ultra high definition with HDR', included: true },
      { id: '3', 'Spatial Audio', description: 'Immersive audio experience', included: true },
      { id: '4', 'Downloads', description: 'Download for offline viewing', included: true },
      { id: '5', 'Cancel Anytime', description: 'No long-term contracts', included: true },
    ],
    trialDays: 14,
    isActive: true,
    displayOrder: 3,
  },
  {
    tier: 'family',
    interval: 'monthly',
    name: 'Family',
    description: 'Perfect for large families',
    priceCents: 1999, // $19.99
    currency: 'USD',
    maxScreens: 6,
    maxQuality: '4K',
    features: [
      { id: '1', name: '6 Screens', description: 'Watch on six devices at a time', included: true },
      { id: '2', name: '4K + HDR', description: 'Ultra high definition with HDR', included: true },
      { id: '3', 'Kids Profiles', description: 'Safe viewing for kids', included: true },
      { id: '4', 'Parental Controls', description: 'Control what kids watch', included: true },
      { id: '5', 'Downloads', description: 'Download for offline viewing', included: true },
    ],
    trialDays: 14,
    isActive: true,
    displayOrder: 4,
  },
];
```

### Plan Management Service
```typescript
export class SubscriptionPlanService {
  private db: DatabaseConnection;
  private stripe: Stripe;

  constructor(db: DatabaseConnection, stripe: Stripe) {
    this.db = db;
    this.stripe = stripe;
  }

  async createPlan(plan: Omit<SubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionPlan> {
    // Create Stripe product and price
    const product = await this.stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: {
        tier: plan.tier,
        interval: plan.interval,
      },
    });

    const price = await this.stripe.prices.create({
      product: product.id,
      unit_amount: plan.priceCents,
      currency: plan.currency.toLowerCase(),
      recurring: {
        interval: plan.interval === 'yearly' ? 'year' : 'month',
        trial_period_days: plan.trialDays || undefined,
      },
    });

    // Save to database
    const newPlan: SubscriptionPlan = {
      ...plan,
      id: generateUUID(),
      stripePriceId: price.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db.query(
      `INSERT INTO subscription_plans (id, tier, interval, name, description, price_cents, currency, max_screens, max_quality, features, trial_days, stripe_price_id, is_active, display_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        newPlan.id,
        newPlan.tier,
        newPlan.interval,
        newPlan.name,
        newPlan.description,
        newPlan.priceCents,
        newPlan.currency,
        newPlan.maxScreens,
        newPlan.maxQuality,
        JSON.stringify(newPlan.features),
        newPlan.trialDays,
        newPlan.stripePriceId,
        newPlan.isActive,
        newPlan.displayOrder,
        newPlan.createdAt,
        newPlan.updatedAt,
      ]
    );

    return newPlan;
  }

  async updatePlan(id: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const existing = await this.getPlan(id);
    
    // Update Stripe price if price changed
    if (updates.priceCents && updates.priceCents !== existing.priceCents) {
      await this.stripe.prices.update(existing.stripePriceId!, {
        unit_amount: updates.priceCents,
      });
    }

    // Update in database
    const updated: SubscriptionPlan = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    await this.db.query(
      `UPDATE subscription_plans
       SET name = $2, description = $3, price_cents = $4, max_screens = $5, max_quality = $6, features = $7, trial_days = $8, is_active = $9, display_order = $10, updated_at = $11
       WHERE id = $1`,
      [
        updated.id,
        updated.name,
        updated.description,
        updated.priceCents,
        updated.maxScreens,
        updated.maxQuality,
        JSON.stringify(updated.features),
        updated.trialDays,
        updated.isActive,
        updated.displayOrder,
        updated.updatedAt,
      ]
    );

    return updated;
  }

  async getPlan(id: string): Promise<SubscriptionPlan> {
    const result = await this.db.query(
      `SELECT * FROM subscription_plans WHERE id = $1`,
      [id]
    );
    
    if (result.length === 0) {
      throw new Error('Plan not found');
    }

    return this.mapRowToPlan(result[0]);
  }

  async getActivePlans(): Promise<SubscriptionPlan[]> {
    const result = await this.db.query(
      `SELECT * FROM subscription_plans WHERE is_active = true ORDER BY display_order ASC`
    );
    
    return result.map(row => this.mapRowToPlan(row));
  }

  private mapRowToPlan(row: any): SubscriptionPlan {
    return {
      id: row.id,
      tier: row.tier,
      interval: row.interval,
      name: row.name,
      description: row.description,
      priceCents: row.price_cents,
      currency: row.currency,
      maxScreens: row.max_screens,
      maxQuality: row.max_quality,
      features: JSON.parse(row.features),
      trialDays: row.trial_days,
      stripePriceId: row.stripe_price_id,
      isActive: row.is_active,
      displayOrder: row.display_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
```

## Payment Processing

### Stripe Integration
```typescript
export class PaymentService {
  private stripe: Stripe;
  private db: DatabaseConnection;
  private webhookSecret: string;

  constructor(config: PaymentConfig) {
    this.stripe = new Stripe(config.stripeSecretKey);
    this.db = config.db;
    this.webhookSecret = config.webhookSecret;
  }

  async createCheckoutSession(
    userId: string,
    planId: string,
    couponCode?: string
  ): Promise<CheckoutSession> {
    // Get user and plan
    const [user, plan] = await Promise.all([
      this.getUser(userId),
      this.getPlan(planId),
    ]);

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.displayName,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      
      await this.db.query(
        `UPDATE profiles SET stripe_customer_id = $1 WHERE id = $2`,
        [customerId, userId]
      );
    }

    // Apply coupon if provided
    let discounts = [];
    if (couponCode) {
      const coupon = await this.getCoupon(couponCode);
      if (coupon && this.isCouponValid(coupon)) {
        discounts = [{ coupon: coupon.stripeCouponId }];
      }
    }

    // Create checkout session
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      subscription_data: plan.trialDays
        ? { trial_period_days: plan.trialDays }
        : undefined,
      discounts,
      allow_promotion_codes: true,
      success_url: `${config.appUrl}/account?checkout=success`,
      cancel_url: `${config.appUrl}/pricing?checkout=cancel`,
      metadata: {
        userId,
        planId,
      },
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  async createBillingPortalSession(userId: string): Promise<BillingPortalSession> {
    const user = await this.getUser(userId);
    
    if (!user.stripeCustomerId) {
      throw new Error('No billing account found');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${config.appUrl}/account`,
    });

    return {
      url: session.url,
    };
  }

  async handleWebhook(rawBody: string, signature: string): Promise<void> {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret
      );
    } catch (err) {
      throw new Error('Webhook signature verification failed');
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId;

    if (!userId || !planId) {
      console.error('Missing metadata in checkout session');
      return;
    }

    // Subscription will be created by the 'customer.subscription.created' event
    // This is just for logging and any additional processing
    await this.logEvent('checkout_completed', { userId, planId, sessionId: session.id });
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;
    const planId = subscription.metadata?.planId;

    if (!userId || !planId) {
      console.error('Missing metadata in subscription');
      return;
    }

    // Get plan details
    const plan = await this.getPlan(planId);

    // Create subscription record
    await this.db.query(
      `INSERT INTO subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end, stripe_subscription_id, stripe_customer_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        generateUUID(),
        userId,
        planId,
        subscription.status === 'trialing' ? 'trialing' : 'active',
        new Date(subscription.current_period_start * 1000),
        new Date(subscription.current_period_end * 1000),
        subscription.cancel_at_period_end,
        subscription.id,
        subscription.customer as string,
        new Date(),
        new Date(),
      ]
    );

    // Send welcome email
    await this.sendWelcomeEmail(userId, plan);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const existingSubscription = await this.getSubscriptionByStripeId(subscription.id);
    
    if (!existingSubscription) {
      console.error('Subscription not found in database');
      return;
    }

    // Update subscription status
    await this.db.query(
      `UPDATE subscriptions
       SET status = $2, current_period_start = $3, current_period_end = $4, cancel_at_period_end = $5, updated_at = $6
       WHERE stripe_subscription_id = $1`,
      [
        subscription.status === 'trialing' ? 'trialing' : 
        subscription.status === 'past_due' ? 'past_due' : 
        subscription.status === 'canceled' ? 'canceled' : 'active',
        new Date(subscription.current_period_start * 1000),
        new Date(subscription.current_period_end * 1000),
        subscription.cancel_at_period_end,
        new Date(),
      ]
    );

    // Send notification if status changed
    if (existingSubscription.status !== subscription.status) {
      await this.sendSubscriptionStatusNotification(
        existingSubscription.userId,
        subscription.status
      );
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    await this.db.query(
      `UPDATE subscriptions
       SET status = 'canceled', updated_at = $1
       WHERE stripe_subscription_id = $2`,
      [new Date(), subscription.id]
    );

    // Send cancellation email
    const existingSubscription = await this.getSubscriptionByStripeId(subscription.id);
    if (existingSubscription) {
      await this.sendCancellationEmail(existingSubscription.userId);
    }
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    // Create invoice record
    await this.db.query(
      `INSERT INTO invoices (id, user_id, subscription_id, stripe_invoice_id, amount_cents, currency, status, due_date, paid_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        generateUUID(),
        invoice.metadata?.userId,
        invoice.subscription,
        invoice.id,
        invoice.amount_paid,
        invoice.currency,
        'paid',
        invoice.due_date ? new Date(invoice.due_date * 1000) : null,
        invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : new Date(),
        new Date(),
      ]
    );

    // Send receipt email
    if (invoice.metadata?.userId) {
      await this.sendReceiptEmail(invoice.metadata.userId, invoice);
    }
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    // Update subscription status to past_due
    if (invoice.subscription) {
      await this.db.query(
        `UPDATE subscriptions
         SET status = 'past_due', updated_at = $1
         WHERE stripe_subscription_id = $2`,
        [new Date(), invoice.subscription as string]
      );
    }

    // Send payment failed notification
    if (invoice.metadata?.userId) {
      await this.sendPaymentFailedEmail(invoice.metadata.userId, invoice);
    }
  }

  private async getUser(userId: string): Promise<User> {
    const result = await this.db.query(
      `SELECT * FROM profiles WHERE id = $1`,
      [userId]
    );
    return result[0];
  }

  private async getPlan(planId: string): Promise<SubscriptionPlan> {
    const result = await this.db.query(
      `SELECT * FROM subscription_plans WHERE id = $1`,
      [planId]
    );
    return result[0];
  }

  private async getSubscriptionByStripeId(stripeId: string): Promise<Subscription | null> {
    const result = await this.db.query(
      `SELECT * FROM subscriptions WHERE stripe_subscription_id = $1`,
      [stripeId]
    );
    return result[0] || null;
  }

  private async logEvent(eventType: string, data: any): Promise<void> {
    await this.db.query(
      `INSERT INTO payment_events (event_type, data, created_at) VALUES ($1, $2, $3)`,
      [eventType, JSON.stringify(data), new Date()]
    );
  }

  private async sendWelcomeEmail(userId: string, plan: SubscriptionPlan): Promise<void> {
    // Implementation for sending welcome email
  }

  private async sendSubscriptionStatusNotification(userId: string, status: string): Promise<void> {
    // Implementation for sending status notification
  }

  private async sendCancellationEmail(userId: string): Promise<void> {
    // Implementation for sending cancellation email
  }

  private async sendReceiptEmail(userId: string, invoice: Stripe.Invoice): Promise<void> {
    // Implementation for sending receipt email
  }

  private async sendPaymentFailedEmail(userId: string, invoice: Stripe.Invoice): Promise<void> {
    // Implementation for sending payment failed email
  }
}

interface CheckoutSession {
  sessionId: string;
  url: string;
}

interface BillingPortalSession {
  url: string;
}
```

## Subscription Management

### Subscription Lifecycle
```typescript
export class SubscriptionManager {
  private db: DatabaseConnection;
  private stripe: Stripe;

  constructor(db: DatabaseConnection, stripe: Stripe) {
    this.db = db;
    this.stripe = stripe;
  }

  async getActiveSubscription(userId: string): Promise<Subscription | null> {
    const result = await this.db.query(
      `SELECT s.*, p.name as plan_name, p.tier, p.interval, p.max_screens, p.max_quality, p.features
       FROM subscriptions s
       JOIN subscription_plans p ON s.plan_id = p.id
       WHERE s.user_id = $1 AND s.status IN ('active', 'trialing')
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [userId]
    );

    return result[0] || null;
  }

  async changePlan(userId: string, newPlanId: string): Promise<void> {
    const subscription = await this.getActiveSubscription(userId);
    
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    const newPlan = await this.getPlan(newPlanId);
    
    // Update Stripe subscription
    await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      items: [{
        id: subscription.stripeItemId,
        price: newPlan.stripePriceId,
      }],
      proration_behavior: 'create_prorations',
    });

    // Update database
    await this.db.query(
      `UPDATE subscriptions
       SET plan_id = $1, updated_at = $2
       WHERE id = $3`,
      [newPlanId, new Date(), subscription.id]
    );

    // Send confirmation email
    await this.sendPlanChangeEmail(userId, newPlan);
  }

  async cancelSubscription(userId: string, atPeriodEnd: boolean = true): Promise<void> {
    const subscription = await this.getActiveSubscription(userId);
    
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    if (atPeriodEnd) {
      // Cancel at period end
      await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      await this.db.query(
        `UPDATE subscriptions
         SET cancel_at_period_end = true, updated_at = $1
         WHERE id = $2`,
        [new Date(), subscription.id]
      );
    } else {
      // Cancel immediately
      await this.stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

      await this.db.query(
        `UPDATE subscriptions
         SET status = 'canceled', cancel_at_period_end = false, updated_at = $1
         WHERE id = $2`,
        [new Date(), subscription.id]
      );
    }

    // Send cancellation email
    await this.sendCancellationEmail(userId);
  }

  async resumeSubscription(userId: string): Promise<void> {
    const subscription = await this.getActiveSubscription(userId);
    
    if (!subscription || !subscription.cancelAtPeriodEnd) {
      throw new Error('No subscription scheduled for cancellation');
    }

    // Resume subscription
    await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    await this.db.query(
      `UPDATE subscriptions
       SET cancel_at_period_end = false, updated_at = $1
       WHERE id = $2`,
      [new Date(), subscription.id]
    );

    // Send resume email
    await this.sendResumeEmail(userId);
  }

  async checkSubscriptionAccess(userId: string): Promise<SubscriptionAccess> {
    const subscription = await this.getActiveSubscription(userId);
    
    if (!subscription) {
      return {
        hasAccess: false,
        maxScreens: 0,
        maxQuality: '480p',
        features: [],
      };
    }

    return {
      hasAccess: true,
      maxScreens: subscription.maxScreens,
      maxQuality: subscription.maxQuality,
      features: subscription.features,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    };
  }

  private async getPlan(planId: string): Promise<SubscriptionPlan> {
    const result = await this.db.query(
      `SELECT * FROM subscription_plans WHERE id = $1`,
      [planId]
    );
    return result[0];
  }

  private async sendPlanChangeEmail(userId: string, newPlan: SubscriptionPlan): Promise<void> {
    // Implementation
  }

  private async sendCancellationEmail(userId: string): Promise<void> {
    // Implementation
  }

  private async sendResumeEmail(userId: string): Promise<void> {
    // Implementation
  }
}

interface SubscriptionAccess {
  hasAccess: boolean;
  maxScreens: number;
  maxQuality: VideoQuality;
  features: PlanFeature[];
  status?: string;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
}
```

## Coupon System

### Coupon Management
```typescript
export class CouponService {
  private db: DatabaseConnection;
  private stripe: Stripe;

  constructor(db: DatabaseConnection, stripe: Stripe) {
    this.db = db;
    this.stripe = stripe;
  }

  async createCoupon(coupon: CreateCouponRequest): Promise<Coupon> {
    // Create Stripe coupon
    const stripeCoupon = await this.stripe.coupons.create({
      amount_off: coupon.discountType === 'fixed' ? coupon.discountValue : undefined,
      percent_off: coupon.discountType === 'percentage' ? coupon.discountValue : undefined,
      currency: coupon.discountType === 'fixed' ? 'USD' : undefined,
      duration: coupon.duration,
      duration_in_months: coupon.duration === 'repeating' ? coupon.durationInMonths : undefined,
      max_redemptions: coupon.maxUses,
      redeem_by: coupon.validUntil ? Math.floor(coupon.validUntil.getTime() / 1000) : undefined,
      metadata: {
        applicablePlans: coupon.applicablePlans?.join(',') || '',
      },
    });

    // Create coupon record
    const newCoupon: Coupon = {
      id: generateUUID(),
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxUses: coupon.maxUses,
      usedCount: 0,
      validFrom: coupon.validFrom || new Date(),
      validUntil: coupon.validUntil,
      applicablePlans: coupon.applicablePlans || [],
      isActive: true,
      stripeCouponId: stripeCoupon.id,
      createdAt: new Date(),
    };

    await this.db.query(
      `INSERT INTO coupons (id, code, description, discount_type, discount_value, max_uses, used_count, valid_from, valid_until, applicable_plans, is_active, stripe_coupon_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        newCoupon.id,
        newCoupon.code,
        newCoupon.description,
        newCoupon.discountType,
        newCoupon.discountValue,
        newCoupon.maxUses,
        newCoupon.usedCount,
        newCoupon.validFrom,
        newCoupon.validUntil,
        JSON.stringify(newCoupon.applicablePlans),
        newCoupon.isActive,
        newCoupon.stripeCouponId,
        newCoupon.createdAt,
      ]
    );

    return newCoupon;
  }

  async validateCoupon(code: string, planId?: string): Promise<CouponValidationResult> {
    const coupon = await this.getCouponByCode(code);
    
    if (!coupon) {
      return { valid: false, reason: 'Coupon not found' };
    }

    if (!coupon.isActive) {
      return { valid: false, reason: 'Coupon is inactive' };
    }

    const now = new Date();
    if (now < coupon.validFrom || (coupon.validUntil && now > coupon.validUntil)) {
      return { valid: false, reason: 'Coupon is expired or not yet valid' };
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, reason: 'Coupon usage limit reached' };
    }

    if (coupon.applicablePlans.length > 0 && planId) {
      if (!coupon.applicablePlans.includes(planId)) {
        return { valid: false, reason: 'Coupon not applicable to this plan' };
      }
    }

    return {
      valid: true,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    };
  }

  async applyCoupon(userId: string, couponId: string, subscriptionId: string): Promise<void> {
    // Record coupon usage
    await this.db.query(
      `INSERT INTO coupon_usages (coupon_id, user_id, subscription_id, used_at)
       VALUES ($1, $2, $3, $4)`,
      [couponId, userId, subscriptionId, new Date()]
    );

    // Increment usage count
    await this.db.query(
      `UPDATE coupons SET used_count = used_count + 1 WHERE id = $1`,
      [couponId]
    );
  }

  private async getCouponByCode(code: string): Promise<Coupon | null> {
    const result = await this.db.query(
      `SELECT * FROM coupons WHERE code = $1`,
      [code]
    );
    return result[0] || null;
  }
}

interface CreateCouponRequest {
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses?: number;
  validFrom?: Date;
  validUntil: Date;
  applicablePlans?: string[];
  duration: 'once' | 'repeating' | 'forever';
  durationInMonths?: number;
}

interface Coupon {
  id: string;
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses?: number;
  usedCount: number;
  validFrom: Date;
  validUntil: Date;
  applicablePlans: string[];
  isActive: boolean;
  stripeCouponId: string;
  createdAt: Date;
}

interface CouponValidationResult {
  valid: boolean;
  reason?: string;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
}
```

## Billing Management

### Invoice Generation
```typescript
export class BillingService {
  private db: DatabaseConnection;
  private stripe: Stripe;

  constructor(db: DatabaseConnection, stripe: Stripe) {
    this.db = db;
    this.stripe = stripe;
  }

  async getInvoices(userId: string, limit: number = 20): Promise<Invoice[]> {
    const result = await this.db.query(
      `SELECT i.*, s.status as subscription_status, p.name as plan_name
       FROM invoices i
       LEFT JOIN subscriptions s ON i.subscription_id = s.id
       LEFT JOIN subscription_plans p ON s.plan_id = p.id
       WHERE i.user_id = $1
       ORDER BY i.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.map(row => this.mapRowToInvoice(row));
  }

  async getInvoice(invoiceId: string): Promise<Invoice> {
    const result = await this.db.query(
      `SELECT * FROM invoices WHERE id = $1`,
      [invoiceId]
    );

    if (result.length === 0) {
      throw new Error('Invoice not found');
    }

    return this.mapRowToInvoice(result[0]);
  }

  async generateInvoicePDF(invoiceId: string): Promise<Buffer> {
    const invoice = await this.getInvoice(invoiceId);
    
    // Generate PDF using a library like pdfkit
    const pdf = await this.createInvoicePDF(invoice);
    
    return pdf;
  }

  async processRefund(invoiceId: string, amountCents?: number): Promise<Refund> {
    const invoice = await this.getInvoice(invoiceId);
    
    if (invoice.status !== 'paid') {
      throw new Error('Can only refund paid invoices');
    }

    // Process refund through Stripe
    const refund = await this.stripe.refunds.create({
      payment_intent: invoice.stripePaymentIntentId,
      amount: amountCents,
    });

    // Update invoice status
    await this.db.query(
      `UPDATE invoices
       SET status = 'refunded', refund_amount_cents = $1, refunded_at = $2
       WHERE id = $3`,
      [refund.amount, new Date(), invoiceId]
    );

    // Send refund email
    await this.sendRefundEmail(invoice.userId, refund);

    return {
      id: refund.id,
      amountCents: refund.amount,
      currency: refund.currency,
      status: refund.status,
      createdAt: new Date(refund.created * 1000),
    };
  }

  private async createInvoicePDF(invoice: Invoice): Promise<Buffer> {
    // Implementation using pdfkit or similar
    return Buffer.from('');
  }

  private mapRowToInvoice(row: any): Invoice {
    return {
      id: row.id,
      userId: row.user_id,
      subscriptionId: row.subscription_id,
      stripeInvoiceId: row.stripe_invoice_id,
      amountCents: row.amount_cents,
      currency: row.currency,
      status: row.status,
      dueDate: row.due_date,
      paidAt: row.paid_at,
      refundAmountCents: row.refund_amount_cents,
      refundedAt: row.refunded_at,
      createdAt: row.created_at,
    };
  }

  private async sendRefundEmail(userId: string, refund: Stripe.Refund): Promise<void> {
    // Implementation
  }
}

interface Invoice {
  id: string;
  userId: string;
  subscriptionId?: string;
  stripeInvoiceId: string;
  amountCents: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible' | 'refunded';
  dueDate?: Date;
  paidAt?: Date;
  refundAmountCents?: number;
  refundedAt?: Date;
  createdAt: Date;
}

interface Refund {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: Date;
}
```

## Revenue Analytics

### Revenue Tracking
```typescript
export class RevenueAnalytics {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  async getMRR(date: Date = new Date()): Promise<number> {
    const result = await this.db.query(
      `SELECT COALESCE(SUM(p.price_cents), 0) as total
       FROM subscriptions s
       JOIN subscription_plans p ON s.plan_id = p.id
       WHERE s.status = 'active'
         AND s.current_period_start <= $1
         AND s.current_period_end > $1`,
      [date]
    );

    return result[0].total;
  }

  async getARR(date: Date = new Date()): Promise<number> {
    const mrr = await this.getMRR(date);
    return mrr * 12;
  }

  async getRevenue(
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<RevenueData[]> {
    const interval = groupBy === 'day' ? 'day' : groupBy === 'week' ? 'week' : 'month';
    
    const result = await this.db.query(
      `SELECT
         DATE_TRUNC($1, i.paid_at) as date,
         SUM(i.amount_cents) as revenue,
         COUNT(*) as invoice_count
       FROM invoices i
       WHERE i.status = 'paid'
         AND i.paid_at >= $2
         AND i.paid_at <= $3
       GROUP BY DATE_TRUNC($1, i.paid_at)
       ORDER BY date ASC`,
      [interval, startDate, endDate]
    );

    return result.map(row => ({
      date: row.date,
      revenue: row.revenue,
      invoiceCount: row.invoice_count,
    }));
  }

  async getChurnRate(startDate: Date, endDate: Date): Promise<number> {
    const startSubscriptions = await this.db.query(
      `SELECT COUNT(*) as count
       FROM subscriptions
       WHERE status = 'active'
         AND created_at < $1`,
      [startDate]
    );

    const cancellations = await this.db.query(
      `SELECT COUNT(*) as count
       FROM subscriptions
       WHERE status = 'canceled'
         AND updated_at >= $1
         AND updated_at <= $2`,
      [startDate, endDate]
    );

    const startCount = startSubscriptions[0].count;
    const cancellationCount = cancellations[0].count;

    return startCount > 0 ? (cancellationCount / startCount) * 100 : 0;
  }

  async getLTV(): Promise<number> {
    const result = await this.db.query(
      `SELECT
         AVG(
           CASE
             WHEN s.status = 'active' THEN
               EXTRACT(EPOCH FROM (s.current_period_end - s.created_at)) / 86400 * p.price_cents
             ELSE
               EXTRACT(EPOCH FROM (s.updated_at - s.created_at)) / 86400 * p.price_cents
           END
         ) as avg_ltv
       FROM subscriptions s
       JOIN subscription_plans p ON s.plan_id = p.id
       WHERE s.status IN ('active', 'canceled')`,
      []
    );

    return result[0].avg_ltv || 0;
  }
}

interface RevenueData {
  date: Date;
  revenue: number;
  invoiceCount: number;
}
```

## Payment API Endpoints

### Checkout and Subscription
```typescript
// POST /api/payments/checkout
export const createCheckoutSession = async (
  userId: string,
  planId: string,
  couponCode?: string
): Promise<CheckoutSession> => {
  const paymentService = new PaymentService(config);
  return await paymentService.createCheckoutSession(userId, planId, couponCode);
};

// POST /api/payments/portal
export const createBillingPortalSession = async (userId: string): Promise<BillingPortalSession> => {
  const paymentService = new PaymentService(config);
  return await paymentService.createBillingPortalSession(userId);
};

// GET /api/subscriptions/current
export const getCurrentSubscription = async (userId: string): Promise<Subscription | null> => {
  const manager = new SubscriptionManager(db, stripe);
  return await manager.getActiveSubscription(userId);
};

// POST /api/subscriptions/change-plan
export const changeSubscriptionPlan = async (
  userId: string,
  newPlanId: string
): Promise<void> => {
  const manager = new SubscriptionManager(db, stripe);
  return await manager.changePlan(userId, newPlanId);
};

// POST /api/subscriptions/cancel
export const cancelSubscription = async (
  userId: string,
  atPeriodEnd: boolean = true
): Promise<void> => {
  const manager = new SubscriptionManager(db, stripe);
  return await manager.cancelSubscription(userId, atPeriodEnd);
};

// POST /api/subscriptions/resume
export const resumeSubscription = async (userId: string): Promise<void> => {
  const manager = new SubscriptionManager(db, stripe);
  return await manager.resumeSubscription(userId);
};
```

### Coupon Management
```typescript
// POST /api/coupons
export const createCoupon = async (coupon: CreateCouponRequest): Promise<Coupon> => {
  const service = new CouponService(db, stripe);
  return await service.createCoupon(coupon);
};

// GET /api/coupons/:code/validate
export const validateCoupon = async (
  code: string,
  planId?: string
): Promise<CouponValidationResult> => {
  const service = new CouponService(db, stripe);
  return await service.validateCoupon(code, planId);
};

// GET /api/coupons
export const getCoupons = async (): Promise<Coupon[]> => {
  const result = await db.query(
    `SELECT * FROM coupons WHERE is_active = true ORDER BY created_at DESC`
  );
  return result;
};
```

### Billing Management
```typescript
// GET /api/billing/invoices
export const getInvoices = async (userId: string, limit: number = 20): Promise<Invoice[]> => {
  const service = new BillingService(db, stripe);
  return await service.getInvoices(userId, limit);
};

// GET /api/billing/invoices/:id
export const getInvoice = async (invoiceId: string): Promise<Invoice> => {
  const service = new BillingService(db, stripe);
  return await service.getInvoice(invoiceId);
};

// GET /api/billing/invoices/:id/pdf
export const getInvoicePDF = async (invoiceId: string): Promise<Buffer> => {
  const service = new BillingService(db, stripe);
  return await service.generateInvoicePDF(invoiceId);
};

// POST /api/billing/invoices/:id/refund
export const refundInvoice = async (
  invoiceId: string,
  amountCents?: number
): Promise<Refund> => {
  const service = new BillingService(db, stripe);
  return await service.processRefund(invoiceId, amountCents);
};
```

## Technology Stack Summary

| Category | Technology | Purpose |
|----------|-----------|---------|
| Payment Processing | Stripe | Payment gateway |
| Webhooks | Stripe Webhooks | Event handling |
| Database | PostgreSQL | Subscription data |
| Email | SendGrid/SES | Notifications |
| PDF Generation | PDFKit | Invoice PDFs |
| Analytics | Custom + Stripe | Revenue tracking |
