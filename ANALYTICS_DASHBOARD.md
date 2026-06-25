# Analytics Dashboard and Tracking System for StreamFlix Platform

## Overview
This document describes the comprehensive analytics dashboard and tracking system for a Netflix-style streaming platform, including user analytics, content analytics, revenue analytics, and real-time dashboard.

## Architecture Overview

```
Analytics System Architecture
├── Data Collection
│   ├── Event Tracking (User Actions)
│   ├── Content Performance (Views, Watch Time)
│   ├── Revenue Tracking (Subscriptions, Payments)
│   └── System Metrics (API Performance, Errors)
├── Data Processing
│   ├── Real-time Processing (Streams)
│   ├── Batch Processing (Aggregations)
│   ├── Data Transformation
│   └── Data Enrichment
├── Data Storage
│   ├── Time-Series Database (ClickHouse)
│   ├── Analytics Database (PostgreSQL)
│   ├── Data Warehouse (Snowflake/BigQuery)
│   └── Cache Layer (Redis)
├── Analytics Engine
│   ├── Query Engine (ClickHouse/SQL)
│   ├── Aggregation Engine
│   ├── ML Models (Predictions)
│   └── Reporting Engine
└── Visualization
    ├── Dashboard (React + Recharts)
    ├── Real-time Charts
    ├── Custom Reports
    └── Export Capabilities
```

## Event Tracking System

### Event Collection
```typescript
export class EventTracker {
  private clickHouse: ClickHouseClient;
  private redis: Redis;

  constructor(clickHouse: ClickHouseClient, redis: Redis) {
    this.clickHouse = clickHouse;
    this.redis = redis;
  }

  async trackEvent(event: AnalyticsEvent): Promise<void> {
    // Store in ClickHouse for long-term storage
    await this.clickHouse.insert({
      table: 'analytics_events',
      values: [{
        event_id: event.id,
        user_id: event.userId,
        session_id: event.sessionId,
        event_type: event.eventType,
        event_data: JSON.stringify(event.eventData),
        page_url: event.pageUrl,
        device_type: event.deviceType,
        browser: event.browser,
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        created_at: new Date(),
      }],
    });

    // Store in Redis for real-time analytics
    const key = `events:${event.eventType}:${new Date().toISOString().split('T')[0]}`;
    await this.redis.incr(key);
    await this.redis.expire(key, 86400 * 30); // 30 days
  }

  async trackPageView(params: PageViewParams): Promise<void> {
    await this.trackEvent({
      id: generateUUID(),
      userId: params.userId,
      sessionId: params.sessionId,
      eventType: 'page_view',
      eventData: {
        page: params.page,
        referrer: params.referrer,
        duration: params.duration,
      },
      pageUrl: params.url,
      deviceType: params.deviceType,
      browser: params.browser,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  async trackVideoEvent(params: VideoEventParams): Promise<void> {
    await this.trackEvent({
      id: generateUUID(),
      userId: params.userId,
      sessionId: params.sessionId,
      eventType: params.eventType,
      eventData: {
        titleId: params.titleId,
        episodeId: params.episodeId,
        position: params.position,
        duration: params.duration,
        quality: params.quality,
        deviceType: params.deviceType,
      },
      pageUrl: params.pageUrl,
      deviceType: params.deviceType,
      browser: params.browser,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  async trackSearchEvent(params: SearchEventParams): Promise<void> {
    await this.trackEvent({
      id: generateUUID(),
      userId: params.userId,
      sessionId: params.sessionId,
      eventType: 'search',
      eventData: {
        query: params.query,
        resultsCount: params.resultsCount,
        clickedResult: params.clickedResult,
      },
      pageUrl: params.pageUrl,
      deviceType: params.deviceType,
      browser: params.browser,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }
}

interface AnalyticsEvent {
  id: string;
  userId?: string;
  sessionId: string;
  eventType: string;
  eventData: Record<string, any>;
  pageUrl?: string;
  deviceType?: string;
  browser?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface PageViewParams {
  userId?: string;
  sessionId: string;
  page: string;
  url: string;
  referrer?: string;
  duration?: number;
  deviceType?: string;
  browser?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface VideoEventParams {
  userId?: string;
  sessionId: string;
  eventType: 'video_start' | 'video_progress' | 'video_complete' | 'video_pause' | 'video_seek';
  titleId: string;
  episodeId?: string;
  position: number;
  duration: number;
  quality: string;
  pageUrl: string;
  deviceType?: string;
  browser?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface SearchEventParams {
  userId?: string;
  sessionId: string;
  query: string;
  resultsCount: number;
  clickedResult?: string;
  pageUrl: string;
  deviceType?: string;
  browser?: string;
  ipAddress?: string;
  userAgent?: string;
}
```

## Content Analytics

### Content Performance Tracking
```typescript
export class ContentAnalytics {
  private db: DatabaseConnection;
  private clickHouse: ClickHouseClient;

  constructor(db: DatabaseConnection, clickHouse: ClickHouseClient) {
    this.db = db;
    this.clickHouse = clickHouse;
  }

  async getContentPerformance(
    titleId: string,
    dateRange: DateRange
  ): Promise<ContentPerformance> {
    const [views, uniqueViewers, watchTime, completionRate, engagement] = await Promise.all([
      this.getViews(titleId, dateRange),
      this.getUniqueViewers(titleId, dateRange),
      this.getTotalWatchTime(titleId, dateRange),
      this.getCompletionRate(titleId, dateRange),
      this.getEngagementMetrics(titleId, dateRange),
    ]);

    return {
      titleId,
      views,
      uniqueViewers,
      watchTime,
      completionRate,
      engagement,
      trends: await this.getPerformanceTrends(titleId, dateRange),
    };
  }

  async getViews(titleId: string, dateRange: DateRange): Promise<number> {
    const result = await this.clickHouse.query(
      `SELECT COUNT(*) as count
       FROM analytics_events
       WHERE event_type = 'video_start'
         AND event_data['titleId'] = '${titleId}'
         AND created_at >= '${dateRange.startDate.toISOString()}'
         AND created_at <= '${dateRange.endDate.toISOString()}'`
    );
    return result[0].count;
  }

  async getUniqueViewers(titleId: string, dateRange: DateRange): Promise<number) {
    const result = await this.clickHouse.query(
      `SELECT COUNT(DISTINCT user_id) as count
       FROM analytics_events
       WHERE event_type = 'video_start'
         AND event_data['titleId'] = '${titleId}'
         AND created_at >= '${dateRange.startDate.toISOString()}'
         AND created_at <= '${dateRange.endDate.toISOString()}'`
    );
    return result[0].count;
  }

  async getTotalWatchTime(titleId: string, dateRange: DateRange): Promise<number> {
    const result = await this.clickHouse.query(
      `SELECT SUM(event_data['duration']::UInt32) as total
       FROM analytics_events
       WHERE event_type = 'video_complete'
         AND event_data['titleId'] = '${titleId}'
         AND created_at >= '${dateRange.startDate.toISOString()}'
         AND created_at <= '${dateRange.endDate.toISOString()}'`
    );
    return result[0].total || 0;
  }

  async getCompletionRate(titleId: string, dateRange: DateRange): Promise<number> {
    const [starts, completes] = await Promise.all([
      this.clickHouse.query(
        `SELECT COUNT(*) as count
         FROM analytics_events
         WHERE event_type = 'video_start'
           AND event_data['titleId'] = '${titleId}'
           AND created_at >= '${dateRange.startDate.toISOString()}'
           AND created_at <= '${dateRange.endDate.toISOString()}'`
      ),
      this.clickHouse.query(
        `SELECT COUNT(*) as count
         FROM analytics_events
         WHERE event_type = 'video_complete'
           AND event_data['titleId'] = '${titleId}'
           AND created_at >= '${dateRange.startDate.toISOString()}'
           AND created_at <= '${dateRange.endDate.toISOString()}'`
      ),
    ]);

    const startCount = starts[0].count;
    const completeCount = completes[0].count;

    return startCount > 0 ? (completeCount / startCount) * 100 : 0;
  }

  async getEngagementMetrics(titleId: string, dateRange: DateRange): Promise<EngagementMetrics> {
    const [likes, shares, comments, addToWatchlist] = await Promise.all([
      this.getEventCount(titleId, 'like', dateRange),
      this.getEventCount(titleId, 'share', dateRange),
      this.getEventCount(titleId, 'comment', dateRange),
      this.getEventCount(titleId, 'add_to_watchlist', dateRange),
    ]);

    return {
      likes,
      shares,
      comments,
      addToWatchlist,
    };
  }

  async getPerformanceTrends(titleId: string, dateRange: DateRange): Promise<PerformanceTrends> {
    const daily = await this.clickHouse.query(
      `SELECT
         toDateString(created_at) as date,
         COUNT(*) as views
       FROM analytics_events
       WHERE event_type = 'video_start'
         AND event_data['titleId'] = '${titleId}'
         AND created_at >= '${dateRange.startDate.toISOString()}'
         AND created_at <= '${dateRange.endDate.toISOString()}'
       GROUP BY date
       ORDER BY date ASC`
    );

    return {
      daily: daily.map(row => ({ date: row.date, views: row.views })),
      weekly: this.aggregateToWeekly(daily),
      monthly: this.aggregateToMonthly(daily),
    };
  }

  async getTopContent(limit: number = 20): Promise<TopContentItem[]> {
    const result = await this.clickHouse.query(
      `SELECT
         event_data['titleId'] as title_id,
         COUNT(*) as views,
         COUNT(DISTINCT user_id) as unique_viewers
       FROM analytics_events
       WHERE event_type = 'video_start'
         AND created_at >= now() - INTERVAL 30 DAY
       GROUP BY title_id
       ORDER BY views DESC
       LIMIT ${limit}`
    );

    return result.map(row => ({
      titleId: row.title_id,
      views: row.views,
      uniqueViewers: row.unique_viewers,
    }));
  }

  private async getEventCount(titleId: string, eventType: string, dateRange: DateRange): Promise<number> {
    const result = await this.clickHouse.query(
      `SELECT COUNT(*) as count
       FROM analytics_events
       WHERE event_type = '${eventType}'
         AND event_data['titleId'] = '${titleId}'
         AND created_at >= '${dateRange.startDate.toISOString()}'
         AND created_at <= '${dateRange.endDate.toISOString()}'`
    );
    return result[0].count;
  }

  private aggregateToWeekly(daily: any[]): any[] {
    // Aggregate daily data to weekly
    const weekly: Record<string, number> = {};
    for (const row of daily) {
      const week = this.getWeekNumber(new Date(row.date));
      weekly[week] = (weekly[week] || 0) + row.views;
    }
    return Object.entries(weekly).map(([week, views]) => ({ week, views }));
  }

  private aggregateToMonthly(daily: any[]): any[] {
    // Aggregate daily data to monthly
    const monthly: Record<string, number> = {};
    for (const row of daily) {
      const month = row.date.substring(0, 7); // YYYY-MM
      monthly[month] = (monthly[month] || 0) + row.views;
    }
    return Object.entries(monthly).map(([month, views]) => ({ month, views }));
  }

  private getWeekNumber(date: Date): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
  }
}

interface ContentPerformance {
  titleId: string;
  views: number;
  uniqueViewers: number;
  watchTime: number;
  completionRate: number;
  engagement: EngagementMetrics;
  trends: PerformanceTrends;
}

interface EngagementMetrics {
  likes: number;
  shares: number;
  comments: number;
  addToWatchlist: number;
}

interface PerformanceTrends {
  daily: Array<{ date: string; views: number }>;
  weekly: Array<{ week: string; views: number }>;
  monthly: Array<{ month: string; views: number }>;
}

interface TopContentItem {
  titleId: string;
  views: number;
  uniqueViewers: number;
}
```

## User Analytics

### User Behavior Tracking
```typescript
export class UserAnalytics {
  private db: DatabaseConnection;
  private clickHouse: ClickHouseClient;

  constructor(db: DatabaseConnection, clickHouse: ClickHouseClient) {
    this.db = db;
    this.clickHouse = clickHouse;
  }

  async getUserActivity(userId: string, dateRange: DateRange): Promise<UserActivity> {
    const [sessions, watchTime, contentConsumed, searchActivity] = await Promise.all([
      this.getSessionCount(userId, dateRange),
      this.getTotalWatchTime(userId, dateRange),
      this.getContentConsumed(userId, dateRange),
      this.getSearchActivity(userId, dateRange),
    ]);

    return {
      userId,
      sessions,
      watchTime,
      contentConsumed,
      searchActivity,
      dailyActivity: await this.getDailyActivity(userId, dateRange),
    };
  }

  async getSessionCount(userId: string, dateRange: DateRange): Promise<number> {
    const result = await this.clickHouse.query(
      `SELECT COUNT(DISTINCT session_id) as count
       FROM analytics_events
       WHERE user_id = '${userId}'
         AND created_at >= '${dateRange.startDate.toISOString()}'
         AND created_at <= '${dateRange.endDate.toISOString()}'`
    );
    return result[0].count;
  }

  async getTotalWatchTime(userId: string, dateRange: DateRange): Promise<number> {
    const result = await this.clickHouse.query(
      `SELECT SUM(event_data['duration']::UInt32) as total
       FROM analytics_events
       WHERE user_id = '${userId}'
         AND event_type = 'video_complete'
         AND created_at >= '${dateRange.startDate.toISOString()}'
         AND created_at <= '${dateRange.endDate.toISOString()}'`
    );
    return result[0].total || 0;
  }

  async getContentConsumed(userId: string, dateRange: DateRange): Promise<ContentConsumption> {
    const result = await this.clickHouse.query(
      `SELECT
         event_data['titleId'] as title_id,
         COUNT(*) as views,
         SUM(event_data['duration']::UInt32) as total_watch_time
       FROM analytics_events
       WHERE user_id = '${userId}'
         AND event_type = 'video_complete'
         AND created_at >= '${dateRange.startDate.toISOString()}'
         AND created_at <= '${dateRange.endDate.toISOString()}'
       GROUP BY title_id
       ORDER BY views DESC
       LIMIT 10`
    );

    return {
      topTitles: result.map(row => ({
        titleId: row.title_id,
        views: row.views,
        watchTime: row.total_watch_time,
      })),
      totalTitles: result.length,
    };
  }

  async getSearchActivity(userId: string, dateRange: DateRange): Promise<SearchActivity> {
    const result = await this.clickHouse.query(
      `SELECT
         event_data['query'] as query,
         COUNT(*) as searches,
         AVG(event_data['resultsCount']::UInt32) as avg_results
       FROM analytics_events
       WHERE user_id = '${userId}'
         AND event_type = 'search'
         AND created_at >= '${dateRange.startDate.toISOString()}'
         AND created_at <= '${dateRange.endDate.toISOString()}'
       GROUP BY query
       ORDER BY searches DESC
       LIMIT 10`
    );

    return {
      topQueries: result.map(row => ({
        query: row.query,
        searches: row.searches,
        avgResults: row.avg_results,
      })),
      totalSearches: result.reduce((sum, row) => sum + row.searches, 0),
    };
  }

  async getDailyActivity(userId: string, dateRange: DateRange): Promise<DailyActivity[]> {
    const result = await this.clickHouse.query(
      `SELECT
         toDateString(created_at) as date,
         COUNT(DISTINCT session_id) as sessions,
         SUM(CASE WHEN event_type = 'video_complete' THEN event_data['duration']::UInt32 ELSE 0 END) as watch_time
       FROM analytics_events
       WHERE user_id = '${userId}'
         AND created_at >= '${dateRange.startDate.toISOString()}'
         AND created_at <= '${dateRange.endDate.toISOString()}'
       GROUP BY date
       ORDER BY date ASC`
    );

    return result.map(row => ({
      date: row.date,
      sessions: row.sessions,
      watchTime: row.watch_time,
    }));
  }

  async getUserRetention(cohortDate: Date): Promise<RetentionData> {
    const result = await this.clickHouse.query(
      `SELECT
         cohort_day,
         COUNT(DISTINCT user_id) as users,
         COUNT(DISTINCT CASE WHEN has_activity THEN user_id END) as retained_users
       FROM (
         SELECT
           user_id,
           toInt32(dateDiff('day', toDateTime('${cohortDate.toISOString()}'), toDateTime(created_at))) as cohort_day,
           created_at >= toDateTime('${cohortDate.toISOString()}') + INTERVAL cohort_day DAY as has_activity
         FROM analytics_events
         WHERE created_at >= toDateTime('${cohortDate.toISOString()}')
           AND created_at <= toDateTime('${cohortDate.toISOString()}') + INTERVAL 30 DAY
       )
       GROUP BY cohort_day
       ORDER BY cohort_day ASC`
    );

    return result.map(row => ({
      cohortDay: row.cohort_day,
      totalUsers: row.users,
      retainedUsers: row.retained_users,
      retentionRate: row.users > 0 ? (row.retained_users / row.users) * 100 : 0,
    }));
  }
}

interface UserActivity {
  userId: string;
  sessions: number;
  watchTime: number;
  contentConsumed: ContentConsumption;
  searchActivity: SearchActivity;
  dailyActivity: DailyActivity[];
}

interface ContentConsumption {
  topTitles: Array<{ titleId: string; views: number; watchTime: number }>;
  totalTitles: number;
}

interface SearchActivity {
  topQueries: Array<{ query: string; searches: number; avgResults: number }>;
  totalSearches: number;
}

interface DailyActivity {
  date: string;
  sessions: number;
  watchTime: number;
}

interface RetentionData {
  cohortDay: number;
  totalUsers: number;
  retainedUsers: number;
  retentionRate: number;
}
```

## Revenue Analytics

### Revenue Tracking
```typescript
export class RevenueAnalytics {
  private db: DatabaseConnection;
  private clickHouse: ClickHouseClient;

  constructor(db: DatabaseConnection, clickHouse: ClickHouseClient) {
    this.db = db;
    this.clickHouse = clickHouse;
  }

  async getRevenueMetrics(dateRange: DateRange): Promise<RevenueMetrics> {
    const [mrr, arr, revenue, churnRate, ltv] = await Promise.all([
      this.getMRR(dateRange.endDate),
      this.getARR(dateRange.endDate),
      this.getTotalRevenue(dateRange),
      this.getChurnRate(dateRange),
      this.getLTV(),
    ]);

    return {
      mrr,
      arr,
      revenue,
      churnRate,
      ltv,
      revenueByPlan: await this.getRevenueByPlan(dateRange),
      revenueByMonth: await this.getRevenueByMonth(dateRange),
    };
  }

  async getMRR(date: Date): Promise<number> {
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

  async getARR(date: Date): Promise<number> {
    const mrr = await this.getMRR(date);
    return mrr * 12;
  }

  async getTotalRevenue(dateRange: DateRange): Promise<number> {
    const result = await this.db.query(
      `SELECT COALESCE(SUM(amount_cents), 0) as total
       FROM invoices
       WHERE status = 'paid'
         AND paid_at >= $1
         AND paid_at <= $2`,
      [dateRange.startDate, dateRange.endDate]
    );

    return result[0].total;
  }

  async getChurnRate(dateRange: DateRange): Promise<number> {
    const startSubscriptions = await this.db.query(
      `SELECT COUNT(*) as count
       FROM subscriptions
       WHERE status = 'active'
         AND created_at < $1`,
      [dateRange.startDate]
    );

    const cancellations = await this.db.query(
      `SELECT COUNT(*) as count
       FROM subscriptions
       WHERE status = 'canceled'
         AND updated_at >= $1
         AND updated_at <= $2`,
      [dateRange.startDate, dateRange.endDate]
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

  async getRevenueByPlan(dateRange: DateRange): Promise<RevenueByPlan[]> {
    const result = await this.db.query(
      `SELECT
         p.tier,
         p.interval,
         SUM(i.amount_cents) as revenue,
         COUNT(*) as invoice_count
       FROM invoices i
       JOIN subscriptions s ON i.subscription_id = s.id
       JOIN subscription_plans p ON s.plan_id = p.id
       WHERE i.status = 'paid'
         AND i.paid_at >= $1
         AND i.paid_at <= $2
       GROUP BY p.tier, p.interval
       ORDER BY revenue DESC`,
      [dateRange.startDate, dateRange.endDate]
    );

    return result.map(row => ({
      tier: row.tier,
      interval: row.interval,
      revenue: row.revenue,
      invoiceCount: row.invoice_count,
    }));
  }

  async getRevenueByMonth(dateRange: DateRange): Promise<RevenueByMonth[]> {
    const result = await this.db.query(
      `SELECT
         DATE_TRUNC('month', paid_at) as month,
         SUM(amount_cents) as revenue,
         COUNT(*) as invoice_count
       FROM invoices
       WHERE status = 'paid'
         AND paid_at >= $1
         AND paid_at <= $2
       GROUP BY month
       ORDER BY month ASC`,
      [dateRange.startDate, dateRange.endDate]
    );

    return result.map(row => ({
      month: row.month,
      revenue: row.revenue,
      invoiceCount: row.invoice_count,
    }));
  }
}

interface RevenueMetrics {
  mrr: number;
  arr: number;
  revenue: number;
  churnRate: number;
  ltv: number;
  revenueByPlan: RevenueByPlan[];
  revenueByMonth: RevenueByMonth[];
}

interface RevenueByPlan {
  tier: string;
  interval: string;
  revenue: number;
  invoiceCount: number;
}

interface RevenueByMonth {
  month: Date;
  revenue: number;
  invoiceCount: number;
}
```

## Dashboard Components

### Overview Dashboard
```typescript
export const OverviewDashboard = () => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: fetchDashboardMetrics,
    refetchInterval: 60000, // Refresh every minute
  });

  return (
    <div className="dashboard-overview">
      <h1>Dashboard Overview</h1>
      
      {/* Key Metrics */}
      <div className="metrics-grid">
        <MetricCard
          title="Total Users"
          value={metrics?.totalUsers || 0}
          change={metrics?.userGrowth || 0}
          icon={Users}
        />
        <MetricCard
          title="Active Subscriptions"
          value={metrics?.activeSubscriptions || 0}
          change={metrics?.subscriptionGrowth || 0}
          icon={CreditCard}
        />
        <MetricCard
          title="Monthly Revenue"
          value={`$${(metrics?.mrr || 0) / 100}`}
          change={metrics?.revenueGrowth || 0}
          icon={DollarSign}
        />
        <MetricCard
          title="Total Views Today"
          value={metrics?.todayViews || 0}
          change={metrics?.viewsGrowth || 0}
          icon={Play}
        />
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <RevenueChart data={metrics?.revenueData} />
        <UserGrowthChart data={metrics?.userGrowthData} />
        <ContentPerformanceChart data={metrics?.topContent} />
        <GeographicDistribution data={metrics?.geoDistribution} />
      </div>

      {/* Recent Activity */}
      <ActivityFeed activities={metrics?.recentActivity} />
    </div>
  );
};

const MetricCard = ({ title, value, change, icon: Icon }: MetricCardProps) => {
  const isPositive = change >= 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatNumber(value)}</div>
        <p className={`text-xs ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {isPositive ? '+' : ''}{change.toFixed(1)}% from last month
        </p>
      </CardContent>
    </Card>
  );
};
```

### Real-time Dashboard
```typescript
export const RealtimeDashboard = () => {
  const [metrics, setMetrics] = useState<RealtimeMetrics>({
    activeUsers: 0,
    concurrentStreams: 0,
    apiRequestsPerSecond: 0,
    averageResponseTime: 0,
    errorRate: 0,
  });

  useEffect(() => {
    // Subscribe to real-time updates
    const subscription = subscribeToRealtimeMetrics((newMetrics) => {
      setMetrics(newMetrics);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="realtime-dashboard">
      <h1>Real-time Monitoring</h1>
      
      <div className="metrics-grid">
        <RealtimeMetricCard
          title="Active Users"
          value={metrics.activeUsers}
          icon={Users}
          trend="up"
        />
        <RealtimeMetricCard
          title="Concurrent Streams"
          value={metrics.concurrentStreams}
          icon={Play}
          trend="up"
        />
        <RealtimeMetricCard
          title="API Requests/sec"
          value={metrics.apiRequestsPerSecond}
          icon={Activity}
          trend="stable"
        />
        <RealtimeMetricCard
          title="Avg Response Time"
          value={`${metrics.averageResponseTime}ms`}
          icon={Clock}
          trend="down"
        />
        <RealtimeMetricCard
          title="Error Rate"
          value={`${(metrics.errorRate * 100).toFixed(2)}%`}
          icon={AlertTriangle}
          trend="down"
        />
      </div>

      <RealtimeChart data={metrics.timeSeriesData} />
    </div>
  );
};
```

## Analytics API Endpoints

### Content Analytics API
```typescript
// GET /api/analytics/content/:titleId
export const getContentAnalytics = async (
  titleId: string,
  startDate: Date,
  endDate: Date
): Promise<ContentPerformance> => {
  const analytics = new ContentAnalytics(db, clickHouse);
  return await analytics.getContentPerformance(titleId, { startDate, endDate });
};

// GET /api/analytics/content/top
export const getTopContent = async (limit: number = 20): Promise<TopContentItem[]> => {
  const analytics = new ContentAnalytics(db, clickHouse);
  return await analytics.getTopContent(limit);
};

// GET /api/analytics/content/trending
export const getTrendingContent = async (timeWindow: 'daily' | 'weekly' | 'monthly'): Promise<TopContentItem[]> => {
  const analytics = new ContentAnalytics(db, clickHouse);
  return await analytics.getTopContent(50); // Return top 50 for trending
};
```

### User Analytics API
```typescript
// GET /api/analytics/users/:userId
export const getUserAnalytics = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<UserActivity> => {
  const analytics = new UserAnalytics(db, clickHouse);
  return await analytics.getUserActivity(userId, { startDate, endDate });
};

// GET /api/analytics/users/retention
export const getUserRetention = async (cohortDate: Date): Promise<RetentionData> => {
  const analytics = new UserAnalytics(db, clickHouse);
  return await analytics.getUserRetention(cohortDate);
};
```

### Revenue Analytics API
```typescript
// GET /api/analytics/revenue
export const getRevenueAnalytics = async (
  startDate: Date,
  endDate: Date
): Promise<RevenueMetrics> => {
  const analytics = new RevenueAnalytics(db, clickHouse);
  return await analytics.getRevenueMetrics({ startDate, endDate });
};

// GET /api/analytics/revenue/mrr
export const getMRR = async (date: Date = new Date()): Promise<number> => {
  const analytics = new RevenueAnalytics(db, clickHouse);
  return await analytics.getMRR(date);
};

// GET /api/analytics/revenue/churn
export const getChurnRate = async (
  startDate: Date,
  endDate: Date
): Promise<number> => {
  const analytics = new RevenueAnalytics(db, clickHouse);
  return await analytics.getChurnRate({ startDate, endDate });
};
```

## Technology Stack Summary

| Category | Technology | Purpose |
|----------|-----------|---------|
| Time-Series DB | ClickHouse | Event storage |
| Analytics DB | PostgreSQL | Aggregated data |
| Data Warehouse | Snowflake/BigQuery | Long-term storage |
| Cache | Redis | Real-time metrics |
| Visualization | Recharts/D3.js | Charts |
| Real-time | WebSocket/SSE | Live updates |
| Processing | Apache Kafka | Stream processing |
