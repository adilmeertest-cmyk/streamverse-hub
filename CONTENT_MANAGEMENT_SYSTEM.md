# Enterprise Content Management System for StreamFlix Platform

## Overview
This document describes the comprehensive content management system (CMS) for managing movies, TV shows, dramas, cartoons, anime, documentaries, and live streams with bulk operations support.

## CMS Architecture

### Core Components
```
Content Management System
├── Content Repository
│   ├── Titles
│   ├── Episodes
│   ├── Seasons
│   ├── Categories
│   ├── Genres
│   └── Collections
├── Media Management
│   ├── Video Storage
│   ├── Image Storage
│   ├── Subtitle Management
│   └── Thumbnail Generation
├── Content Ingestion
│   ├── API Integrations
│   ├── Bulk Import
│   ├── Scheduled Sync
│   └── Manual Entry
├── Content Publishing
│   ├── Workflow States
│   ├── Approval Process
│   ├── Scheduling
│   └── Versioning
└── Analytics & Reporting
    ├── Content Performance
    ├── User Engagement
    ├── Revenue Tracking
    └── Quality Metrics
```

## Content Types

### 1. Movies
```typescript
interface Movie {
  id: string;
  slug: string;
  title: string;
  originalTitle?: string;
  tagline?: string;
  synopsis: string;
  runtime: number; // minutes
  releaseDate: Date;
  releaseYear: number;
  ageRating: string;
  contentRating: string;
  originalLanguage: string;
  spokenLanguages: string[];
  genres: string[];
  cast: CastMember[];
  crew: CrewMember[];
  director: string[];
  writer: string[];
  productionCompany: string;
  budget?: number;
  revenue?: number;
  imdbId?: string;
  tmdbId?: number;
  poster: MediaAsset;
  backdrop: MediaAsset;
  trailer?: MediaAsset;
  video: MediaAsset;
  isExclusive: boolean;
  isOriginal: boolean;
  isPremium: boolean;
  isPublished: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  popularityScore: number;
  rating: {
    average: number;
    count: number;
  };
  keywords: string[];
  countries: string[];
  status: 'draft' | 'pending' | 'approved' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}
```

### 2. TV Series
```typescript
interface TVSeries {
  id: string;
  slug: string;
  title: string;
  originalTitle?: string;
  tagline?: string;
  synopsis: string;
  firstAirDate: Date;
  lastAirDate?: Date;
  releaseYear: number;
  ageRating: string;
  contentRating: string;
  originalLanguage: string;
  spokenLanguages: string[];
  genres: string[];
  cast: CastMember[];
  crew: CrewMember[];
  creator: string[];
  network: string[];
  productionCompany: string;
  episodeRuntime: number; // average minutes
  numberOfSeasons: number;
  numberOfEpisodes: number;
  status: 'continuing' | 'ended' | 'cancelled';
  imdbId?: string;
  tmdbId?: number;
  poster: MediaAsset;
  backdrop: MediaAsset;
  trailer?: MediaAsset;
  isExclusive: boolean;
  isOriginal: boolean;
  isPremium: boolean;
  isPublished: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  popularityScore: number;
  rating: {
    average: number;
    count: number;
  };
  keywords: string[];
  countries: string[];
  seasons: Season[];
  status: 'draft' | 'pending' | 'approved' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

interface Season {
  id: string;
  seriesId: string;
  seasonNumber: number;
  name: string;
  overview?: string;
  poster?: MediaAsset;
  airDate: Date;
  episodeCount: number;
  episodes: Episode[];
}
```

### 3. Episodes
```typescript
interface Episode {
  id: string;
  seasonId: string;
  seriesId: string;
  episodeNumber: number;
  title string;
  overview?: string;
  airDate?: Date;
  runtime: number; // minutes
  productionCode?: string;
  stillPath?: MediaAsset;
  video: MediaAsset;
  subtitles: SubtitleTrack[];
  guestStars: CastMember[];
  director: string[];
  writer: string[];
  isPublished: boolean;
  isPremium: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 4. Anime
```typescript
interface Anime {
  id: string;
  slug: string;
  title: string;
  originalTitle?: string;
  synopsis: string;
  type: 'tv' | 'movie' | 'ova' | 'special';
  sourceMaterial: 'manga' | 'original' | 'light_novel' | 'game' | 'other';
  episodes: number;
  status: 'airing' | 'completed' | 'upcoming';
  airingStatus: 'airing' | 'completed' | 'upcoming';
  airedFrom?: Date;
  airedTo?: Date;
  studios: string[];
  genres: string[];
  themes: string[];
  rating: string;
  poster: MediaAsset;
  backdrop: MediaAsset;
  trailer?: MediaAsset;
  video?: MediaAsset;
  isExclusive: boolean;
  isPremium: boolean;
  isPublished: boolean;
  popularityScore: number;
  malId?: number; // MyAnimeList ID
  kitsuId?: number; // Kitsu ID
  anilistId?: number; // AniList ID
  createdAt: Date;
  updatedAt: Date;
}
```

### 5. Documentaries
```typescript
interface Documentary {
  id: string;
  slug: string;
  title: string;
  synopsis: string;
  runtime: number;
  releaseDate: Date;
  releaseYear: number;
  ageRating: string;
  genres: string[];
  director: string[];
  narrator?: string;
  productionCompany: string;
  topics: string[];
  poster: MediaAsset;
  backdrop: MediaAsset;
  trailer?: MediaAsset;
  video: MediaAsset;
  isExclusive: boolean;
  isPremium: boolean;
  isPublished: boolean;
  popularityScore: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### 6. Live Streams
```typescript
interface LiveStream {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnail: MediaAsset;
  streamUrl: string;
  streamKey: string;
  categoryId: string;
  isLive: boolean;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  actualStart?: Date;
  actualEnd?: Date;
  viewerCount: number;
  maxViewers: number;
  chatEnabled: boolean;
  recordingEnabled: boolean;
  recordingUrl?: string;
  isExclusive: boolean;
  isPremium: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## Bulk Operations

### Bulk Import
```typescript
// Bulk import from CSV/JSON
export const bulkImportTitles = async (
  file: File,
  format: 'csv' | 'json',
  options: ImportOptions
): Promise<ImportResult> => {
  const data = await parseImportFile(file, format);
  
  const results = {
    total: data.length,
    successful: 0,
    failed: 0,
    errors: [] as Array<{ row: number; error: string }>,
  };

  for (let i = 0; i < data.length; i++) {
    try {
      const title = await validateAndTransformTitle(data[i]);
      await createTitle(title);
      results.successful++;
    } catch (error) {
      results.failed++;
      results.errors.push({ row: i, error: error.message });
    }
  }

  return results;
};

// CSV format example
/*
title,kind,year,rating,description,poster_url,video_url
"The Matrix",movie,1999,R,"A computer hacker learns...",https://...,https://...
"Inception",movie,2010,PG-13,"A thief who steals...",https://...,https://...
*/

// JSON format example
/*
[
  {
    "title": "The Matrix",
    "kind": "movie",
    "year": 1999,
    "rating": "R",
    "description": "A computer hacker learns...",
    "poster_url": "https://...",
    "video_url": "https://..."
  }
]
*/
```

### Bulk Update
```typescript
export const bulkUpdateTitles = async (
  updates: BulkUpdateRequest[]
): Promise<BulkUpdateResult> => {
  const results = {
    total: updates.length,
    successful: 0,
    failed: 0,
    errors: [] as Array<{ id: string; error: string }>,
  };

  for (const update of updates) {
    try {
      await updateTitle(update.id, update.changes);
      results.successful++;
    } catch (error) {
      results.failed++;
      results.errors.push({ id: update.id, error: error.message });
    }
  }

  return results;
};

interface BulkUpdateRequest {
  id: string;
  changes: Partial<Title>;
}
```

### Bulk Delete
```typescript
export const bulkDeleteTitles = async (
  ids: string[],
  options: DeleteOptions
): Promise<BulkDeleteResult> => {
  const results = {
    total: ids.length,
    successful: 0,
    failed: 0,
    errors: [] as Array<{ id: string; error: string }>,
  };

  for (const id of ids) {
    try {
      if (options.confirmationRequired) {
        const title = await getTitle(id);
        if (!options.confirmations.includes(id)) {
          throw new Error('Confirmation required');
        }
      }
      
      await deleteTitle(id, options.cascadeDelete);
      results.successful++;
    } catch (error) {
      results.failed++;
      results.errors.push({ id, error: error.message });
    }
  }

  return results;
};
```

### Bulk Publish
```typescript
export const bulkPublishTitles = async (
  ids: string[],
  scheduleDate?: Date
): Promise<BulkPublishResult> => {
  const results = {
    total: ids.length,
    successful: 0,
    failed: 0,
    scheduled: 0,
    errors: [] as Array<{ id: string; error: string }>,
  };

  for (const id of ids) {
    try {
      if (scheduleDate) {
        await schedulePublish(id, scheduleDate);
        results.scheduled++;
      } else {
        await publishTitle(id);
        results.successful++;
      }
    } catch (error) {
      results.failed++;
      results.errors.push({ id, error: error.message });
    }
  }

  return results;
};
```

### Bulk Category Assignment
```typescript
export const bulkAssignCategories = async (
  assignments: CategoryAssignment[]
): Promise<BulkAssignmentResult> => {
  const results = {
    total: assignments.length,
    successful: 0,
    failed: 0,
    errors: [] as Array<{ titleId: string; error: string }>,
  };

  for (const assignment of assignments) {
    try {
      await assignCategory(assignment.titleId, assignment.categoryId);
      results.successful++;
    } catch (error) {
      results.failed++;
      results.errors.push({ 
        titleId: assignment.titleId, 
        error: error.message 
      });
    }
  }

  return results;
};

interface CategoryAssignment {
  titleId: string;
  categoryId: string;
}
```

## Media Management

### Video Upload
```typescript
export const uploadVideo = async (
  file: File,
  options: VideoUploadOptions
): Promise<MediaAsset> => {
  // 1. Validate file
  await validateVideoFile(file, options);

  // 2. Generate upload URL
  const uploadUrl = await generateUploadUrl({
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    contentType: 'video',
  });

  // 3. Upload to storage
  await uploadToStorage(uploadUrl, file);

  // 4. Trigger transcoding
  const transcodingJob = await startTranscodingJob({
    sourceUrl: uploadUrl,
    outputFormats: options.outputFormats || ['480p', '720p', '1080p', '4K'],
    generateThumbnails: true,
    generatePreview: true,
  });

  // 5. Create media asset record
  const asset = await createMediaAsset({
    type: 'video',
    originalUrl: uploadUrl,
    transcodingJobId: transcodingJob.id,
    status: 'processing',
    metadata: {
      fileName: file.name,
      fileSize: file.size,
      duration: transcodingJob.duration,
      format: transcodingJob.format,
    },
  });

  return asset;
};

interface VideoUploadOptions {
  outputFormats?: string[];
  generateThumbnails?: boolean;
  generatePreview?: boolean;
  quality?: 'low' | 'medium' | 'high';
}
```

### Image Upload
```typescript
export const uploadImage = async (
  file: File,
  type: 'poster' | 'backdrop' | 'thumbnail',
  options: ImageUploadOptions
): Promise<MediaAsset> => {
  // 1. Validate file
  await validateImageFile(file, options);

  // 2. Generate variants
  const variants = await generateImageVariants(file, {
    sizes: options.sizes || [300, 500, 780, 1280],
    formats: options.formats || ['webp', 'jpg'],
    quality: options.quality || 85,
  });

  // 3. Upload variants
  const uploadPromises = variants.map(async (variant) => {
    const url = await uploadToStorage(variant.buffer, variant.fileName);
    return {
      size: variant.size,
      format: variant.format,
      url,
      width: variant.width,
      height: variant.height,
    };
  });

  const uploadedVariants = await Promise.all(uploadPromises);

  // 4. Create media asset record
  const asset = await createMediaAsset({
    type: 'image',
    imageType: type,
    variants: uploadedVariants,
    status: 'ready',
    metadata: {
      originalFileName: file.name,
      fileSize: file.size,
      width: uploadedVariants[0].width,
      height: uploadedVariants[0].height,
    },
  });

  return asset;
};
```

### Subtitle Management
```typescript
export const uploadSubtitle = async (
  file: File,
  languageCode: string,
  languageName: string,
  options: SubtitleUploadOptions
): Promise<SubtitleTrack> => {
  // 1. Validate file
  await validateSubtitleFile(file);

  // 2. Parse subtitle file
  const subtitles = await parseSubtitleFile(file);

  // 3. Upload to storage
  const url = await uploadToStorage(file, file.name);

  // 4. Create subtitle track
  const track = await createSubtitleTrack({
    languageCode,
    languageName,
    subtitleUrl: url,
    format: file.name.split('.').pop(),
    isAutoGenerated: false,
    metadata: {
      fileName: file.name,
      fileSize: file.size,
      cueCount: subtitles.length,
    },
  });

  return track;
};

export const generateAutoSubtitles = async (
  videoUrl: string,
  languageCode: string
): Promise<SubtitleTrack> => {
  // 1. Start speech-to-text job
  const job = await startSpeechToTextJob({
    videoUrl,
    languageCode,
  });

  // 2. Wait for completion
  const result = await waitForJobCompletion(job.id);

  // 3. Create subtitle track
  const track = await createSubtitleTrack({
    languageCode,
    languageName: getLanguageName(languageCode),
    subtitleUrl: result.subtitleUrl,
    format: 'vtt',
    isAutoGenerated: true,
    metadata: {
      confidence: result.confidence,
      duration: result.duration,
    },
  });

  return track;
};
```

## Content Publishing Workflow

### Workflow States
```typescript
type ContentStatus = 
  | 'draft'           // Initial state, not visible
  | 'pending_review'  // Submitted for review
  | 'approved'        // Approved, ready to publish
  | 'scheduled'       // Scheduled for future publication
  | 'published'       // Live and visible
  | 'archived'        // No longer visible but kept
  | 'deleted';        // Permanently deleted

interface ContentWorkflow {
  currentStatus: ContentStatus;
  history: WorkflowTransition[];
  scheduledFor?: Date;
  publishedAt?: Date;
  archivedAt?: Date;
  approvedBy?: string;
  reviewedBy?: string[];
}

interface WorkflowTransition {
  from: ContentStatus;
  to: ContentStatus;
  triggeredBy: string;
  triggeredAt: Date;
  reason?: string;
}
```

### Approval Process
```typescript
export const submitForReview = async (
  contentId: string,
  reviewerIds: string[]
): Promise<void> => {
  const content = await getContent(contentId);
  
  if (content.status !== 'draft') {
    throw new Error('Only draft content can be submitted for review');
  }

  await updateContentStatus(contentId, 'pending_review');
  
  // Notify reviewers
  await Promise.all(
    reviewerIds.map(reviewerId =>
      sendNotification(reviewerId, {
        type: 'content_review',
        title: 'Content pending review',
        body: `${content.title} has been submitted for review`,
        link: `/admin/content/${contentId}`,
      })
    )
  );
};

export const approveContent = async (
  contentId: string,
  approverId: string,
  notes?: string
): Promise<void> => {
  const content = await getContent(contentId);
  
  if (content.status !== 'pending_review') {
    throw new Error('Only pending content can be approved');
  }

  await updateContentStatus(contentId, 'approved', {
    approvedBy: approverId,
    approvalNotes: notes,
  });

  // Notify content creator
  await sendNotification(content.createdBy, {
    type: 'content_approved',
    title: 'Content approved',
    body: `${content.title} has been approved for publication`,
    link: `/admin/content/${contentId}`,
  });
};

export const rejectContent = async (
  contentId: string,
  reviewerId: string,
  reason: string
): Promise<void> => {
  const content = await getContent(contentId);
  
  if (content.status !== 'pending_review') {
    throw new Error('Only pending content can be rejected');
  }

  await updateContentStatus(contentId, 'draft', {
    rejectionReason: reason,
    rejectedBy: reviewerId,
  });

  // Notify content creator
  await sendNotification(content.createdBy, {
    type: 'content_rejected',
    title: 'Content rejected',
    body: `${content.title} has been rejected: ${reason}`,
    link: `/admin/content/${contentId}`,
  });
};
```

### Scheduling
```typescript
export const schedulePublication = async (
  contentId: string,
  publishDate: Date,
  timeZone?: string
): Promise<void> => {
  const content = await getContent(contentId);
  
  if (!['approved', 'draft'].includes(content.status)) {
    throw new Error('Only approved or draft content can be scheduled');
  }

  await updateContent(contentId, {
    status: 'scheduled',
    scheduledFor: publishDate,
    timeZone: timeZone || 'UTC',
  });

  // Schedule job
  await scheduleJob({
    type: 'publish_content',
    contentId,
    scheduledFor: publishDate,
    timeZone,
  });
};

export const publishScheduledContent = async (
  contentId: string
): Promise<void> => {
  const content = await getContent(contentId);
  
  if (content.status !== 'scheduled') {
    throw new Error('Only scheduled content can be published');
  }

  await updateContentStatus(contentId, 'published', {
    publishedAt: new Date(),
  });

  // Invalidate caches
  await invalidateContentCache(contentId);

  // Notify subscribers
  await notifyNewContent(content);
};
```

## Content Versioning

### Version Control
```typescript
interface ContentVersion {
  id: string;
  contentId: string;
  versionNumber: number;
  data: any; // Full content snapshot
  changes: VersionChange[];
  createdBy: string;
  createdAt: Date;
  isCurrent: boolean;
}

interface VersionChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export const createContentVersion = async (
  contentId: string,
  changes: VersionChange[],
  userId: string
): Promise<ContentVersion> => {
  const content = await getContent(contentId);
  const latestVersion = await getLatestVersion(contentId);
  
  const newVersion = await createVersion({
    contentId,
    versionNumber: (latestVersion?.versionNumber || 0) + 1,
    data: content,
    changes,
    createdBy: userId,
    isCurrent: true,
  });

  // Mark previous version as not current
  if (latestVersion) {
    await updateVersion(latestVersion.id, { isCurrent: false });
  }

  return newVersion;
};

export const restoreVersion = async (
  contentId: string,
  versionId: string,
  userId: string
): Promise<void> => {
  const version = await getVersion(versionId);
  
  if (version.contentId !== contentId) {
    throw new Error('Version does not belong to this content');
  }

  // Restore content data
  await updateContent(contentId, version.data);

  // Create new version for the restore
  await createContentVersion(
    contentId,
    [{ field: 'restore', oldValue: null, newValue: versionId }],
    userId
  );
};
```

## Content Search and Filtering

### Advanced Search
```typescript
export const searchContent = async (
  query: SearchQuery
): Promise<SearchResults> => {
  const {
    text,
    filters,
    sort,
    pagination,
  } = query;

  // Build search query
  const searchQuery = buildSearchQuery({
    text,
    filters: {
      kind: filters.kind,
      genres: filters.genres,
      categories: filters.categories,
      yearRange: filters.yearRange,
      ratingRange: filters.ratingRange,
      status: filters.status,
      isPremium: filters.isPremium,
      isExclusive: filters.isExclusive,
    },
    sort: {
      field: sort.field || 'popularity',
      order: sort.order || 'desc',
    },
    pagination: {
      page: pagination.page || 1,
      limit: pagination.limit || 20,
    },
  });

  // Execute search
  const results = await executeSearch(searchQuery);

  return {
    total: results.total,
    page: results.page,
    limit: results.limit,
    data: results.data,
    facets: results.facets,
  };
};

interface SearchQuery {
  text?: string;
  filters?: {
    kind?: string[];
    genres?: string[];
    categories?: string[];
    yearRange?: [number, number];
    ratingRange?: [number, number];
    status?: string[];
    isPremium?: boolean;
    isExclusive?: boolean;
  };
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
  pagination?: {
    page: number;
    limit: number;
  };
}
```

## Content Analytics

### Performance Metrics
```typescript
export const getContentAnalytics = async (
  contentId: string,
  dateRange: DateRange
): Promise<ContentAnalytics> => {
  const [
    views,
    uniqueViewers,
    watchTime,
    completionRate,
    engagement,
    revenue,
  ] = await Promise.all([
    getContentViews(contentId, dateRange),
    getUniqueViewers(contentId, dateRange),
    getTotalWatchTime(contentId, dateRange),
    getCompletionRate(contentId, dateRange),
    getEngagementMetrics(contentId, dateRange),
    getContentRevenue(contentId, dateRange),
  ]);

  return {
    views,
    uniqueViewers,
    watchTime,
    completionRate,
    engagement,
    revenue,
    trends: await getPerformanceTrends(contentId, dateRange),
  };
};

interface ContentAnalytics {
  views: number;
  uniqueViewers: number;
  watchTime: number; // seconds
  completionRate: number; // percentage
  engagement: {
    likes: number;
    shares: number;
    comments: number;
    addToWatchlist: number;
  };
  revenue: number;
  trends: {
    daily: TrendData[];
    weekly: TrendData[];
    monthly: TrendData[];
  };
}
```

## Content Quality Management

### Quality Checks
```typescript
export const runQualityChecks = async (
  contentId: string
): Promise<QualityReport> => {
  const content = await getContent(contentId);
  const checks = [];

  // Video quality checks
  if (content.video) {
    checks.push(await checkVideoQuality(content.video.url));
  }

  // Image quality checks
  if (content.poster) {
    checks.push(await checkImageQuality(content.poster.url));
  }

  // Metadata completeness
  checks.push(checkMetadataCompleteness(content));

  // Subtitle availability
  checks.push(await checkSubtitleAvailability(contentId));

  // Licensing validity
  checks.push(await checkLicensingValidity(contentId));

  return {
    contentId,
    overallScore: calculateOverallScore(checks),
    checks,
    recommendations: generateRecommendations(checks),
  };
};

interface QualityReport {
  contentId: string;
  overallScore: number; // 0-100
  checks: QualityCheck[];
  recommendations: string[];
}

interface QualityCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  score: number;
  details: any;
}
```

## CMS API Endpoints

### Content CRUD
```typescript
// POST /admin/api/content/titles
export const createTitle = async (data: CreateTitleData): Promise<Title> => {
  const response = await fetch('/admin/api/content/titles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
};

// GET /admin/api/content/titles/:id
export const getTitle = async (id: string): Promise<Title> => {
  const response = await fetch(`/admin/api/content/titles/${id}`);
  return response.json();
};

// PUT /admin/api/content/titles/:id
export const updateTitle = async (
  id: string,
  data: UpdateTitleData
): Promise<Title> => {
  const response = await fetch(`/admin/api/content/titles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
};

// DELETE /admin/api/content/titles/:id
export const deleteTitle = async (
  id: string,
  cascade?: boolean
): Promise<void> => {
  const response = await fetch(
    `/admin/api/content/titles/${id}?cascade=${cascade || false}`,
    { method: 'DELETE' }
  );
  return response.json();
};
```

### Bulk Operations
```typescript
// POST /admin/api/content/titles/bulk-import
export const bulkImportTitles = async (
  file: File,
  options: ImportOptions
): Promise<ImportResult> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('options', JSON.stringify(options));

  const response = await fetch('/admin/api/content/titles/bulk-import', {
    method: 'POST',
    body: formData,
  });
  return response.json();
};

// POST /admin/api/content/titles/bulk-update
export const bulkUpdateTitles = async (
  updates: BulkUpdateRequest[]
): Promise<BulkUpdateResult> => {
  const response = await fetch('/admin/api/content/titles/bulk-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updates }),
  });
  return response.json();
};

// POST /admin/api/content/titles/bulk-delete
export const bulkDeleteTitles = async (
  ids: string[],
  options: DeleteOptions
): Promise<BulkDeleteResult> => {
  const response = await fetch('/admin/api/content/titles/bulk-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, options }),
  });
  return response.json();
};

// POST /admin/api/content/titles/bulk-publish
export const bulkPublishTitles = async (
  ids: string[],
  scheduleDate?: Date
): Promise<BulkPublishResult> => {
  const response = await fetch('/admin/api/content/titles/bulk-publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, scheduleDate }),
  });
  return response.json();
};
```

### Media Upload
```typescript
// POST /admin/api/media/video
export const uploadVideo = async (
  file: File,
  options: VideoUploadOptions
): Promise<MediaAsset> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('options', JSON.stringify(options));

  const response = await fetch('/admin/api/media/video', {
    method: 'POST',
    body: formData,
  });
  return response.json();
};

// POST /admin/api/media/image
export const uploadImage = async (
  file: File,
  type: string,
  options: ImageUploadOptions
): Promise<MediaAsset> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  formData.append('options', JSON.stringify(options));

  const response = await fetch('/admin/api/media/image', {
    method: 'POST',
    body: formData,
  });
  return response.json();
};

// POST /admin/api/media/subtitle
export const uploadSubtitle = async (
  file: File,
  languageCode: string,
  languageName: string
): Promise<SubtitleTrack> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('languageCode', languageCode);
  formData.append('languageName', languageName);

  const response = await fetch('/admin/api/media/subtitle', {
    method: 'POST',
    body: formData,
  });
  return response.json();
};
```

## CMS UI Components

### Content Editor
```typescript
export const ContentEditor = ({ contentId, contentType }: ContentEditorProps) => {
  const { data: content } = useQuery({
    queryKey: ['content', contentId],
    queryFn: () => getContent(contentId),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateContentData) => updateContent(contentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['content', contentId]);
      toast.success('Content updated successfully');
    },
  });

  const [activeTab, setActiveTab] = useState<'details' | 'media' | 'metadata' | 'publishing'>('details');

  return (
    <div className="content-editor">
      <div className="editor-header">
        <h1>Edit {contentType}</h1>
        <div className="editor-actions">
          <Button variant="outline" onClick={() => setActiveTab('details')}>
            Details
          </Button>
          <Button variant="outline" onClick={() => setActiveTab('media')}>
            Media
          </Button>
          <Button variant="outline" onClick={() => setActiveTab('metadata')}>
            Metadata
          </Button>
          <Button variant="outline" onClick={() => setActiveTab('publishing')}>
            Publishing
          </Button>
          <Button onClick={() => updateMutation.mutate(content)}>
            Save Changes
          </Button>
        </div>
      </div>

      {activeTab === 'details' && (
        <ContentDetailsForm content={content} onSave={updateMutation.mutate} />
      )}
      {activeTab === 'media' && (
        <ContentMediaForm content={content} onSave={updateMutation.mutate} />
      )}
      {activeTab === 'metadata' && (
        <ContentMetadataForm content={content} onSave={updateMutation.mutate} />
      )}
      {activeTab === 'publishing' && (
        <ContentPublishingForm content={content} onSave={updateMutation.mutate} />
      )}
    </div>
  );
};
```

### Bulk Operations Panel
```typescript
export const BulkOperationsPanel = () => {
  const [selectedTitles, setSelectedTitles] = useState<string[]>([]);
  const [operation, setOperation] = useState<'delete' | 'publish' | 'update' | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => bulkDeleteTitles(ids),
    onSuccess: () => {
      queryClient.invalidateQueries(['titles']);
      setSelectedTitles([]);
      setOperation(null);
      toast.success('Titles deleted successfully');
    },
  });

  const publishMutation = useMutation({
    mutationFn: (ids: string[]) => bulkPublishTitles(ids),
    onSuccess: () => {
      queryClient.invalidateQueries(['titles']);
      setSelectedTitles([]);
      setOperation(null);
      toast.success('Titles published successfully');
    },
  });

  return (
    <div className="bulk-operations-panel">
      <div className="bulk-actions">
        <span>{selectedTitles.length} selected</span>
        <Button
          variant="destructive"
          onClick={() => setOperation('delete')}
          disabled={selectedTitles.length === 0}
        >
          Delete
        </Button>
        <Button
          onClick={() => setOperation('publish')}
          disabled={selectedTitles.length === 0}
        >
          Publish
        </Button>
        <Button
          variant="outline"
          onClick={() => setOperation('update')}
          disabled={selectedTitles.length === 0}
        >
          Update
        </Button>
      </div>

      {operation === 'delete' && (
        <BulkDeleteDialog
          titles={selectedTitles}
          onConfirm={() => deleteMutation.mutate(selectedTitles)}
          onCancel={() => setOperation(null)}
        />
      )}

      {operation === 'publish' && (
        <BulkPublishDialog
          titles={selectedTitles}
          onConfirm={(date) => publishMutation.mutate(selectedTitles)}
          onCancel={() => setOperation(null)}
        />
      )}

      {operation === 'update' && (
        <BulkUpdateDialog
          titles={selectedTitles}
          onConfirm={(updates) => bulkUpdateTitles(updates)}
          onCancel={() => setOperation(null)}
        />
      )}
    </div>
  );
};
```

## Technology Stack Summary

| Category | Technology | Purpose |
|----------|-----------|---------|
| Storage | AWS S3 | Media storage |
| CDN | CloudFront | Content delivery |
| Transcoding | AWS MediaConvert | Video processing |
| Image Processing | Sharp | Image optimization |
| Subtitle Processing | ffmpeg | Subtitle conversion |
| Search | Elasticsearch | Advanced search |
| Database | PostgreSQL | Content metadata |
| Cache | Redis | Query caching |
| Queue | RabbitMQ | Background jobs |
| Monitoring | Custom + Sentry | Error tracking |
