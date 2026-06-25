# Performance Optimization Strategy for StreamFlix Platform

## Overview
This document describes the comprehensive performance optimization strategy for a Netflix-style streaming platform capable of supporting millions of concurrent users with sub-second response times.

## Performance Goals

### Target Metrics
- **Page Load Time**: < 2 seconds (p95)
- **Time to First Byte (TTFB)**: < 200ms
- **Video Startup Time**: < 3 seconds
- **Video Buffer Ratio**: < 1%
- **API Response Time**: < 100ms (p95)
- **Database Query Time**: < 50ms (p95)
- **Cache Hit Ratio**: > 90%
- **Error Rate**: < 0.1%
- **Uptime**: 99.9%

### Scalability Targets
- **Concurrent Users**: 1M+
- **Video Streams**: 500K+
- **API Requests**: 100K+ per second
- **Database Connections**: 10K+
- **Bandwidth**: 10Tbps+

## CDN Architecture

### Multi-CDN Strategy
```typescript
interface CDNConfig {
  primary: CloudFrontConfig;
  secondary: FastlyConfig;
  fallback: AkamaiConfig;
  healthCheck: HealthCheckConfig;
}

interface CloudFrontConfig {
  distributionId: string;
  domainName: string;
  origin: {
    s3Bucket: string;
    apiEndpoint: string;
  };
  behaviors: CacheBehavior[];
  signedUrls: boolean;
  signedCookies: boolean;
}

interface CacheBehavior {
  pathPattern: string;
  allowedMethods: string[];
  cachedMethods: string[];
  ttl: {
    default: number;
    min: number;
    max: number;
  };
  queryString: boolean;
  headers: string[];
  cookies: string[];
}
```

### CDN Configuration
```typescript
export class CDNManager {
  private cdnProviders: CDNProvider[] = [];
  private currentProvider: CDNProvider;
  private healthChecker: CDNHealthChecker;

  constructor(config: CDNConfig) {
    this.cdnProviders = [
      new CloudFrontProvider(config.primary),
      new FastlyProvider(config.secondary),
      new AkamaiProvider(config.fallback),
    ];
    this.currentProvider = this.cdnProviders[0];
    this.healthChecker = new CDNHealthChecker(config.healthCheck);
    this.startHealthChecks();
  }

  async getSignedUrl(
    assetKey: string,
    expiresIn: number = 3600
  ): Promise<string> {
    return await this.currentProvider.generateSignedUrl(assetKey, expiresIn);
  }

  async invalidateCache(paths: string[]): Promise<void> {
    await Promise.all(
      this.cdnProviders.map(provider => provider.invalidate(paths))
    );
  }

  private startHealthChecks(): void {
    setInterval(async () => {
      const healthyProviders = await this.healthChecker.checkAll(this.cdnProviders);
      
      if (!healthyProviders.includes(this.currentProvider)) {
        this.switchProvider(healthyProviders[0]);
      }
    }, 30000); // Check every 30 seconds
  }

  private switchProvider(provider: CDNProvider): void {
    this.currentProvider = provider;
    this.notifyProviderSwitch(provider);
  }

  private notifyProviderSwitch(provider: CDNProvider): void {
    // Send alert to monitoring system
    sendAlert({
      type: 'cdn_switch',
      message: `Switched to ${provider.name}`,
      severity: 'warning',
    });
  }
}
```

### CDN Cache Behaviors
```typescript
export const CDN_CACHE_BEHAVIORS = {
  // Static assets (images, CSS, JS)
  static: {
    pathPattern: '/static/*',
    ttl: {
      default: 86400, // 1 day
      min: 3600,     // 1 hour
      max: 31536000, // 1 year
    },
    queryString: false,
    headers: ['Origin'],
    cookies: 'none',
  },

  // Video segments
  video: {
    pathPattern: '/videos/*',
    ttl: {
      default: 604800, // 7 days
      min: 3600,      // 1 hour
      max: 2592000,   // 30 days
    },
    queryString: true,
    headers: ['Origin', 'Range'],
    cookies: 'none',
  },

  // API responses
  api: {
    pathPattern: '/api/*',
    ttl: {
      default: 300,   // 5 minutes
      min: 60,       // 1 minute
      max: 3600,     // 1 hour
    },
    queryString: true,
    headers: ['Authorization', 'Origin'],
    cookies: 'none',
  },

  // HLS manifests
  hls: {
    pathPattern: '/*.m3u8',
    ttl: {
      default: 60,    // 1 minute
      min: 30,       // 30 seconds
      max: 300,      // 5 minutes
    },
    queryString: true,
    headers: ['Origin'],
    cookies: 'none',
  },
};
```

## Caching Strategy

### Multi-Layer Caching
```
L1: Browser Cache (Client-side)
  - Static assets: 1 year
  - API responses: 5 minutes
  - Video segments: 7 days

L2: CDN Cache (Edge)
  - Static assets: 1 day
  - API responses: 5 minutes
  - Video segments: 7 days
  - HLS manifests: 1 minute

L3: Application Cache (Redis)
  - User sessions: 24 hours
  - User profiles: 5 minutes
  - Content metadata: 1 hour
  - Search results: 5 minutes
  - Recommendations: 1 hour

L4: Database Cache (PostgreSQL)
  - Query results: 1 minute
  - Materialized views: 5 minutes
  - Prepared statements: Permanent
```

### Redis Caching Implementation
```typescript
export class CacheManager {
  private redis: Redis;
  private localCache: LRUCache<string, any>;

  constructor(redisConfig: RedisConfig) {
    this.redis = new Redis(redisConfig);
    this.localCache = new LRUCache({
      max: 1000,
      ttl: 1000 * 60 * 5, // 5 minutes
    });
  }

  async get<T>(key: string): Promise<T | null> {
    // Check local cache first
    const localValue = this.localCache.get(key);
    if (localValue) return localValue;

    // Check Redis
    const redisValue = await this.redis.get(key);
    if (redisValue) {
      const parsed = JSON.parse(redisValue);
      this.localCache.set(key, parsed);
      return parsed;
    }

    return null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    
    // Set in local cache
    this.localCache.set(key, value);
    
    // Set in Redis
    if (ttl) {
      await this.redis.setex(key, ttl, serialized);
    } else {
      await this.redis.set(key, serialized);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    // Invalidate local cache
    this.localCache.clear();
    
    // Invalidate Redis keys matching pattern
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) return cached;

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }
}

// Cache key patterns
export const CACHE_KEYS = {
  user: (userId: string) => `user:${userId}`,
  userProfile: (userId: string) => `user:${userId}:profile`,
  userSubscription: (userId: string) => `user:${userId}:subscription`,
  title: (titleId: string) => `title:${titleId}`,
  titleDetails: (slug: string) => `title:${slug}:details`,
  titlesList: (params: string) => `titles:${params}`,
  trending: (category: string, timeWindow: string) => `trending:${category}:${timeWindow}`,
  recommendations: (userId: string) => `recommendations:${userId}`,
  searchResults: (query: string) => `search:${query}`,
  watchHistory: (userId: string) => `watch_history:${userId}`,
  watchlist: (userId: string) => `watchlist:${userId}`,
};
```

### Cache Warming Strategy
```typescript
export class CacheWarmer {
  private cacheManager: CacheManager;
  private scheduler: TaskScheduler;

  constructor(cacheManager: CacheManager) {
    this.cacheManager = cacheManager;
    this.scheduler = new TaskScheduler();
    this.scheduleWarmingTasks();
  }

  private scheduleWarmingTasks(): void {
    // Warm trending content every 10 minutes
    this.scheduler.schedule('*/10 * * * *', async () => {
      await this.warmTrendingContent();
    });

    // Warm popular content every hour
    this.scheduler.schedule('0 * * * *', async () => {
      await this.warmPopularContent();
    });

    // Warm user recommendations every 30 minutes
    this.scheduler.schedule('*/30 * * * *', async () => {
      await this.warmUserRecommendations();
    });

    // Warm search results for popular queries every hour
    this.scheduler.schedule('0 * * * *', async () => {
      await this.warmPopularSearches();
    });
  }

  private async warmTrendingContent(): Promise<void> {
    const categories = ['movies', 'series', 'dramas', 'cartoons'];
    const timeWindows = ['daily', 'weekly'];

    for (const category of categories) {
      for (const timeWindow of timeWindows) {
        const cacheKey = CACHE_KEYS.trending(category, timeWindow);
        const trending = await fetchTrendingContent(category, timeWindow);
        await this.cacheManager.set(cacheKey, trending, 600); // 10 minutes
      }
    }
  }

  private async warmPopularContent(): Promise<void> {
    const popular = await fetchPopularContent();
    for (const title of popular) {
      const cacheKey = CACHE_KEYS.titleDetails(title.slug);
      await this.cacheManager.set(cacheKey, title, 3600); // 1 hour
    }
  }

  private async warmUserRecommendations(): Promise<void> {
    const activeUsers = await getActiveUsers(1000); // Limit to 1000 users
    
    for (const user of activeUsers) {
      const cacheKey = CACHE_KEYS.recommendations(user.id);
      const recommendations = await fetchRecommendations(user.id);
      await this.cacheManager.set(cacheKey, recommendations, 1800); // 30 minutes
    }
  }

  private async warmPopularSearches(): Promise<void> {
    const popularQueries = await getPopularSearchQueries(100);
    
    for (const query of popularQueries) {
      const cacheKey = CACHE_KEYS.searchResults(query.query);
      const results = await searchContent(query.query);
      await this.cacheManager.set(cacheKey, results, 3600); // 1 hour
    }
  }
}
```

## Load Balancing

### Application Load Balancer (ALB)
```typescript
interface LoadBalancerConfig {
  algorithm: 'round_robin' | 'least_connections' | 'ip_hash' | 'weighted';
  healthCheck: HealthCheckConfig;
  stickySessions: boolean;
  sslTermination: boolean;
  rateLimiting: RateLimitConfig;
}

interface HealthCheckConfig {
  path: string;
  interval: number;
  timeout: number;
  healthyThreshold: number;
  unhealthyThreshold: number;
}

export class LoadBalancer {
  private servers: Server[];
  private currentIndex = 0;
  private config: LoadBalancerConfig;
  private healthStatus: Map<string, boolean> = new Map();

  constructor(servers: Server[], config: LoadBalancerConfig) {
    this.servers = servers;
    this.config = config;
    this.startHealthChecks();
  }

  async getNextServer(request: Request): Promise<Server> {
    const healthyServers = this.servers.filter(
      server => this.healthStatus.get(server.id) === true
    );

    if (healthyServers.length === 0) {
      throw new Error('No healthy servers available');
    }

    switch (this.config.algorithm) {
      case 'round_robin':
        return this.roundRobin(healthyServers);
      case 'least_connections':
        return this.leastConnections(healthyServers);
      case 'ip_hash':
        return this.ipHash(healthyServers, request);
      case 'weighted':
        return this.weighted(healthyServers);
      default:
        return this.roundRobin(healthyServers);
    }
  }

  private roundRobin(servers: Server[]): Server {
    const server = servers[this.currentIndex % servers.length];
    this.currentIndex++;
    return server;
  }

  private leastConnections(servers: Server[]): Server {
    return servers.reduce((min, server) =>
      server.connections < min.connections ? server : min
    );
  }

  private ipHash(servers: Server[], request: Request): Server {
    const ip = getClientIP(request);
    const hash = this.hashCode(ip);
    const index = Math.abs(hash) % servers.length;
    return servers[index];
  }

  private weighted(servers: Server[]): Server {
    const totalWeight = servers.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const server of servers) {
      random -= server.weight;
      if (random <= 0) return server;
    }
    
    return servers[servers.length - 1];
  }

  private startHealthChecks(): void {
    setInterval(async () => {
      for (const server of this.servers) {
        const isHealthy = await this.checkServerHealth(server);
        this.healthStatus.set(server.id, isHealthy);
      }
    }, this.config.healthCheck.interval);
  }

  private async checkServerHealth(server: Server): Promise<boolean> {
    try {
      const response = await fetch(
        `${server.url}${this.config.healthCheck.path}`,
        {
          method: 'GET',
          signal: AbortSignal.timeout(this.config.healthCheck.timeout),
        }
      );
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash;
  }
}
```

### Database Load Balancing
```typescript
export class DatabaseLoadBalancer {
  private primary: DatabaseConnection;
  private replicas: DatabaseConnection[];
  private readWriteSplit: boolean;

  constructor(config: DatabaseConfig) {
    this.primary = new DatabaseConnection(config.primary);
    this.replicas = config.replicas.map(
      replica => new DatabaseConnection(replica)
    );
    this.readWriteSplit = config.readWriteSplit;
  }

  getConnection(queryType: 'read' | 'write'): DatabaseConnection {
    if (queryType === 'write' || !this.readWriteSplit) {
      return this.primary;
    }

    // Round-robin for read operations
    const replica = this.replicas[
      Math.floor(Math.random() * this.replicas.length)
    ];
    
    return replica;
  }

  async query<T>(
    sql: string,
    params: any[],
    queryType: 'read' | 'write' = 'read'
  ): Promise<T[]> {
    const connection = this.getConnection(queryType);
    return await connection.query<T>(sql, params);
  }

  async healthCheck(): Promise<HealthStatus> {
    const [primaryHealth, ...replicasHealth] = await Promise.all([
      this.primary.ping(),
      ...this.replicas.map(r => r.ping()),
    ]);

    return {
      primary: primaryHealth,
      replicas: replicasHealth,
      healthy: primaryHealth && replicasHealth.every(h => h),
    };
  }
}
```

## Database Optimization

### Connection Pooling
```typescript
export class ConnectionPool {
  private pool: Pool;
  private config: PoolConfig;

  constructor(config: PoolConfig) {
    this.config = config;
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.maxConnections,
      min: config.minConnections,
      idleTimeoutMillis: config.idleTimeout,
      connectionTimeoutMillis: config.connectionTimeout,
    });
  }

  async query<T>(sql: string, params: any[]): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
```

### Query Optimization
```typescript
export class QueryOptimizer {
  private connectionPool: ConnectionPool;
  private queryCache: Map<string, QueryPlan>;

  constructor(connectionPool: ConnectionPool) {
    this.connectionPool = connectionPool;
    this.queryCache = new Map();
  }

  async executeQuery<T>(
    sql: string,
    params: any[],
    options?: QueryOptions
  ): Promise<T[]> {
    const cacheKey = this.generateCacheKey(sql, params);
    
    // Check query plan cache
    let queryPlan = this.queryCache.get(cacheKey);
    if (!queryPlan) {
      queryPlan = await this.analyzeQuery(sql);
      this.queryCache.set(cacheKey, queryPlan);
    }

    // Apply optimizations based on query plan
    const optimizedSQL = this.optimizeSQL(sql, queryPlan, options);

    return await this.connectionPool.query<T>(optimizedSQL, params);
  }

  private async analyzeQuery(sql: string): Promise<QueryPlan> {
    const result = await this.connectionPool.query(
      'EXPLAIN (ANALYZE, BUFFERS) ' + sql,
      []
    );
    
    return {
      executionTime: result.rows[0]['Execution Time'],
      planningTime: result.rows[0]['Planning Time'],
      rows: result.rows[0]['rows'],
      cost: result.rows[0]['Total Cost'],
      indexes: this.extractIndexes(result.rows),
    };
  }

  private optimizeSQL(
    sql: string,
    plan: QueryPlan,
    options?: QueryOptions
  ): string {
    let optimized = sql;

    // Add index hints if needed
    if (options?.forceIndex) {
      optimized = this.addIndexHint(optimized, options.forceIndex);
    }

    // Add LIMIT if not present and plan suggests it
    if (!sql.includes('LIMIT') && plan.rows > 1000) {
      optimized = optimized.replace(/;$/, ' LIMIT 1000;');
    }

    return optimized;
  }

  private addIndexHint(sql: string, indexName: string): string {
    // PostgreSQL doesn't support index hints directly
    // This is a placeholder for databases that do
    return sql;
  }

  private extractIndexes(rows: any[]): string[] {
    const indexes: string[] = [];
    for (const row of rows) {
      if (row['Index Scan']) {
        indexes.push(row['Index Scan']);
      }
    }
    return indexes;
  }

  private generateCacheKey(sql: string, params: any[]): string {
    return `${sql}:${JSON.stringify(params)}`;
  }
}
```

### Materialized Views
```typescript
export const MATERIALIZED_VIEWS = {
  // Dashboard statistics
  dashboardStats: `
    CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_stats AS
    SELECT
      COUNT(DISTINCT user_id) as total_users,
      COUNT(DISTINCT CASE WHEN status = 'active' THEN user_id END) as active_subscriptions,
      COUNT(*) as total_titles,
      SUM(view_count) as total_views
    FROM titles
    CROSS JOIN subscriptions
    WHERE is_published = true
    WITH DATA;

    REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats;
  `,

  // Content analytics
  contentAnalytics: `
    CREATE MATERIALIZED VIEW IF NOT EXISTS content_analytics_daily AS
    SELECT
      DATE(watched_at) as date,
      title_id,
      COUNT(DISTINCT user_id) as unique_viewers,
      COUNT(*) as total_views,
      AVG(position_seconds) as avg_watch_position,
      AVG(duration_seconds) as avg_duration
    FROM watch_history
    GROUP BY DATE(watched_at), title_id
    WITH DATA;

    CREATE INDEX ON content_analytics_daily(date, title_id);
    REFRESH MATERIALIZED VIEW CONCURRENTLY content_analytics_daily;
  `,

  // User engagement
  userEngagement: `
    CREATE MATERIALIZED VIEW IF NOT EXISTS user_engagement_weekly AS
    SELECT
      user_id,
      DATE_TRUNC('week', watched_at) as week,
      COUNT(*) as titles_watched,
      SUM(duration_seconds) as total_watch_time,
      COUNT(DISTINCT title_id) as unique_titles
    FROM watch_history
    GROUP BY user_id, DATE_TRUNC('week', watched_at)
    WITH DATA;

    CREATE INDEX ON user_engagement_weekly(user_id, week);
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_engagement_weekly;
  `,
};
```

## Video Streaming Optimization

### Adaptive Bitrate Streaming (ABR)
```typescript
export class ABRManager {
  private player: HTMLVideoElement;
  private hls: Hls;
  private bandwidthEstimator: BandwidthEstimator;

  constructor(player: HTMLVideoElement, hls: Hls) {
    this.player = player;
    this.hls = hls;
    this.bandwidthEstimator = new BandwidthEstimator();
    this.setupABR();
  }

  private setupABR(): void {
    this.hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
      const bandwidth = this.bandwidthEstimator.estimate(data.stats);
      this.adjustQuality(bandwidth);
    });

    this.hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        this.handleFatalError(data);
      }
    });
  }

  private adjustQuality(bandwidth: number): void {
    const levels = this.hls.levels;
    const currentLevel = this.hls.currentLevel;

    // Find optimal quality based on bandwidth
    let optimalLevel = 0;
    for (let i = 0; i < levels.length; i++) {
      if (levels[i].bitrate <= bandwidth * 0.8) {
        optimalLevel = i;
      }
    }

    // Only switch if quality difference is significant
    if (Math.abs(optimalLevel - currentLevel) > 1) {
      this.hls.currentLevel = optimalLevel;
    }
  }

  private handleFatalError(error: HlsErrorData): void {
    switch (error.type) {
      case Hls.ErrorTypes.NETWORK_ERROR:
        // Retry network errors
        this.hls.startLoad();
        break;
      case Hls.ErrorTypes.MEDIA_ERROR:
        // Try to recover from media errors
        this.hls.recoverMediaError();
        break;
      default:
        // Fatal error, cannot recover
        console.error('Fatal HLS error:', error);
        break;
    }
  }
}

class BandwidthEstimator {
  private samples: number[] = [];
  private maxSamples = 10;

  estimate(stats: any): number {
    const bandwidth = stats.loaded / (stats.end - stats.start);
    this.samples.push(bandwidth);

    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }

    return this.calculateAverage();
  }

  private calculateAverage(): number {
    if (this.samples.length === 0) return 0;

    // Use harmonic mean for bandwidth estimation
    const sum = this.samples.reduce((a, b) => a + 1 / b, 0);
    return this.samples.length / sum;
  }
}
```

### Video Pre-fetching
```typescript
export class VideoPrefetcher {
  private hls: Hls;
  private prefetchBuffer: number = 3; // Prefetch 3 segments ahead

  constructor(hls: Hls) {
    this.hls = hls;
    this.setupPrefetching();
  }

  private setupPrefetching(): void {
    this.hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
      const currentFrag = data.frag;
      const nextFrags = this.getNextFragments(currentFrag, this.prefetchBuffer);

      for (const frag of nextFrags) {
        this.prefetchFragment(frag);
      }
    });
  }

  private getNextFragments(currentFrag: any, count: number): any[] {
    const fragments: any[] = [];
    let current = currentFrag;

    for (let i = 0; i < count; i++) {
      const next = this.getNextFragment(current);
      if (next) {
        fragments.push(next);
        current = next;
      } else {
        break;
      }
    }

    return fragments;
  }

  private getNextFragment(frag: any): any | null {
    // Get next fragment from HLS manifest
    return this.hls.levels[frag.level].details.fragments[frag.sn + 1] || null;
  }

  private prefetchFragment(frag: any): void {
    // Preload the fragment without playing it
    const url = frag.url;
    const prefetchLink = document.createElement('link');
    prefetchLink.rel = 'prefetch';
    prefetchLink.href = url;
    document.head.appendChild(prefetchLink);
  }
}
```

## Image Optimization

### Responsive Images
```typescript
export class ImageOptimizer {
  private cdnManager: CDNManager;

  constructor(cdnManager: CDNManager) {
    this.cdnManager = cdnManager;
  }

  getResponsiveImageUrl(
    originalUrl: string,
    width: number,
    height: number,
    quality: number = 85
  ): string {
    const params = new URLSearchParams({
      w: width.toString(),
      h: height.toString(),
      q: quality.toString(),
      fm: 'webp',
    });

    return `${originalUrl}?${params.toString()}`;
  }

  getSrcSet(
    originalUrl: string,
    sizes: number[],
    quality: number = 85
  ): string {
    return sizes
      .map(size => {
        const url = this.getResponsiveImageUrl(originalUrl, size, 0, quality);
        return `${url} ${size}w`;
      })
      .join(', ');
  }

  async optimizeImage(
    file: File,
    options: ImageOptimizationOptions
  ): Promise<OptimizedImage> {
    const image = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('Failed to get canvas context');

    // Resize image
    const { width, height } = this.calculateDimensions(
      image.width,
      image.height,
      options.maxWidth,
      options.maxHeight
    );

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);

    // Convert to WebP
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', options.quality / 100);
    });

    return {
      url: URL.createObjectURL(blob),
      width,
      height,
      size: blob.size,
      format: 'webp',
    };
  }

  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth?: number,
    maxHeight?: number
  ): { width: number; height: number } {
    let width = originalWidth;
    let height = originalHeight;

    if (maxWidth && width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }

    if (maxHeight && height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }

    return { width: Math.round(width), height: Math.round(height) };
  }
}
```

## API Response Optimization

### Response Compression
```typescript
export class ResponseCompressor {
  private compressionThreshold = 1024; // 1KB

  shouldCompress(response: Response): boolean {
    const contentType = response.headers.get('content-type');
    const size = parseInt(response.headers.get('content-length') || '0');

    // Compress only text-based content
    const isCompressible = contentType?.match(
      /text\/|application\/json|application\/xml|application\/javascript/
    );

    return isCompressible && size > this.compressionThreshold;
  }

  async compress(data: string, algorithm: 'gzip' | 'br' = 'br'): Promise<Buffer> {
    if (algorithm === 'gzip') {
      return await gzip(data);
    } else {
      return await brotliCompress(data);
    }
  }
}
```

### Response Pagination
```typescript
export class PaginationHelper {
  static paginate<T>(
    data: T[],
    page: number,
    limit: number
  ): PaginatedResponse<T> {
    const offset = (page - 1) * limit;
    const paginatedData = data.slice(offset, offset + limit);

    return {
      data: paginatedData,
      meta: {
        page,
        limit,
        total: data.length,
        totalPages: Math.ceil(data.length / limit),
        hasNext: offset + limit < data.length,
        hasPrev: page > 1,
      },
    };
  }

  static getCursorPagination<T>(
    data: T[],
    cursor?: string,
    limit: number = 20
  ): CursorPaginatedResponse<T> {
    const index = cursor ? data.findIndex(item => item.id === cursor) : 0;
    const paginatedData = data.slice(index, index + limit);

    return {
      data: paginatedData,
      meta: {
        cursor: paginatedData[paginatedData.length - 1]?.id,
        hasMore: index + limit < data.length,
      },
    };
  }
}
```

## Performance Monitoring

### Real-time Monitoring
```typescript
export class PerformanceMonitor {
  private metrics: Map<string, Metric> = new Map();
  private alertThresholds: AlertThresholds;

  constructor(thresholds: AlertThresholds) {
    this.alertThresholds = thresholds;
    this.startMonitoring();
  }

  private startMonitoring(): void {
    // Monitor API response times
    setInterval(() => this.checkAPIMetrics(), 60000);
    
    // Monitor database performance
    setInterval(() => this.checkDatabaseMetrics(), 60000);
    
    // Monitor cache performance
    setInterval(() => this.checkCacheMetrics(), 60000);
    
    // Monitor CDN performance
    setInterval(() => this.checkCDNMetrics(), 60000);
  }

  recordMetric(name: string, value: number): void {
    const metric = this.metrics.get(name) || {
      name,
      values: [],
      sum: 0,
      count: 0,
    };

    metric.values.push(value);
    metric.sum += value;
    metric.count++;

    // Keep only last 1000 values
    if (metric.values.length > 1000) {
      const removed = metric.values.shift();
      metric.sum -= removed;
      metric.count--;
    }

    this.metrics.set(name, metric);

    // Check thresholds
    this.checkThreshold(name, value);
  }

  private checkThreshold(name: string, value: number): void {
    const threshold = this.alertThresholds[name];
    if (threshold && value > threshold) {
      this.sendAlert(name, value, threshold);
    }
  }

  private sendAlert(metricName: string, value: number, threshold: number): void {
    sendAlert({
      type: 'performance',
      metric: metricName,
      value,
      threshold,
      message: `${metricName} exceeded threshold: ${value} > ${threshold}`,
      severity: 'warning',
    });
  }

  getMetricStats(name: string): MetricStats | null {
    const metric = this.metrics.get(name);
    if (!metric) return null;

    const values = metric.values;
    const sorted = [...values].sort((a, b) => a - b);

    return {
      name,
      count: metric.count,
      sum: metric.sum,
      average: metric.sum / metric.count,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  private async checkAPIMetrics(): Promise<void> {
    const stats = await getAPIStats();
    this.recordMetric('api_response_time_p95', stats.p95);
    this.recordMetric('api_error_rate', stats.errorRate);
    this.recordMetric('api_requests_per_second', stats.rps);
  }

  private async checkDatabaseMetrics(): Promise<void> {
    const stats = await getDatabaseStats();
    this.recordMetric('db_query_time_p95', stats.p95);
    this.recordMetric('db_connection_pool_usage', stats.poolUsage);
    this.recordMetric('db_slow_queries', stats.slowQueries);
  }

  private async checkCacheMetrics(): Promise<void> {
    const stats = await getCacheStats();
    this.recordMetric('cache_hit_ratio', stats.hitRatio);
    this.recordMetric('cache_memory_usage', stats.memoryUsage);
  }

  private async checkCDNMetrics(): Promise<void> {
    const stats = await getCDNStats();
    this.recordMetric('cdn_hit_ratio', stats.hitRatio);
    this.recordMetric('cdn_bandwidth', stats.bandwidth);
    this.recordMetric('cdn_latency', stats.latency);
  }
}
```

## Auto-scaling Configuration

### Horizontal Pod Autoscaler (HPA)
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: streamflix-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: streamflix-api
  minReplicas: 4
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 4
        periodSeconds: 30
      selectPolicy: Max
```

## Technology Stack Summary

| Category | Technology | Purpose |
|----------|-----------|---------|
| CDN | CloudFront, Fastly, Akamai | Content delivery |
| Cache | Redis, Memcached | Application caching |
| Load Balancer | AWS ALB, NGINX | Traffic distribution |
| Database | PostgreSQL with PgBouncer | Connection pooling |
| Monitoring | Prometheus, Grafana | Performance tracking |
| APM | New Relic, Datadog | Application monitoring |
| Compression | Brotli, Gzip | Response compression |
| Image Optimization | Sharp, Cloudinary | Image processing |
| Video Optimization | AWS MediaConvert, FFmpeg | Video transcoding |
| Auto-scaling | Kubernetes HPA | Automatic scaling |
