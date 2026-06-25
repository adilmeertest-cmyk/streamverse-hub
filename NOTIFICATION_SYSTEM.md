# Notification System Architecture for StreamFlix Platform

## Overview
This document describes the comprehensive notification system for a Netflix-style streaming platform, including email notifications, push notifications, new content alerts, and admin announcements.

## Architecture Overview

```
Notification System Architecture
├── Notification Channels
│   ├── Email Notifications (SendGrid/SES)
│   ├── Push Notifications (FCM/APNs/Web Push)
│   ├── In-App Notifications
│   └── SMS Notifications (Optional)
├── Notification Types
│   ├── Transactional Notifications
│   ├── Marketing Notifications
│   ├── System Notifications
│   └── Admin Announcements
├── Notification Templates
│   ├── Email Templates
│   ├── Push Templates
│   └── In-App Templates
├── User Preferences
│   ├── Channel Preferences
│   ├── Category Preferences
│   └── Frequency Controls
├── Delivery Management
│   ├── Queue System
│   ├── Retry Logic
│   ├── Delivery Tracking
│   └── Bounce Handling
└── Analytics
    ├── Delivery Rates
    ├── Open Rates
    ├── Click Rates
    └── Engagement Metrics
```

## Email Notifications

### Email Service Implementation
```typescript
export class EmailService {
  private client: SendGridClient | SESClient;
  private fromEmail: string;
  private fromName: string;

  constructor(config: EmailConfig) {
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName;

    if (config.provider === 'sendgrid') {
      this.client = new SendGridClient(config.apiKey);
    } else if (config.provider === 'ses') {
      this.client = new SESClient({
        region: config.region,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      });
    }
  }

  async sendEmail(params: EmailParams): Promise<EmailResult> {
    const template = await this.getTemplate(params.templateId);
    const html = this.renderTemplate(template, params.data);

    if (this.client instanceof SendGridClient) {
      return await this.sendViaSendGrid({
        to: params.to,
        subject: params.subject,
        html,
        from: this.fromEmail,
        fromName: this.fromName,
      });
    } else {
      return await this.sendViaSES({
        to: params.to,
        subject: params.subject,
        html,
        from: this.fromEmail,
        fromName: this.fromName,
      });
    }
  }

  async sendBulkEmail(params: BulkEmailParams): Promise<BulkEmailResult> {
    const results = {
      total: params.recipients.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ email: string; error: string }>,
    };

    for (const recipient of params.recipients) {
      try {
        await this.sendEmail({
          to: recipient.email,
          templateId: params.templateId,
          subject: params.subject,
          data: { ...params.data, recipientName: recipient.name },
        });
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({ email: recipient.email, error: error.message });
      }
    }

    return results;
  }

  private async sendViaSendGrid(params: SendGridParams): Promise<EmailResult> {
    const msg = {
      to: params.to,
      from: `${params.fromName} <${params.from}>`,
      subject: params.subject,
      html: params.html,
    };

    await this.client.send(msg);
    return { success: true, messageId: 'sg_' + Date.now() };
  }

  private async sendViaSES(params: SESParams): Promise<EmailResult> {
    const command = new SendEmailCommand({
      Source: `${params.fromName} <${params.from}>`,
      Destination: {
        ToAddresses: [params.to],
      },
      Message: {
        Subject: { Data: params.subject },
        Body: {
          Html: { Data: params.html },
        },
      },
    });

    const response = await this.client.send(command);
    return { success: true, messageId: response.MessageId };
  }

  private async getTemplate(templateId: string): Promise<EmailTemplate> {
    // Fetch from database or file system
    return {
      id: templateId,
      subject: 'Default Subject',
      html: '<html><body>{{content}}</body></html>',
    };
  }

  private renderTemplate(template: EmailTemplate, data: any): string {
    // Use Handlebars or similar for template rendering
    return template.html.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || '');
  }
}

interface EmailParams {
  to: string;
  templateId: string;
  subject: string;
  data: Record<string, any>;
}

interface BulkEmailParams {
  recipients: Array<{ email: string; name: string }>;
  templateId: string;
  subject: string;
  data: Record<string, any>;
}

interface EmailResult {
  success: boolean;
  messageId: string;
}

interface BulkEmailResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
}
```

### Email Templates
```typescript
export const EMAIL_TEMPLATES = {
  welcome: {
    subject: 'Welcome to StreamFlix!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #e50914;">Welcome to StreamFlix!</h1>
        <p>Hi {{name}},</p>
        <p>Thank you for signing up for StreamFlix. We're excited to have you on board!</p>
        <p>Start watching your favorite movies and TV shows now.</p>
        <a href="{{appUrl}}" style="background: #e50914; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Start Watching</a>
        <p style="margin-top: 30px; color: #666; font-size: 12px;">
          If you didn't create an account, please ignore this email.
        </p>
      </div>
    `,
  },

  subscriptionConfirmation: {
    subject: 'Your StreamFlix subscription is active!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #e50914;">Subscription Confirmed!</h1>
        <p>Hi {{name}},</p>
        <p>Your {{planName}} subscription is now active.</p>
        <p>Plan details:</p>
        <ul>
          <li>Plan: {{planName}}</li>
          <li>Price: {{price}}</li>
          <li>Max screens: {{maxScreens}}</li>
          <li>Quality: {{maxQuality}}</li>
        </ul>
        <a href="{{appUrl}}/account" style="background: #e50914; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Manage Subscription</a>
      </div>
    `,
  },

  paymentFailed: {
    subject: 'Payment Failed - Action Required',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #e50914;">Payment Failed</h1>
        <p>Hi {{name}},</p>
        <p>We were unable to process your payment for your StreamFlix subscription.</p>
        <p>Please update your payment method to avoid service interruption.</p>
        <a href="{{appUrl}}/account" style="background: #e50914; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Update Payment Method</a>
      </div>
    `,
  },

  newContentAlert: {
    subject: 'New content you might like!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #e50914;">New Content Alert</h1>
        <p>Hi {{name}},</p>
        <p>Check out these new releases on StreamFlix:</p>
        {{#each titles}}
        <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px;">
          <h3 style="margin: 0 0 10px 0;">{{title}}</h3>
          <p style="margin: 0; color: #666;">{{description}}</p>
          <a href="{{appUrl}}/watch/{{slug}}" style="display: inline-block; margin-top: 10px; background: #e50914; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px;">Watch Now</a>
        </div>
        {{/each}}
      </div>
    `,
  },

  passwordReset: {
    subject: 'Reset your StreamFlix password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #e50914;">Reset Password</h1>
        <p>Hi {{name}},</p>
        <p>We received a request to reset your password. Click the button below to reset it:</p>
        <a href="{{resetUrl}}" style="background: #e50914; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Reset Password</a>
        <p style="margin-top: 20px; color: #666; font-size: 12px;">
          This link will expire in 1 hour. If you didn't request this, please ignore this email.
        </p>
      </div>
    `,
  },
};
```

## Push Notifications

### Firebase Cloud Messaging (FCM)
```typescript
export class PushNotificationService {
  private fcm: FirebaseMessaging;
  private db: DatabaseConnection;

  constructor(config: PushConfig, db: DatabaseConnection) {
    const admin = require('firebase-admin');
    admin.initializeApp({
      credential: admin.credential.cert(config.serviceAccountKey),
    });
    this.fcm = admin.messaging();
    this.db = db;
  }

  async sendPushNotification(params: PushNotificationParams): Promise<PushResult> {
    const tokens = await this.getUserTokens(params.userId);

    if (tokens.length === 0) {
      return { success: false, reason: 'No registered devices' };
    }

    const message = {
      notification: {
        title: params.title,
        body: params.body,
        icon: params.icon,
        image: params.image,
      },
      data: params.data || {},
      tokens,
    };

    const response = await this.fcm.sendMulticast(message);

    // Handle failed tokens
    if (response.failureCount > 0) {
      await this.handleFailedTokens(response.responses, tokens);
    }

    return {
      success: response.successCount > 0,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  }

  async registerDevice(params: RegisterDeviceParams): Promise<void> {
    await this.db.query(
      `INSERT INTO push_tokens (id, user_id, token, platform, device_id, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, token) DO UPDATE
       SET device_id = $5, is_active = $6`,
      [
        generateUUID(),
        params.userId,
        params.token,
        params.platform,
        params.deviceId,
        true,
        new Date(),
      ]
    );
  }

  async unregisterDevice(userId: string, token: string): Promise<void> {
    await this.db.query(
      `UPDATE push_tokens SET is_active = false WHERE user_id = $1 AND token = $2`,
      [userId, token]
    );
  }

  private async getUserTokens(userId: string): Promise<string[]> {
    const result = await this.db.query(
      `SELECT token FROM push_tokens WHERE user_id = $1 AND is_active = true`,
      [userId]
    );
    return result.map(row => row.token);
  }

  private async handleFailedTokens(responses: any[], tokens: string[]): Promise<void> {
    for (let i = 0; i < responses.length; i++) {
      if (!responses[i].success) {
        const error = responses[i].error;
        
        // Remove invalid tokens
        if (error.code === 'messaging/registration-token-not-registered' ||
            error.code === 'messaging/invalid-registration-token') {
          await this.unregisterDeviceByToken(tokens[i]);
        }
      }
    }
  }

  private async unregisterDeviceByToken(token: string): Promise<void> {
    await this.db.query(
      `UPDATE push_tokens SET is_active = false WHERE token = $1`,
      [token]
    );
  }
}

interface PushNotificationParams {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  image?: string;
  data?: Record<string, string>;
}

interface RegisterDeviceParams {
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceId: string;
}

interface PushResult {
  success: boolean;
  successCount?: number;
  failureCount?: number;
  reason?: string;
}
```

### Web Push Notifications
```typescript
export class WebPushService {
  private vapidKeys: VapidKeys;
  private db: DatabaseConnection;

  constructor(vapidKeys: VapidKeys, db: DatabaseConnection) {
    this.vapidKeys = vapidKeys;
    this.db = db;
  }

  async sendWebPush(params: WebPushParams): Promise<WebPushResult> {
    const subscriptions = await this.getUserSubscriptions(params.userId);

    if (subscriptions.length === 0) {
      return { success: false, reason: 'No web push subscriptions' };
    }

    const payload = JSON.stringify({
      title: params.title,
      body: params.body,
      icon: params.icon,
      image: params.image,
      data: params.data,
    });

    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys,
            },
            payload,
            {
              vapidPrivateKey: this.vapidKeys.privateKey,
              vapidSubject: this.vapidKeys.subject,
            }
          );
          return { success: true };
        } catch (error) {
          // Remove invalid subscription
          await this.removeSubscription(sub.id);
          return { success: false, error: error.message };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;

    return {
      success: successCount > 0,
      successCount,
      failureCount: results.length - successCount,
    };
  }

  async subscribeToWebPush(params: WebPushSubscriptionParams): Promise<void> {
    await this.db.query(
      `INSERT INTO web_push_subscriptions (id, user_id, endpoint, keys, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, endpoint) DO UPDATE
       SET keys = $4`,
      [
        generateUUID(),
        params.userId,
        params.subscription.endpoint,
        JSON.stringify(params.subscription.keys),
        new Date(),
      ]
    );
  }

  async unsubscribeFromWebPush(userId: string, endpoint: string): Promise<void> {
    await this.db.query(
      `DELETE FROM web_push_subscriptions WHERE user_id = $1 AND endpoint = $2`,
      [userId, endpoint]
    );
  }

  private async getUserSubscriptions(userId: string): Promise<WebPushSubscription[]> {
    const result = await this.db.query(
      `SELECT * FROM web_push_subscriptions WHERE user_id = $1`,
      [userId]
    );
    return result.map(row => ({
      id: row.id,
      endpoint: row.endpoint,
      keys: JSON.parse(row.keys),
    }));
  }

  private async removeSubscription(subscriptionId: string): Promise<void> {
    await this.db.query(
      `DELETE FROM web_push_subscriptions WHERE id = $1`,
      [subscriptionId]
    );
  }
}

interface WebPushParams {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  image?: string;
  data?: Record<string, string>;
}

interface WebPushSubscriptionParams {
  userId: string;
  subscription: PushSubscription;
}

interface WebPushSubscription {
  id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

interface WebPushResult {
  success: boolean;
  successCount?: number;
  failureCount?: number;
  reason?: string;
}
```

## In-App Notifications

### In-App Notification Service
```typescript
export class InAppNotificationService {
  private db: DatabaseConnection;
  private realtime: RealtimeService;

  constructor(db: DatabaseConnection, realtime: RealtimeService) {
    this.db = db;
    this.realtime = realtime;
  }

  async createNotification(params: InAppNotificationParams): Promise<Notification> {
    const notification = {
      id: generateUUID(),
      userId: params.userId,
      kind: params.kind,
      title: params.title,
      body: params.body,
      linkHref: params.linkHref,
      priority: params.priority || 'normal',
      deliveryMethod: params.deliveryMethods || ['in_app'],
      deliveryStatus: {},
      isRead: false,
      createdAt: new Date(),
    };

    await this.db.query(
      `INSERT INTO notifications (id, user_id, kind, title, body, link_href, priority, delivery_method, delivery_status, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        notification.id,
        notification.userId,
        notification.kind,
        notification.title,
        notification.body,
        notification.linkHref,
        notification.priority,
        JSON.stringify(notification.deliveryMethod),
        JSON.stringify(notification.deliveryStatus),
        notification.isRead,
        notification.createdAt,
      ]
    );

    // Send real-time update
    await this.realtime.publish(`notifications:${params.userId}`, notification);

    return notification;
  }

  async getUserNotifications(
    userId: string,
    limit: number = 20
  ): Promise<Notification[]> {
    const result = await this.db.query(
      `SELECT * FROM notifications
       WHERE user_id = $1 OR user_id IS NULL
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.map(row => this.mapRowToNotification(row));
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.db.query(
      `UPDATE notifications
       SET is_read = true, read_at = $1
       WHERE id = $2 AND user_id = $3`,
      [new Date(), notificationId, userId]
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.db.query(
      `UPDATE notifications
       SET is_read = true, read_at = $1
       WHERE user_id = $2 AND is_read = false`,
      [new Date(), userId]
    );
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    await this.db.query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
  }

  private mapRowToNotification(row: any): Notification {
    return {
      id: row.id,
      userId: row.user_id,
      kind: row.kind,
      title: row.title,
      body: row.body,
      linkHref: row.link_href,
      priority: row.priority,
      deliveryMethod: JSON.parse(row.delivery_method),
      deliveryStatus: JSON.parse(row.delivery_status),
      isRead: row.is_read,
      readAt: row.read_at,
      createdAt: row.created_at,
    };
  }
}

interface InAppNotificationParams {
  userId: string;
  kind: string;
  title: string;
  body: string;
  linkHref?: string;
  priority?: 'low' | 'normal' | 'high';
  deliveryMethods?: string[];
}

interface Notification {
  id: string;
  userId?: string;
  kind: string;
  title: string;
  body: string;
  linkHref?: string;
  priority: string;
  deliveryMethod: string[];
  deliveryStatus: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}
```

## Notification Preferences

### User Preferences Management
```typescript
export class NotificationPreferencesService {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const result = await this.db.query(
      `SELECT * FROM notification_preferences WHERE user_id = $1`,
      [userId]
    );

    if (result.length === 0) {
      return this.getDefaultPreferences();
    }

    return this.mapRowToPreferences(result[0]);
  }

  async updatePreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const existing = await this.getPreferences(userId);
    const updated = { ...existing, ...updates, updatedAt: new Date() };

    await this.db.query(
      `INSERT INTO notification_preferences (user_id, email_enabled, push_enabled, in_app_enabled, new_content, recommendations, account_updates, marketing_emails, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id) DO UPDATE
       SET email_enabled = $2, push_enabled = $3, in_app_enabled = $4, new_content = $5, recommendations = $6, account_updates = $7, marketing_emails = $8, updated_at = $9`,
      [
        userId,
        updated.emailEnabled,
        updated.pushEnabled,
        updated.inAppEnabled,
        updated.newContent,
        updated.recommendations,
        updated.accountUpdates,
        updated.marketingEmails,
        updated.updatedAt,
      ]
    );

    return updated;
  }

  private getDefaultPreferences(): NotificationPreferences {
    return {
      emailEnabled: true,
      pushEnabled: true,
      inAppEnabled: true,
      newContent: true,
      recommendations: true,
      accountUpdates: true,
      marketingEmails: false,
    };
  }

  private mapRowToPreferences(row: any): NotificationPreferences {
    return {
      emailEnabled: row.email_enabled,
      pushEnabled: row.push_enabled,
      inAppEnabled: row.in_app_enabled,
      newContent: row.new_content,
      recommendations: row.recommendations,
      accountUpdates: row.account_updates,
      marketingEmails: row.marketing_emails,
    };
  }
}

interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  newContent: boolean;
  recommendations: boolean;
  accountUpdates: boolean;
  marketingEmails: boolean;
}
```

## Notification Queue System

### Background Job Processing
```typescript
export class NotificationQueue {
  private queue: Queue;
  private emailService: EmailService;
  private pushService: PushNotificationService;
  private webPushService: WebPushService;
  private inAppService: InAppNotificationService;

  constructor(config: QueueConfig, services: NotificationServices) {
    this.queue = new Queue(config);
    this.emailService = services.emailService;
    this.pushService = services.pushService;
    this.webPushService = services.webPushService;
    this.inAppService = services.inAppService;

    this.setupWorkers();
  }

  private setupWorkers(): void {
    this.queue.process('email', async (job) => {
      const params = job.data as EmailParams;
      return await this.emailService.sendEmail(params);
    });

    this.queue.process('push', async (job) => {
      const params = job.data as PushNotificationParams;
      return await this.pushService.sendPushNotification(params);
    });

    this.queue.process('web-push', async (job) => {
      const params = job.data as WebPushParams;
      return await this.webPushService.sendWebPush(params);
    });

    this.queue.process('in-app', async (job) => {
      const params = job.data as InAppNotificationParams;
      return await this.inAppService.createNotification(params);
    });
  }

  async sendNotification(params: UnifiedNotificationParams): Promise<void> {
    const preferences = await this.getPreferences(params.userId);

    // Add to queue based on preferences
    if (preferences.emailEnabled && params.channels.includes('email')) {
      await this.queue.add('email', {
        to: params.userEmail,
        templateId: params.templateId,
        subject: params.title,
        data: params.data,
      }, { priority: params.priority === 'high' ? 1 : 5 });
    }

    if (preferences.pushEnabled && params.channels.includes('push')) {
      await this.queue.add('push', {
        userId: params.userId,
        title: params.title,
        body: params.body,
        icon: params.icon,
        image: params.image,
        data: params.data,
      }, { priority: params.priority === 'high' ? 1 : 5 });
    }

    if (preferences.pushEnabled && params.channels.includes('web-push')) {
      await this.queue.add('web-push', {
        userId: params.userId,
        title: params.title,
        body: params.body,
        icon: params.icon,
        image: params.image,
        data: params.data,
      }, { priority: params.priority === 'high' ? 1 : 5 });
    }

    if (preferences.inAppEnabled && params.channels.includes('in-app')) {
      await this.queue.add('in-app', {
        userId: params.userId,
        kind: params.kind,
        title: params.title,
        body: params.body,
        linkHref: params.linkHref,
        priority: params.priority,
      }, { priority: params.priority === 'high' ? 1 : 5 });
    }
  }

  private async getPreferences(userId: string): Promise<NotificationPreferences> {
    const service = new NotificationPreferencesService(this.db);
    return await service.getPreferences(userId);
  }
}

interface UnifiedNotificationParams {
  userId: string;
  userEmail: string;
  channels: ('email' | 'push' | 'web-push' | 'in-app')[];
  kind: string;
  title: string;
  body: string;
  templateId?: string;
  icon?: string;
  image?: string;
  linkHref?: string;
  priority?: 'low' | 'normal' | 'high';
  data?: Record<string, any>;
}
```

## Notification Analytics

### Delivery Tracking
```typescript
export class NotificationAnalytics {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  async trackDelivery(notificationId: string, channel: string, status: 'sent' | 'delivered' | 'failed', metadata?: any): Promise<void> {
    await this.db.query(
      `INSERT INTO notification_delivery (notification_id, channel, status, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [notificationId, channel, status, JSON.stringify(metadata), new Date()]
    );
  }

  async trackOpen(notificationId: string, channel: string): Promise<void> {
    await this.db.query(
      `INSERT INTO notification_opens (notification_id, channel, opened_at)
       VALUES ($1, $2, $3)`,
      [notificationId, channel, new Date()]
    );
  }

  async trackClick(notificationId: string, channel: string, link: string): Promise<void> {
    await this.db.query(
      `INSERT INTO notification_clicks (notification_id, channel, link, clicked_at)
       VALUES ($1, $2, $3, $4)`,
      [notificationId, channel, link, new Date()]
    );
  }

  async getAnalytics(startDate: Date, endDate: Date): Promise<NotificationAnalyticsData> {
    const [deliveryStats, openStats, clickStats] = await Promise.all([
      this.getDeliveryStats(startDate, endDate),
      this.getOpenStats(startDate, endDate),
      this.getClickStats(startDate, endDate),
    ]);

    return {
      delivery: deliveryStats,
      opens: openStats,
      clicks: clickStats,
    };
  }

  private async getDeliveryStats(startDate: Date, endDate: Date): Promise<DeliveryStats> {
    const result = await this.db.query(
      `SELECT
         channel,
         status,
         COUNT(*) as count
       FROM notification_delivery
       WHERE created_at >= $1 AND created_at <= $2
       GROUP BY channel, status`,
      [startDate, endDate]
    );

    const stats: Record<string, Record<string, number>> = {};
    for (const row of result) {
      if (!stats[row.channel]) stats[row.channel] = {};
      stats[row.channel][row.status] = row.count;
    }

    return stats;
  }

  private async getOpenStats(startDate: Date, endDate: Date): Promise<OpenStats> {
    const result = await this.db.query(
      `SELECT
         channel,
         COUNT(*) as opens
       FROM notification_opens
       WHERE opened_at >= $1 AND opened_at <= $2
       GROUP BY channel`,
      [startDate, endDate]
    );

    const stats: Record<string, number> = {};
    for (const row of result) {
      stats[row.channel] = row.opens;
    }

    return stats;
  }

  private async getClickStats(startDate: Date, endDate: Date): Promise<ClickStats> {
    const result = await this.db.query(
      `SELECT
         channel,
         link,
         COUNT(*) as clicks
       FROM notification_clicks
       WHERE clicked_at >= $1 AND clicked_at <= $2
       GROUP BY channel, link`,
      [startDate, endDate]
    );

    const stats: Record<string, Record<string, number>> = {};
    for (const row of result) {
      if (!stats[row.channel]) stats[row.channel] = {};
      stats[row.channel][row.link] = row.clicks;
    }

    return stats;
  }
}

interface NotificationAnalyticsData {
  delivery: Record<string, Record<string, number>>;
  opens: Record<string, number>;
  clicks: Record<string, Record<string, number>>;
}

interface DeliveryStats {
  [channel: string]: {
    [status: string]: number;
  };
}

interface OpenStats {
  [channel: string]: number;
}

interface ClickStats {
  [channel: string]: {
    [link: string]: number;
  };
}
```

## Technology Stack Summary

| Category | Technology | Purpose |
|----------|-----------|---------|
| Email | SendGrid/SES | Email delivery |
| Push (Mobile) | Firebase Cloud Messaging | Mobile push notifications |
| Push (Web) | Web Push Protocol | Web push notifications |
| Queue | RabbitMQ/Bull | Background job processing |
| Templates | Handlebars | Template rendering |
| Real-time | WebSocket/Server-Sent Events | Live updates |
| Analytics | Custom + Database | Delivery tracking |
