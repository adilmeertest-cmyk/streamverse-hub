# Enterprise Content Ingestion System for StreamFlix Platform

## Overview
This document describes the content ingestion system that imports metadata from approved and licensed APIs, supports scheduled syncing, and provides configurable content sources from the admin panel.

## Architecture

### Ingestion Pipeline
```
Content Sources
├── External APIs
│   ├── TMDb (The Movie Database)
│   ├── JustWatch
│   ├── IMDb
│   ├── TVDB
│   ├── Anime APIs (MAL, Kitsu, AniList)
│   └── Custom/Licensed APIs
├── Manual Upload
│   ├── CSV Import
│   ├── JSON Import
│   └── XML Import
├── Scheduled Jobs
│   ├── Daily Sync
│   ├── Weekly Sync
│   └── Custom Schedules
└── Webhooks
    ├── Content Updates
    ├── New Releases
    └── License Expirations

Processing Pipeline
├── Data Validation
├── Data Transformation
├── Deduplication
├── Quality Checks
├── Metadata Enrichment
└── Database Storage
```

## Supported Content Sources

### 1. TMDb (The Movie Database)
```typescript
interface TMDbConfig {
  apiKey: string;
  baseUrl: string;
  includeAdult: boolean;
  language: string;
  region: string;
}

export class TMDbIngestion {
  private config: TMDbConfig;

  constructor(config: TMDbConfig) {
    this.config = config;
  }

  async fetchMovie(tmdbId: number): Promise<TMDbMovie> {
    const response = await fetch(
      `${this.config.baseUrl}/movie/${tmdbId}?api_key=${this.config.apiKey}&append_to_response=credits,videos,images,similar,recommendations`
    );
    return response.json();
  }

  async fetchTVSeries(tmdbId: number): Promise<TMDbTV> {
    const response = await fetch(
      `${this.config.baseUrl}/tv/${tmdbId}?api_key=${this.config.apiKey}&append_to_response=credits,videos,images,similar,recommendations`
    );
    return response.json();
  }

  async fetchTrending(type: 'movie' | 'tv', timeWindow: 'day' | 'week'): Promise<TMDbItem[]> {
    const response = await fetch(
      `${this.config.baseUrl}/trending/${type}/${timeWindow}?api_key=${this.config.apiKey}`
    );
    const data = await response.json();
    return data.results;
  }

  async fetchPopular(type: 'movie' | 'tv', page: number = 1): Promise<TMDbItem[]> {
    const response = await fetch(
      `${this.config.baseUrl}/${type}/popular?api_key=${this.config.apiKey}&page=${page}`
    );
    const data = await response.json();
    return data.results;
  }

  async search(query: string, type?: 'movie' | 'tv'): Promise<TMDbItem[]> {
    const url = type
      ? `${this.config.baseUrl}/search/${type}?api_key=${this.config.apiKey}&query=${encodeURIComponent(query)}`
      : `${this.config.baseUrl}/search/multi?api_key=${this.config.apiKey}&query=${encodeURIComponent(query)}`;
    
    const response = await fetch(url);
    const data = await response.json();
    return data.results;
  }

  async fetchGenres(): Promise<TMDbGenre[]> {
    const response = await fetch(
      `${this.config.baseUrl}/genre/movie/list?api_key=${this.config.apiKey}`
    );
    const data = await response.json();
    return data.genres;
  }

  async fetchSeason(tvId: number, seasonNumber: number): Promise<TMDbSeason> {
    const response = await fetch(
      `${this.config.baseUrl}/tv/${tvId}/season/${seasonNumber}?api_key=${this.config.apiKey}`
    );
    return response.json();
  }

  transformToTitle(movie: TMDbMovie): Title {
    return {
      id: generateUUID(),
      slug: generateSlug(movie.title, movie.release_date),
      kind: 'movie',
      title: movie.title,
      originalTitle: movie.original_title,
      tagline: movie.tagline,
      synopsis: movie.overview,
      releaseDate: movie.release_date,
      releaseYear: new Date(movie.release_date).getFullYear(),
      runtime: movie.runtime,
      ageRating: this.mapRating(movie.adult),
      posterUrl: this.getImageUrl(movie.poster_path, 'w500'),
      backdropUrl: this.getImageUrl(movie.backdrop_path, 'w780'),
      trailerUrl: this.getTrailerUrl(movie.videos?.results),
      genres: this.mapGenres(movie.genre_ids),
      cast: movie.credits?.cast?.slice(0, 10).map(c => c.name) || [],
      directors: movie.credits?.crew?.filter(c => c.job === 'Director').map(c => c.name) || [],
      tmdbId: movie.id,
      popularityScore: movie.popularity,
      voteAverage: movie.vote_average,
      voteCount: movie.vote_count,
      isPublished: true,
      isPremium: false,
      isFeatured: false,
      isTrending: false,
      status: 'published',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private getImageUrl(path: string | null, size: string): string | null {
    if (!path) return null;
    return `https://image.tmdb.org/t/p/${size}${path}`;
  }

  private getTrailerUrl(videos: TMDbVideo[] | undefined): string | null {
    const trailer = videos?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
  }

  private mapRating(adult: boolean): string {
    return adult ? 'R' : 'PG-13';
  }

  private mapGenres(genreIds: number[]): string[] {
    const genreMap: Record<number, string> = {
      28: 'action',
      12: 'adventure',
      16: 'animation',
      35: 'comedy',
      80: 'crime',
      99: 'documentary',
      18: 'drama',
      10751: 'family',
      14: 'fantasy',
      36: 'history',
      27: 'horror',
      10402: 'music',
      9648: 'mystery',
      10749: 'romance',
      878: 'sci-fi',
      10770: 'tv-movie',
      53: 'thriller',
      10752: 'war',
      37: 'western',
    };
    return genreIds.map(id => genreMap[id]).filter(Boolean) as string[];
  }
}
```

### 2. Anime APIs
```typescript
interface AnimeAPIConfig {
  malClientId?: string;
  kitsuClientId?: string;
  anilistClientId?: string;
}

export class AnimeIngestion {
  private config: AnimeAPIConfig;

  constructor(config: AnimeAPIConfig) {
    this.config = config;
  }

  async fetchFromMAL(malId: number): Promise<MALAnime> {
    const response = await fetch(`https://api.myanimelist.net/v2/anime/${malId}`, {
      headers: {
        'X-MAL-CLIENT-ID': this.config.malClientId,
      },
    });
    return response.json();
  }

  async fetchFromKitsu(kitsuId: number): Promise<KitsuAnime> {
    const response = await fetch(`https://kitsu.io/api/edge/anime/${kitsuId}`);
    return response.json();
  }

  async fetchFromAniList(anilistId: number): Promise<AniListAnime> {
    const query = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          title { romaji english native }
          description
          episodes
          status
          startDate { year month day }
          endDate { year month day }
          genres { name }
          studios { nodes { name } }
          averageScore
          popularity
          coverImage { large }
          bannerImage
        }
      }
    `;
    
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { id: anilistId },
      }),
    });
    const data = await response.json();
    return data.data.Media;
  }

  transformToTitle(anime: AniListAnime): Anime {
    return {
      id: generateUUID(),
      slug: generateSlug(anime.title.english || anime.title.romaji),
      title: anime.title.english || anime.title.romaji,
      originalTitle: anime.title.romaji,
      synopsis: anime.description,
      type: this.mapType(anime.format),
      sourceMaterial: anime.source,
      episodes: anime.episodes,
      status: this.mapStatus(anime.status),
      airingStatus: this.mapAiringStatus(anime.status),
      airedFrom: anime.startDate ? new Date(anime.startDate.year, anime.startDate.month - 1, anime.startDate.day) : undefined,
      airedTo: anime.endDate ? new Date(anime.endDate.year, anime.endDate.month - 1, anime.endDate.day) : undefined,
      studios: anime.studios?.nodes.map(s => s.name) || [],
      genres: anime.genres?.map(g => g.name) || [],
      posterUrl: anime.coverImage.large,
      backdropUrl: anime.bannerImage,
      isExclusive: false,
      isPremium: false,
      isPublished: true,
      popularityScore: anime.popularity,
      rating: anime.averageScore ? `${anime.averageScore}/10` : undefined,
      anilistId: anime.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private mapType(format: string): 'tv' | 'movie' | 'ova' | 'special' {
    const typeMap: Record<string, 'tv' | 'movie' | 'ova' | 'special'> = {
      'TV': 'tv',
      'MOVIE': 'movie',
      'OVA': 'ova',
      'SPECIAL': 'special',
      'ONA': 'tv',
      'TV_SHORT': 'tv',
    };
    return typeMap[format] || 'tv';
  }

  private mapStatus(status: string): 'airing' | 'completed' | 'upcoming' {
    const statusMap: Record<string, 'airing' | 'completed' | 'upcoming'> = {
      'RELEASING': 'airing',
      'FINISHED': 'completed',
      'NOT_YET_RELEASED': 'upcoming',
      'CANCELLED': 'completed',
    };
    return statusMap[status] || 'completed';
  }

  private mapAiringStatus(status: string): 'airing' | 'completed' | 'upcoming' {
    return this.mapStatus(status);
  }
}
```

### 3. Custom API Integration
```typescript
interface CustomAPIConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  headers?: Record<string, string>;
  mapping: FieldMapping;
  rateLimit?: {
    requests: number;
    period: number; // milliseconds
  };
}

interface FieldMapping {
  id: string;
  title: string;
  slug?: string;
  kind?: string;
  synopsis?: string;
  releaseDate?: string;
  posterUrl?: string;
  backdropUrl?: string;
  videoUrl?: string;
  genres?: string;
  cast?: string;
  directors?: string;
  [key: string]: string | undefined;
}

export class CustomAPIIngestion {
  private config: CustomAPIConfig;
  private rateLimiter: RateLimiter;

  constructor(config: CustomAPIConfig) {
    this.config = config;
    this.rateLimiter = new RateLimiter(
      config.rateLimit?.requests || 100,
      config.rateLimit?.period || 60000
    );
  }

  async fetchItem(itemId: string): Promise<any> {
    await this.rateLimiter.wait();

    const headers = {
      ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      ...this.config.headers,
    };

    const response = await fetch(
      `${this.config.baseUrl}/${itemId}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async fetchList(params?: Record<string, any>): Promise<any[]> {
    await this.rateLimiter.wait();

    const headers = {
      ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      ...this.config.headers,
    };

    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${this.config.baseUrl}${queryString ? `?${queryString}` : ''}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  transformToTitle(data: any): Title {
    const mapping = this.config.mapping;
    
    return {
      id: generateUUID(),
      slug: mapping.slug ? this.getField(data, mapping.slug) : generateSlug(this.getField(data, mapping.title)),
      kind: mapping.kind ? this.getField(data, mapping.kind) as TitleKind : 'movie',
      title: this.getField(data, mapping.title),
      synopsis: mapping.synopsis ? this.getField(data, mapping.synopsis) : undefined,
      releaseDate: mapping.releaseDate ? this.getField(data, mapping.releaseDate) : undefined,
      posterUrl: mapping.posterUrl ? this.getField(data, mapping.posterUrl) : undefined,
      backdropUrl: mapping.backdropUrl ? this.getField(data, mapping.backdropUrl) : undefined,
      videoUrl: mapping.videoUrl ? this.getField(data, mapping.videoUrl) : undefined,
      genres: mapping.genres ? this.parseArray(this.getField(data, mapping.genres)) : [],
      cast: mapping.cast ? this.parseArray(this.getField(data, mapping.cast)) : [],
      directors: mapping.directors ? this.parseArray(this.getField(data, mapping.directors)) : [],
      isPublished: true,
      isPremium: false,
      isFeatured: false,
      isTrending: false,
      status: 'published',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private getField(data: any, path: string): any {
    return path.split('.').reduce((obj, key) => obj?.[key], data);
  }

  private parseArray(value: any): string[] {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(s => s.trim());
    return [];
  }
}

class RateLimiter {
  private requests: number;
  private period: number;
  private queue: Array<() => void> = [];

  constructor(requests: number, period: number) {
    this.requests = requests;
    this.period = period;
    this.startTimer();
  }

  async wait(): Promise<void> {
    return new Promise(resolve => {
      this.queue.push(resolve);
    });
  }

  private startTimer(): void {
    setInterval(() => {
      this.requests = this.requests || 0;
      const toProcess = Math.min(this.queue.length, this.requests);
      for (let i = 0; i < toProcess; i++) {
        const resolve = this.queue.shift();
        if (resolve) resolve();
      }
    }, this.period / this.requests);
  }
}
```

## Scheduled Sync System

### Job Scheduling
```typescript
interface SyncSchedule {
  id: string;
  sourceId: string;
  sourceType: 'tmdb' | 'anime' | 'custom';
  schedule: string; // Cron expression
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  config: SyncConfig;
}

interface SyncConfig {
  syncType: 'trending' | 'popular' | 'specific' | 'full';
  limit?: number;
  filters?: Record<string, string>;
  autoPublish?: boolean;
  notifyOnComplete?: boolean;
}

export class SyncScheduler {
  private schedules: Map<string, SyncSchedule> = new Map();

  addSchedule(schedule: SyncSchedule): void {
    this.schedules.set(schedule.id, schedule);
    this.scheduleNextRun(schedule);
  }

  removeSchedule(scheduleId: string): void {
    const schedule = this.schedules.get(scheduleId);
    if (schedule) {
      this.schedules.delete(scheduleId);
      // Clear any scheduled job
    }
  }

  updateSchedule(scheduleId: string, updates: Partial<SyncSchedule>): void {
    const schedule = this.schedules.get(scheduleId);
    if (schedule) {
      const updated = { ...schedule, ...updates };
      this.schedules.set(scheduleId, updated);
      this.scheduleNextRun(updated);
    }
  }

  private scheduleNextRun(schedule: SyncSchedule): void {
    if (!schedule.enabled) return;

    const nextRun = this.getNextRunTime(schedule.schedule);
    schedule.nextRun = nextRun;

    const delay = nextRun.getTime() - Date.now();
    setTimeout(() => this.executeSchedule(schedule), delay);
  }

  private getNextRunTime(cronExpression: string): Date {
    // Parse cron expression and calculate next run time
    // This would use a library like 'node-cron'
    return new Date(Date.now() + 60000); // Placeholder
  }

  private async executeSchedule(schedule: SyncSchedule): Promise<void> {
    try {
      schedule.lastRun = new Date();
      
      const result = await this.runSync(schedule);
      
      if (schedule.config.notifyOnComplete) {
        await this.notifyCompletion(schedule, result);
      }

      // Schedule next run
      this.scheduleNextRun(schedule);
    } catch (error) {
      console.error(`Sync schedule ${schedule.id} failed:`, error);
      // Schedule retry
      setTimeout(() => this.executeSchedule(schedule), 60000); // Retry in 1 minute
    }
  }

  private async runSync(schedule: SyncSchedule): Promise<SyncResult> {
    const source = this.getSource(schedule.sourceType, schedule.sourceId);
    
    switch (schedule.config.syncType) {
      case 'trending':
        return await this.syncTrending(source, schedule.config);
      case 'popular':
        return await this.syncPopular(source, schedule.config);
      case 'specific':
        return await this.syncSpecific(source, schedule.config);
      case 'full':
        return await this.syncFull(source, schedule.config);
      default:
        throw new Error(`Unknown sync type: ${schedule.config.syncType}`);
    }
  }

  private async syncTrending(
    source: any,
    config: SyncConfig
  ): Promise<SyncResult> {
    const items = await source.fetchTrending('movie', 'week');
    const results = {
      total: items.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ item: any; error: string }>,
    };

    for (const item of items.slice(0, config.limit || 10)) {
      try {
        const title = source.transformToTitle(item);
        await this.saveTitle(title, config.autoPublish);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({ item, error: error.message });
      }
    }

    return results;
  }

  private async syncPopular(
    source: any,
    config: SyncConfig
  ): Promise<SyncResult> {
    const items = await source.fetchPopular('movie', 1);
    const results = {
      total: items.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ item: any; error: string }>,
    };

    for (const item of items.slice(0, config.limit || 20)) {
      try {
        const title = source.transformToTitle(item);
        await this.saveTitle(title, config.autoPublish);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({ item, error: error.message });
      }
    }

    return results;
  }

  private async saveTitle(title: Title, autoPublish: boolean): Promise<void> {
    // Check if title already exists
    const existing = await getTitleBySlug(title.slug);
    
    if (existing) {
      // Update existing title
      await updateTitle(existing.id, title);
    } else {
      // Create new title
      await createTitle(title);
    }
  }

  private async notifyCompletion(
    schedule: SyncSchedule,
    result: SyncResult
  ): Promise<void> {
    // Send notification to admins
    const admins = await getAdminUsers();
    
    for (const admin of admins) {
      await sendNotification(admin.id, {
        type: 'sync_completed',
        title: 'Content sync completed',
        body: `Sync ${schedule.id} completed: ${result.successful} successful, ${result.failed} failed`,
        link: '/admin/content/sync',
      });
    }
  }

  private getSource(sourceType: string, sourceId: string): any {
    // Return appropriate source instance
    switch (sourceType) {
      case 'tmdb':
        return new TMDbIngestion(/* config */);
      case 'anime':
        return new AnimeIngestion(/* config */);
      case 'custom':
        return new CustomAPIIngestion(/* config */);
      default:
        throw new Error(`Unknown source type: ${sourceType}`);
    }
  }
}
```

## Admin Panel Configuration

### Source Management UI
```typescript
export const ContentSourcesManager = () => {
  const { data: sources } = useQuery({
    queryKey: ['content-sources'],
    queryFn: fetchContentSources,
  });

  const addSourceMutation = useMutation({
    mutationFn: (source: ContentSource) => addContentSource(source),
    onSuccess: () => {
      queryClient.invalidateQueries(['content-sources']);
      toast.success('Source added successfully');
    },
  });

  const testSourceMutation = useMutation({
    mutationFn: (sourceId: string) => testContentSource(sourceId),
  });

  return (
    <div className="content-sources-manager">
      <div className="manager-header">
        <h1>Content Sources</h1>
        <Button onClick={() => setShowAddDialog(true)}>
          Add Source
        </Button>
      </div>

      <div className="sources-list">
        {sources?.map((source) => (
          <SourceCard
            key={source.id}
            source={source}
            onTest={() => testSourceMutation.mutate(source.id)}
            onEdit={() => editSource(source)}
            onDelete={() => deleteSource(source.id)}
          />
        ))}
      </div>

      <AddSourceDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdd={(source) => addSourceMutation.mutate(source)}
      />
    </div>
  );
};

const SourceCard = ({ source, onTest, onEdit, onDelete }: SourceCardProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{source.name}</CardTitle>
            <CardDescription>{source.type}</CardDescription>
          </div>
          <Badge variant={source.enabled ? 'default' : 'secondary'}>
            {source.enabled ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-sm">
            <span className="font-semibold">URL:</span> {source.baseUrl}
          </div>
          <div className="text-sm">
            <span className="font-semibold">Last Sync:</span>{' '}
            {source.lastSync ? formatDate(source.lastSync) : 'Never'}
          </div>
          <div className="text-sm">
            <span className="font-semibold">Next Sync:</span>{' '}
            {source.nextSync ? formatDate(source.nextSync) : 'Not scheduled'}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onTest}>
            Test Connection
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            Configure
          </Button>
          <Button variant="outline" size="sm" onClick={() => toggleSource(source.id)}>
            {source.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
```

### Sync Configuration UI
```typescript
export const SyncConfiguration = ({ sourceId }: { sourceId: string }) => {
  const { data: source } = useQuery({
    queryKey: ['content-source', sourceId],
    queryFn: () => fetchContentSource(sourceId),
  });

  const [schedule, setSchedule] = useState(source?.schedule || '0 0 * * *');
  const [syncType, setSyncType] = useState<'trending' | 'popular' | 'specific' | 'full'>('trending');
  const [limit, setLimit] = useState(10);
  const [autoPublish, setAutoPublish] = useState(false);

  const updateConfigMutation = useMutation({
    mutationFn: (config: SyncConfig) => updateSourceSyncConfig(sourceId, config),
    onSuccess: () => {
      queryClient.invalidateQueries(['content-source', sourceId]);
      toast.success('Sync configuration updated');
    },
  });

  const runSyncMutation = useMutation({
    mutationFn: () => runManualSync(sourceId),
    onSuccess: () => {
      toast.success('Sync completed successfully');
    },
  });

  return (
    <div className="sync-configuration">
      <h2>Sync Configuration</h2>
      
      <div className="space-y-4">
        <div>
          <Label>Sync Type</Label>
          <Select value={syncType} onValueChange={setSyncType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trending">Trending Content</SelectItem>
              <SelectItem value="popular">Popular Content</SelectItem>
              <SelectItem value="specific">Specific Items</SelectItem>
              <SelectItem value="full">Full Sync</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Schedule (Cron)</Label>
          <Input
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            placeholder="0 0 * * *"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Cron expression for sync schedule (e.g., "0 0 * * *" for daily at midnight)
          </p>
        </div>

        <div>
          <Label>Limit</Label>
          <Input
            type="number"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            min={1}
            max={100}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="auto-publish"
            checked={autoPublish}
            onCheckedChange={setAutoPublish}
          />
          <Label htmlFor="auto-publish">Auto-publish synced content</Label>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => updateConfigMutation.mutate({ schedule, syncType, limit, autoPublish })}>
            Save Configuration
          </Button>
          <Button variant="outline" onClick={() => runSyncMutation.mutate()}>
            Run Sync Now
          </Button>
        </div>
      </div>
    </div>
  );
};
```

## Data Validation

### Validation Pipeline
```typescript
export class ContentValidator {
  async validateTitle(title: Title): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields
    if (!title.title || title.title.trim().length === 0) {
      errors.push({ field: 'title', message: 'Title is required' });
    }

    if (!title.kind) {
      errors.push({ field: 'kind', message: 'Kind is required' });
    }

    if (!title.slug || title.slug.trim().length === 0) {
      errors.push({ field: 'slug', message: 'Slug is required' });
    } else if (!isValidSlug(title.slug)) {
      errors.push({ field: 'slug', message: 'Slug must contain only lowercase letters, numbers, and hyphens' });
    }

    // Optional but recommended fields
    if (!title.synopsis || title.synopsis.trim().length === 0) {
      warnings.push({ field: 'synopsis', message: 'Synopsis is recommended' });
    }

    if (!title.posterUrl) {
      warnings.push({ field: 'posterUrl', message: 'Poster URL is recommended' });
    }

    // Data format validation
    if (title.releaseDate && !isValidDate(title.releaseDate)) {
      errors.push({ field: 'releaseDate', message: 'Invalid date format' });
    }

    if (title.runtime && (title.runtime < 0 || title.runtime > 1000)) {
      errors.push({ field: 'runtime', message: 'Runtime must be between 0 and 1000 minutes' });
    }

    // URL validation
    if (title.posterUrl && !isValidUrl(title.posterUrl)) {
      errors.push({ field: 'posterUrl', message: 'Invalid poster URL' });
    }

    if (title.videoUrl && !isValidUrl(title.videoUrl)) {
      errors.push({ field: 'videoUrl', message: 'Invalid video URL' });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async validateUniqueness(title: Title): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // Check slug uniqueness
    const existingBySlug = await getTitleBySlug(title.slug);
    if (existingBySlug && existingBySlug.id !== title.id) {
      errors.push({ field: 'slug', message: 'Slug must be unique' });
    }

    // Check title uniqueness within same kind and year
    const existingByTitle = await getTitleByNameAndYear(title.title, title.releaseYear);
    if (existingByTitle && existingByTitle.id !== title.id) {
      errors.push({ field: 'title', message: 'Title with same name and year already exists' });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  async validateMediaAssets(title: Title): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check if media assets are accessible
    if (title.posterUrl) {
      try {
        const response = await fetch(title.posterUrl, { method: 'HEAD' });
        if (!response.ok) {
          errors.push({ field: 'posterUrl', message: 'Poster URL is not accessible' });
        }
      } catch (error) {
        errors.push({ field: 'posterUrl', message: 'Failed to validate poster URL' });
      }
    }

    if (title.videoUrl) {
      try {
        const response = await fetch(title.videoUrl, { method: 'HEAD' });
        if (!response.ok) {
          errors.push({ field: 'videoUrl', message: 'Video URL is not accessible' });
        }
      } catch (error) {
        errors.push({ field: 'videoUrl', message: 'Failed to validate video URL' });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  field: string;
  message: string;
}

interface ValidationWarning {
  field: string;
  message: string;
}
```

## Deduplication System

### Duplicate Detection
```typescript
export class DuplicateDetector {
  async findDuplicates(title: Title): Promise<DuplicateMatch[]> {
    const matches: DuplicateMatch[] = [];

    // Exact title match
    const exactMatches = await findTitlesByName(title.title);
    for (const match of exactMatches) {
      if (match.id !== title.id) {
        matches.push({
          title: match,
          confidence: 1.0,
          reason: 'Exact title match',
        });
      }
    }

    // Similar title (fuzzy match)
    const similarTitles = await searchTitles(title.title);
    for (const match of similarTitles) {
      if (match.id !== title.id && match.title !== title.title) {
        const similarity = calculateStringSimilarity(title.title, match.title);
        if (similarity > 0.8) {
          matches.push({
            title: match,
            confidence: similarity,
            reason: 'Similar title',
          });
        }
      }
    }

    // Same release year
    if (title.releaseYear) {
      const yearMatches = await findTitlesByYear(title.releaseYear);
      for (const match of yearMatches) {
        if (match.id !== title.id) {
          const similarity = calculateStringSimilarity(title.title, match.title);
          if (similarity > 0.6) {
            matches.push({
              title: match,
              confidence: similarity * 0.8,
              reason: 'Same release year',
            });
          }
        }
      }
    }

    // External ID match
    if (title.tmdbId) {
      const tmdbMatch = await findTitleByTMDbId(title.tmdbId);
      if (tmdbMatch && tmdbMatch.id !== title.id) {
        matches.push({
          title: tmdbMatch,
          confidence: 1.0,
          reason: 'TMDb ID match',
        });
      }
    }

    // Sort by confidence and return top matches
    return matches
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);
  }

  async mergeDuplicates(
    primaryId: string,
    duplicateIds: string[],
    strategy: MergeStrategy
  ): Promise<void> {
    const primary = await getTitle(primaryId);
    const duplicates = await Promise.all(
      duplicateIds.map(id => getTitle(id))
    );

    for (const duplicate of duplicates) {
      switch (strategy) {
        case 'keep_primary':
          // Keep primary, delete duplicates
          await deleteTitle(duplicate.id);
          break;
        case 'merge_data':
          // Merge data from duplicates into primary
          await mergeTitleData(primary, duplicate);
          await deleteTitle(duplicate.id);
          break;
        case 'keep_all':
          // Keep all, mark as related
          await markAsRelated(primary.id, duplicate.id);
          break;
      }
    }
  }
}

interface DuplicateMatch {
  title: Title;
  confidence: number;
  reason: string;
}

type MergeStrategy = 'keep_primary' | 'merge_data' | 'keep_all';
```

## Ingestion API Endpoints

### Source Management
```typescript
// GET /admin/api/ingestion/sources
export const fetchContentSources = async (): Promise<ContentSource[]> => {
  const response = await fetch('/admin/api/ingestion/sources');
  return response.json();
};

// POST /admin/api/ingestion/sources
export const addContentSource = async (source: ContentSource): Promise<ContentSource> => {
  const response = await fetch('/admin/api/ingestion/sources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(source),
  });
  return response.json();
};

// PUT /admin/api/ingestion/sources/:id
export const updateContentSource = async (
  id: string,
  source: Partial<ContentSource>
): Promise<ContentSource> => {
  const response = await fetch(`/admin/api/ingestion/sources/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(source),
  });
  return response.json();
};

// DELETE /admin/api/ingestion/sources/:id
export const deleteContentSource = async (id: string): Promise<void> => {
  await fetch(`/admin/api/ingestion/sources/${id}`, {
    method: 'DELETE',
  });
};

// POST /admin/api/ingestion/sources/:id/test
export const testContentSource = async (id: string): Promise<TestResult> => {
  const response = await fetch(`/admin/api/ingestion/sources/${id}/test`, {
    method: 'POST',
  });
  return response.json();
};
```

### Sync Operations
```typescript
// POST /admin/api/ingestion/sync/:sourceId
export const runManualSync = async (sourceId: string): Promise<SyncResult> => {
  const response = await fetch(`/admin/api/ingestion/sync/${sourceId}`, {
    method: 'POST',
  });
  return response.json();
};

// GET /admin/api/ingestion/sync/:sourceId/status
export const getSyncStatus = async (sourceId: string): Promise<SyncStatus> => {
  const response = await fetch(`/admin/api/ingestion/sync/${sourceId}/status`);
  return response.json();
};

// POST /admin/api/ingestion/sync/:sourceId/config
export const updateSourceSyncConfig = async (
  sourceId: string,
  config: SyncConfig
): Promise<void> => {
  await fetch(`/admin/api/ingestion/sync/${sourceId}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
};
```

### Content Import
```typescript
// POST /admin/api/ingestion/import/tmdb
export const importFromTMDb = async (tmdbId: number, type: 'movie' | 'tv'): Promise<ImportResult> => {
  const response = await fetch('/admin/api/ingestion/import/tmdb', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tmdbId, type }),
  });
  return response.json();
};

// POST /admin/api/ingestion/import/anime
export const importFromAnime = async (
  animeId: number,
  source: 'mal' | 'kitsu' | 'anilist'
): Promise<ImportResult> => {
  const response = await fetch('/admin/api/ingestion/import/anime', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ animeId, source }),
  });
  return response.json();
};

// POST /admin/api/ingestion/import/bulk
export const bulkImport = async (
  file: File,
  sourceId: string,
  options: ImportOptions
): Promise<ImportResult> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('sourceId', sourceId);
  formData.append('options', JSON.stringify(options));

  const response = await fetch('/admin/api/ingestion/import/bulk', {
    method: 'POST',
    body: formData,
  });
  return response.json();
};
```

## Technology Stack Summary

| Category | Technology | Purpose |
|----------|-----------|---------|
| HTTP Client | Axios/Fetch | API requests |
| Rate Limiting | Custom implementation | API rate limiting |
| Scheduling | node-cron | Job scheduling |
| Validation | Zod | Schema validation |
| Deduplication | string-similarity | Fuzzy matching |
| Queue | RabbitMQ | Background jobs |
| Database | PostgreSQL | Source configuration |
| Cache | Redis | Sync status caching |
| Monitoring | Custom + Sentry | Error tracking |
