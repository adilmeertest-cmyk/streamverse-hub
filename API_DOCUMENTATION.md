# Complete API Documentation for StreamFlix Platform

## Overview
This document provides comprehensive API documentation for the StreamFlix streaming platform, including all endpoints, request/response formats, authentication requirements, and error handling.

## Base URLs
- **Production**: `https://api.streamflix.com/v1`
- **Staging**: `https://api-staging.streamflix.com/v1`
- **Development**: `http://localhost:8080/v1`

## Authentication

### JWT Authentication
All API endpoints (except public endpoints) require JWT authentication. Include the access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Token Lifecycle
- **Access Token**: 15 minutes validity
- **Refresh Token**: 30 days validity
- Use `/auth/refresh` to obtain a new access token

### Public Endpoints
The following endpoints do not require authentication:
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /content/titles` (limited access)
- `GET /content/titles/:slug` (limited access)

## Response Format

### Success Response
```typescript
interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}
```

### Error Response
```typescript
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  requestId: string;
}
```

### Common Error Codes
- `AUTH_INVALID_TOKEN`: Invalid or expired access token
- `AUTH_MISSING_TOKEN`: Authorization header missing
- `AUTH_INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `VALIDATION_ERROR`: Request validation failed
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Resource already exists
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Internal server error

## API Endpoints

### Authentication

#### Register User
```http
POST /auth/register
```

**Request Body:**
```typescript
{
  email: string;
  password: string;
  displayName: string;
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    user: {
      id: string;
      email: string;
      displayName: string;
      createdAt: string;
    };
    accessToken: string;
    refreshToken: string;
  };
}
```

#### Login
```http
POST /auth/login
```

**Request Body:**
```typescript
{
  email: string;
  password: string;
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    user: {
      id: string;
      email: string;
      displayName: string;
      subscriptionStatus: string;
    };
    accessToken: string;
    refreshToken: string;
  };
}
```

#### Refresh Token
```http
POST /auth/refresh
```

**Request Body:**
```typescript
{
  refreshToken: string;
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    accessToken: string;
    refreshToken: string;
  };
}
```

#### Logout
```http
POST /auth/logout
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```typescript
{
  success: true;
  data: {
    message: string;
  };
}
```

#### Forgot Password
```http
POST /auth/forgot-password
```

**Request Body:**
```typescript
{
  email: string;
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    message: string;
  };
}
```

#### Reset Password
```http
POST /auth/reset-password
```

**Request Body:**
```typescript
{
  token: string;
  newPassword: string;
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    message: string;
  };
}
```

### Content

#### List Titles
```http
GET /content/titles
```

**Query Parameters:**
- `kind`: `movie` | `series` | `drama` | `cartoon` | `documentary` (optional)
- `category`: string (optional)
- `genre`: string (optional)
- `year`: number (optional)
- `page`: number (default: 1)
- `limit`: number (default: 20, max: 100)
- `sort`: `popularity` | `release_date` | `title` (default: popularity)

**Response:**
```typescript
{
  success: true;
  data: {
    titles: Title[];
  };
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
```

#### Get Title by Slug
```http
GET /content/titles/:slug
```

**Response:**
```typescript
{
  success: true;
  data: {
    title: Title;
    seasons?: Season[];
    episodes?: Episode[];
  };
}
```

#### Search Content
```http
GET /content/search
```

**Query Parameters:**
- `q`: string (required) - search query
- `kind`: string (optional)
- `page`: number (default: 1)
- `limit`: number (default: 20)

**Response:**
```typescript
{
  success: true;
  data: {
    results: Title[];
  };
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
```

#### Get Trending Content
```http
GET /content/trending
```

**Query Parameters:**
- `timeWindow`: `daily` | `weekly` (default: weekly)
- `limit`: number (default: 20)

**Response:**
```typescript
{
  success: true;
  data: {
    titles: Title[];
  };
}
```

#### Get Categories
```http
GET /content/categories
```

**Response:**
```typescript
{
  success: true;
  data: {
    categories: Category[];
  };
}
```

#### Get Genres
```http
GET /content/genres
```

**Response:**
```typescript
{
  success: true;
  data: {
    genres: Genre[];
  };
}
```

### User

#### Get Current User
```http
GET /users/me
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```typescript
{
  success: true;
  data: {
    user: User;
  };
}
```

#### Update User Profile
```http
PUT /users/me
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```typescript
{
  displayName?: string;
  avatarUrl?: string;
  language?: string;
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    user: User;
  };
}
```

#### Get User Profiles
```http
GET /users/me/profiles
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```typescript
{
  success: true;
  data: {
    profiles: Profile[];
  };
}
```

#### Create Profile
```http
POST /users/me/profiles
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```typescript
{
  name: string;
  avatarUrl?: string;
  isKids?: boolean;
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    profile: Profile;
  };
}
```

#### Update Profile
```http
PUT /users/me/profiles/:id
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```typescript
{
  name?: string;
  avatarUrl?: string;
  isKids?: boolean;
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    profile: Profile;
  };
}
```

#### Delete Profile
```http
DELETE /users/me/profiles/:id
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```typescript
{
  success: true;
  data: {
    message: string;
  };
}
```

#### Get Watchlist
```http
GET /users/me/watchlist
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```typescript
{
  success: true;
  data: {
    titles: Title[];
  };
}
```

#### Add to Watchlist
```http
POST /users/me/watchlist
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```typescript
{
  titleId: string;
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    message: string;
  };
}
```

#### Remove from Watchlist
```http
DELETE /users/me/watchlist/:titleId
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```typescript
{
  success: true;
  data: {
    message: string;
  };
}
```

#### Get Watch History
```http
GET /users/me/history
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 20)

**Response:**
```typescript
{
  success: true;
  data: {
    history: WatchHistoryItem[];
  };
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
```

#### Clear Watch History
```http
DELETE /users/me/history
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```typescript
{
  success: true;
  data: {
    message: string;
  };
}
```

### Subscription

#### Get Current Subscription
```http
GET /subscriptions/current
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```typescript
{
  success: true;
  data: {
    subscription: Subscription | null;
  };
}
```

#### Get Subscription Plans
```http
GET /subscriptions/plans
```

**Response:**
```typescript
{
  success: true;
  data: {
    plans: SubscriptionPlan[];
  };
}
```

#### Create Checkout Session
```http
POST /subscriptions/checkout
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```typescript
{
  planId: string;
  couponCode?: string;
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    sessionId: string;
    url: string;
  };
}
```

#### Create Billing Portal Session
```http
POST /subscriptions/portal
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```typescript
{
  success: true;
  data: {
    url: string;
  };
}
```

#### Change Subscription Plan
```http
POST /subscriptions/change-plan
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```typescript
{
  newPlanId: string;
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    subscription: Subscription;
  };
}
```

#### Cancel Subscription
```http
POST /subscriptions/cancel
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```typescript
{
  atPeriodEnd: boolean; // default: true
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    subscription: Subscription;
  };
}
```

#### Resume Subscription
```http
POST /subscriptions/resume
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```typescript
{
  success: true;
  data: {
    subscription: Subscription;
  };
}
```

### Billing

#### Get Invoices
```http
GET /billing/invoices
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `limit`: number (default: 20)

**Response:**
```typescript
{
  success: true;
  data: {
    invoices: Invoice[];
  };
}
```

#### Get Invoice
```http
GET /billing/invoices/:id
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```typescript
{
  success: true;
  data: {
    invoice: Invoice;
  };
}
```

#### Get Invoice PDF
```http
GET /billing/invoices/:id/pdf
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
- Content-Type: `application/pdf`
- Body: PDF file

### Video

#### Get Video Manifest
```http
GET /video/:titleId/manifest
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
- Content-Type: `application/vnd.apple.mpegurl`
- Body: HLS manifest file

#### Get Video Subtitles
```http
GET /video/:titleId/subtitles/:language
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
- Content-Type: `text/vtt`
- Body: VTT subtitle file

#### Update Watch Progress
```http
POST /video/:titleId/progress
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```typescript
{
  position: number; // seconds
  duration: number; // seconds
  completed: boolean;
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    message: string;
  };
}
```

### Notifications

#### Get Notifications
```http
GET /notifications
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `limit`: number (default: 20)

**Response:**
```typescript
{
  success: true;
  data: {
    notifications: Notification[];
  };
}
```

#### Mark Notification as Read
```http
PUT /notifications/:id/read
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```typescript
{
  success: true;
  data: {
    notification: Notification;
  };
}
```

#### Mark All Notifications as Read
```http
PUT /notifications/read-all
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```typescript
{
  success: true;
  data: {
    message: string;
  };
}
```

#### Update Notification Preferences
```http
PUT /notifications/preferences
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```typescript
{
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  newContent?: boolean;
  recommendations?: boolean;
  accountUpdates?: boolean;
  marketingEmails?: boolean;
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    preferences: NotificationPreferences;
  };
}
```

### Admin API

#### Admin Authentication

##### Admin Login
```http
POST /admin/auth/login
```

**Request Body:**
```typescript
{
  email: string;
  password: string;
  twoFactorCode: string;
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    admin: Admin;
    accessToken: string;
    refreshToken: string;
  };
}
```

##### Setup 2FA
```http
POST /admin/auth/2fa/setup
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```typescript
{
  success: true;
  data: {
    secret: string;
    qrCode: string;
    backupCodes: string[];
  };
}
```

##### Verify 2FA
```http
POST /admin/auth/2fa/verify
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```typescript
{
  code: string;
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    verified: boolean;
  };
}
```

#### Content Management

##### List Titles (Admin)
```http
GET /admin/content/titles
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `search`: string (optional)
- `kind`: string (optional)
- `status`: string (optional)
- `page`: number (default: 1)
- `limit`: number (default: 20)

**Response:**
```typescript
{
  success: true;
  data: {
    titles: Title[];
  };
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
```

##### Create Title (Admin)
```http
POST /admin/content/titles
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```typescript
{
  title: string;
  slug: string;
  kind: string;
  synopsis: string;
  releaseYear: number;
  runtime?: number;
  posterUrl?: string;
  backdropUrl?: string;
  videoUrl?: string;
  genres: string[];
  isPremium?: boolean;
  isExclusive?: boolean;
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    title: Title;
  };
}
```

##### Update Title (Admin)
```http
PUT /admin/content/titles/:id
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```typescript
{
  title?: string;
  synopsis?: string;
  posterUrl?: string;
  // ... other fields
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    title: Title;
  };
}
```

##### Delete Title (Admin)
```http
DELETE /admin/content/titles/:id
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `cascade`: boolean (default: false)

**Response:**
```typescript
{
  success: true;
  data: {
    message: string;
  };
}
```

##### Bulk Delete Titles (Admin)
```http
POST /admin/content/titles/bulk-delete
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```typescript
{
  ids: string[];
  cascade?: boolean;
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    total: number;
    successful: number;
    failed: number;
    errors: Array<{ id: string; error: string }>;
  };
}
```

##### Bulk Publish Titles (Admin)
```http
POST /admin/content/titles/bulk-publish
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```typescript
{
  ids: string[];
  scheduleDate?: string; // ISO 8601 date
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    total: number;
    successful: number;
    failed: number;
    scheduled: number;
    errors: Array<{ id: string; error: string }>;
  };
}
```

#### User Management

##### List Users (Admin)
```http
GET /admin/users
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `search`: string (optional)
- `status`: string (optional)
- `page`: number (default: 1)
- `limit`: number (default: 20)

**Response:**
```typescript
{
  success: true;
  data: {
    users: User[];
  };
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
```

##### Get User Details (Admin)
```http
GET /admin/users/:id
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```typescript
{
  success: true;
  data: {
    user: User;
    subscription?: Subscription;
    watchHistory?: WatchHistoryItem[];
  };
}
```

##### Grant Role (Admin)
```http
POST /admin/users/:id/roles
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```typescript
{
  role: string;
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    user: User;
  };
}
```

##### Revoke Role (Admin)
```http
DELETE /admin/users/:id/roles/:role
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```typescript
{
  success: true;
  data: {
    user: User;
  };
}
```

#### Analytics (Admin)

##### Get Dashboard Stats (Admin)
```http
GET /admin/analytics/dashboard
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```typescript
{
  success: true;
  data: {
    totalUsers: number;
    activeSubscriptions: number;
    totalTitles: number;
    todayViews: number;
    monthlyRevenue: number;
    userGrowth: number;
    subscriptionGrowth: number;
    revenueGrowth: number;
    viewsGrowth: number;
  };
}
```

##### Get Content Analytics (Admin)
```http
GET /admin/analytics/content/:titleId
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `startDate`: string (ISO 8601 date)
- `endDate`: string (ISO 8601 date)

**Response:**
```typescript
{
  success: true;
  data: {
    views: number;
    uniqueViewers: number;
    watchTime: number;
    completionRate: number;
    engagement: {
      likes: number;
      shares: number;
      comments: number;
      addToWatchlist: number;
    };
    trends: {
      daily: Array<{ date: string; views: number }>;
      weekly: Array<{ week: string; views: number }>;
      monthly: Array<{ month: string; views: number }>;
    };
  };
}
```

##### Get Revenue Analytics (Admin)
```http
GET /admin/analytics/revenue
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `startDate`: string (ISO 8601 date)
- `endDate`: string (ISO 8601 date)

**Response:**
```typescript
{
  success: true;
  data: {
    mrr: number;
    arr: number;
    revenue: number;
    churnRate: number;
    ltv: number;
    revenueByPlan: Array<{
      tier: string;
      interval: string;
      revenue: number;
      invoiceCount: number;
    }>;
    revenueByMonth: Array<{
      month: string;
      revenue: number;
      invoiceCount: number;
    }>;
  };
}
```

#### Audit Logs (Admin)

##### Get Audit Logs (Admin)
```http
GET /admin/audit-logs
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `actorId`: string (optional)
- `action`: string (optional)
- `entityType`: string (optional)
- `startDate`: string (ISO 8601 date, optional)
- `endDate`: string (ISO 8601 date, optional)
- `page`: number (default: 1)
- `limit`: number (default: 20)

**Response:**
```typescript
{
  success: true;
  data: {
    logs: AuditLog[];
  };
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
```

#### Content Ingestion (Admin)

##### Import from TMDb (Admin)
```http
POST /admin/ingestion/tmdb
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```typescript
{
  tmdbId: number;
  type: 'movie' | 'tv';
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    title: Title;
  };
}
```

##### Run Sync (Admin)
```http
POST /admin/ingestion/sync/:sourceId
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```typescript
{
  success: true;
  data: {
    total: number;
    successful: number;
    failed: number;
    errors: Array<{ item: any; error: string }>;
  };
}
```

#### Coupons (Admin)

##### Create Coupon (Admin)
```http
POST /admin/coupons
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```typescript
{
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses?: number;
  validUntil: string; // ISO 8601 date
  applicablePlans?: string[];
  duration: 'once' | 'repeating' | 'forever';
  durationInMonths?: number;
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    coupon: Coupon;
  };
}
```

##### List Coupons (Admin)
```http
GET /admin/coupons
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```typescript
{
  success: true;
  data: {
    coupons: Coupon[];
  };
}
```

##### Validate Coupon
```http
GET /admin/coupons/:code/validate
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `planId`: string (optional)

**Response:**
```typescript
{
  success: true;
  data: {
    valid: boolean;
    reason?: string;
    discountType?: string;
    discountValue?: number;
  };
}
```

## Data Models

### Title
```typescript
interface Title {
  id: string;
  slug: string;
  title: string;
  originalTitle?: string;
  synopsis: string;
  kind: 'movie' | 'series' | 'drama' | 'cartoon' | 'documentary';
  releaseYear: number;
  runtime?: number;
  posterUrl?: string;
  backdropUrl?: string;
  trailerUrl?: string;
  genres: string[];
  cast: string[];
  directors: string[];
  isPremium: boolean;
  isExclusive: boolean;
  isPublished: boolean;
  rating: {
    average: number;
    count: number;
  };
  createdAt: string;
  updatedAt: string;
}
```

### User
```typescript
interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  subscriptionStatus?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Subscription
```typescript
interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### SubscriptionPlan
```typescript
interface SubscriptionPlan {
  id: string;
  tier: 'basic' | 'standard' | 'premium' | 'family';
  interval: 'monthly' | 'yearly';
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  maxScreens: number;
  maxQuality: '720p' | '1080p' | '4K';
  features: PlanFeature[];
  trialDays: number;
}
```

### Notification
```typescript
interface Notification {
  id: string;
  userId?: string;
  kind: string;
  title: string;
  body: string;
  linkHref?: string;
  priority: 'low' | 'normal' | 'high';
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}
```

## Rate Limiting

### Rate Limits by Endpoint
- **Authentication endpoints**: 5 requests per 5 minutes per IP
- **Content endpoints**: 100 requests per minute per user
- **User endpoints**: 60 requests per minute per user
- **Admin endpoints**: 200 requests per minute per admin

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1625097600
```

## Webhooks

### Stripe Webhooks
```http
POST /webhooks/stripe
```

**Webhook Events:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

## SDKs

### JavaScript/TypeScript
```typescript
import { StreamFlixAPI } from '@streamflix/sdk';

const api = new StreamFlixAPI({
  baseURL: 'https://api.streamflix.com/v1',
  accessToken: 'your-access-token',
});

// Get titles
const titles = await api.content.listTitles({ kind: 'movie' });

// Get user
const user = await api.users.getMe();
```

### Python
```python
from streamflix import StreamFlixAPI

api = StreamFlixAPI(
    base_url='https://api.streamflix.com/v1',
    access_token='your-access-token'
)

# Get titles
titles = api.content.list_titles(kind='movie')

# Get user
user = api.users.get_me()
```

## Testing

### Sandbox Environment
For testing purposes, use the sandbox environment:
- **Base URL**: `https://api-sandbox.streamflix.com/v1`
- **Test API Key**: `test_sk_xxxxxxxxxxxxxx`

### Test Data
The sandbox environment provides test data for development and testing purposes.

## Support

For API support, contact:
- **Email**: api-support@streamflix.com
- **Documentation**: https://docs.streamflix.com
- **Status Page**: https://status.streamflix.com
