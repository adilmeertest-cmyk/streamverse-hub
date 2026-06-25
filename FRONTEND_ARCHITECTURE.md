# Enterprise Frontend Architecture for StreamFlix Platform

## Overview
This document describes the scalable, enterprise-grade frontend architecture for a Netflix-style streaming platform supporting multiple devices (Mobile, Tablet, Desktop, TV).

## Architecture Pattern: Component-Based with Device-Specific Adaptations

### Core Principles
- **Responsive Design**: Fluid layouts that adapt to any screen size
- **Progressive Enhancement**: Core functionality works everywhere, enhanced on capable devices
- **Device Detection**: Server-side and client-side device detection
- **Performance First**: Optimized for low-bandwidth and low-power devices
- **Accessibility**: WCAG 2.1 AA compliance
- **Internationalization**: Multi-language support with RTL support

## Technology Stack

### Core Framework
- **React 19**: UI framework with concurrent features
- **TanStack Router**: File-based routing with data loading
- **TanStack Query**: Server state management and caching
- **Zustand**: Client state management
- **TypeScript**: Type safety

### UI Framework
- **Tailwind CSS**: Utility-first styling
- **Radix UI**: Accessible component primitives
- **Framer Motion**: Animations and transitions
- **Lucide React**: Icon library

### Device-Specific Implementations
- **Mobile**: React Native (iOS/Android apps)
- **TV**: React Native TV or Tizen/WebOS web apps
- **Desktop/Web**: React SPA (current implementation)

## Responsive Breakpoints

```css
/* Mobile First Approach */
--breakpoint-mobile: 320px;
--breakpoint-mobile-lg: 375px;
--breakpoint-tablet: 768px;
--breakpoint-tablet-lg: 1024px;
--breakpoint-desktop: 1280px;
--breakpoint-desktop-lg: 1440px;
--breakpoint-desktop-xl: 1920px;
--breakpoint-tv: 2560px;
```

### Device Categories
```typescript
type DeviceCategory = 
  | 'mobile'      // 320px - 767px
  | 'tablet'      // 768px - 1023px
  | 'desktop'     // 1024px - 1439px
  | 'desktop-lg'  // 1440px - 1919px
  | 'desktop-xl'  // 1920px+
  | 'tv';         // 2560px+

interface DeviceInfo {
  category: DeviceCategory;
  isTouch: boolean;
  isPortrait: boolean;
  pixelRatio: number;
  connectionSpeed: 'slow' | 'medium' | 'fast';
  supportsHLS: boolean;
  supportsWebP: boolean;
  supportsAV1: boolean;
}
```

## Component Architecture

### Component Hierarchy
```
App
├── Providers (Auth, Query, Theme, Device)
├── Layout
│   ├── Header (responsive)
│   ├── Sidebar (desktop only)
│   ├── Main Content
│   └── Footer (responsive)
├── Pages
│   ├── Home
│   ├── Browse
│   ├── Title Detail
│   ├── Watch
│   ├── Search
│   ├── Account
│   └── Admin
└── Shared Components
    ├── Video Player
    ├── Title Cards
    ├── Modals
    ├── Forms
    └── Navigation
```

### Component Design Patterns

#### 1. Atomic Design
```typescript
// Atoms (smallest components)
export const Button = ({ variant, size, children, ...props }: ButtonProps) => { /* ... */ }
export const Input = ({ ...props }: InputProps) => { /* ... */ }
export const Icon = ({ name, size }: IconProps) => { /* ... */ }

// Molecules (combination of atoms)
export const SearchBar = () => { /* Input + Button */ }
export const TitleCard = ({ title }: { title: Title }) => { /* Image + Text + Button */ }
export const EpisodeCard = ({ episode }: { episode: Episode }) => { /* ... */ }

// Organisms (complex components)
export const HeroBanner = ({ banners }: { banners: Banner[] }) => { /* ... */ }
export const TitleRow = ({ titles, heading }: { titles: Title[], heading: string }) => { /* ... */ }
export const VideoPlayer = ({ src, subtitles }: VideoPlayerProps) => { /* ... */ }

// Templates (page layouts)
export const HomeTemplate = () => { /* Hero + Multiple TitleRows */ }
export const BrowseTemplate = ({ category }: { category: string }) => { /* ... */ }

// Pages (complete views)
export const HomePage = () => { /* HomeTemplate + Layout */ }
export const WatchPage = ({ slug }: { slug: string }) => { /* VideoPlayer + Layout */ }
```

#### 2. Compound Components
```typescript
// Video player with compound pattern
export const VideoPlayer = ({ children, src }: VideoPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  
  return (
    <VideoPlayerContext.Provider value={{ isPlaying, setIsPlaying }}>
      <div className="video-player">
        {children}
      </div>
    </VideoPlayerContext.Provider>
  );
};

VideoPlayer.Video = ({ src }: { src: string }) => { /* ... */ };
VideoPlayer.Controls = () => { /* Play, Pause, Volume, etc. */ };
VideoPlayer.Subtitles = ({ tracks }: { tracks: SubtitleTrack[] }) => { /* ... */ };
VideoPlayer.QualitySelector = ({ variants }: { variants: VideoVariant[] }) => { /* ... */ };

// Usage
<VideoPlayer src="video.m3u8">
  <VideoPlayer.Video />
  <VideoPlayer.Controls />
  <VideoPlayer.Subtitles tracks={subtitleTracks} />
  <VideoPlayer.QualitySelector variants={videoVariants} />
</VideoPlayer>
```

#### 3. Render Props Pattern
```typescript
// Device-aware component
export const DeviceAware = ({ children }: { children: (device: DeviceInfo) => React.ReactNode }) => {
  const device = useDeviceInfo();
  return <>{children(device)}</>;
};

// Usage
<DeviceAware>
  {(device) => (
    device.category === 'mobile' ? (
      <MobileLayout />
    ) : device.category === 'tv' ? (
      <TVLayout />
    ) : (
      <DesktopLayout />
    )
  )}
</DeviceAware>
```

## State Management Architecture

### Server State (TanStack Query)
```typescript
// Queries for data fetching
export const useTitles = (kind?: TitleKind) => {
  return useQuery({
    queryKey: ['titles', kind],
    queryFn: () => fetchTitles(kind),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useTitle = (slug: string) => {
  return useQuery({
    queryKey: ['title', slug],
    queryFn: () => fetchTitle(slug),
    enabled: !!slug,
  });
};

export const useWatchHistory = () => {
  return useQuery({
    queryKey: ['watch-history'],
    queryFn: () => fetchWatchHistory(),
    staleTime: 0, // Always fresh
  });
};
```

### Client State (Zustand)
```typescript
// Global UI state
interface UIState {
  sidebarOpen: boolean;
  darkMode: boolean;
  currentProfile: Profile | null;
  setSidebarOpen: (open: boolean) => void;
  setDarkMode: (dark: boolean) => void;
  setCurrentProfile: (profile: Profile) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  darkMode: true,
  currentProfile: null,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setDarkMode: (dark) => set({ darkMode: dark }),
  setCurrentProfile: (profile) => set({ currentProfile: profile }),
}));

// Video player state

interface VideoState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackSpeed: number;
  quality: string;
  subtitleLanguage: string | null;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  setQuality: (quality: string) => void;
  setSubtitleLanguage: (language: string | null) => void;
}

export const useVideoStore = create<VideoState>((set) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  playbackSpeed: 1,
  quality: 'auto',
  subtitleLanguage: null,
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setQuality: (quality) => set({ quality }),
  setSubtitleLanguage: (language) => set({ subtitleLanguage: language }),
}));
```

## Routing Architecture

### File-Based Routing (TanStack Router)
```
src/routes/
├── __root.tsx                    # Root layout
├── index.tsx                     # Home page
├── auth.tsx                      # Authentication
├── search.tsx                    # Search
├── pricing.tsx                   # Pricing
├── title.$slug.tsx              # Title detail
├── watch.$slug.tsx              # Watch page
├── browse.tsx                   # Browse all
├── browse.$kind.tsx             # Browse by kind
├── _authenticated/              # Protected routes
│   ├── route.tsx                # Auth layout
│   ├── account.tsx              # Account
│   ├── watchlist.tsx            # Watchlist
│   └── admin/                   # Admin routes
│       ├── route.tsx            # Admin layout
│       ├── index.tsx            # Admin dashboard
│       ├── titles.tsx           # Title management
│       ├── users.tsx            # User management
│       └── analytics.tsx         # Analytics
└── api/                         # API routes
    └── public/
        └── stripe-webhook.ts    # Webhook handler
```

### Route Configuration
```typescript
// __root.tsx - Root layout with providers
export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: Error,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <DeviceProvider>
        <ThemeProvider>
          <AuthProvider>
            <Outlet />
          </AuthProvider>
        </ThemeProvider>
      </DeviceProvider>
    </QueryClientProvider>
  );
}
```

### Data Loading
```typescript
// title.$slug.tsx - Server-side data loading
export const Route = createFileRoute('/title/$slug')({
  loader: async ({ params, context }) => {
    const title = await context.queryClient.fetchQuery({
      queryKey: ['title', params.slug],
      queryFn: () => fetchTitle(params.slug),
    });
    if (!title) throw notFound();
    return title;
  },
  component: TitlePage,
});

function TitlePage() {
  const title = Route.useLoaderData();
  // ... render title
}
```

## Performance Optimization

### Code Splitting
```typescript
// Lazy route loading
export const Route = createFileRoute('/admin')({
  component: lazy(() => import('./admin').then(m => ({ default: m.AdminPage }))),
});

// Lazy component loading
const VideoPlayer = lazy(() => import('@/components/video-player'));
const AdminPanel = lazy(() => import('@/components/admin-panel'));

// Usage with Suspense
<Suspense fallback={<VideoPlayerSkeleton />}>
  <VideoPlayer src={videoUrl} />
</Suspense>
```

### Image Optimization
```typescript
// Responsive images with Next.js Image pattern
export const OptimizedImage = ({ src, alt, sizes }: OptimizedImageProps) => {
  const { data } = useQuery({
    queryKey: ['image-optimization', src],
    queryFn: () => fetchOptimizedImage(src, sizes),
  });

  return (
    <picture>
      {data?.sources.map((source) => (
        <source
          key={source.src}
          srcSet={source.srcSet}
          media={source.media}
          type={source.type}
        />
      ))}
      <img
        src={data?.fallback}
        alt={alt}
        loading="lazy"
        decoding="async"
      />
    </picture>
  );
};
```

### Virtual Scrolling
```typescript
// For large lists (e.g., episode lists)
import { useVirtualizer } from '@tanstack/react-virtual';

export const EpisodeList = ({ episodes }: { episodes: Episode[] }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: episodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: '500px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((item) => (
          <EpisodeCard
            key={item.key}
            episode={episodes[item.index]}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${item.start}px)` }}
          />
        ))}
      </div>
    </div>
  );
};
```

### Memoization
```typescript
// React.memo for expensive components
export const TitleCard = React.memo(({ title }: { title: Title }) => {
  // ... component
}, (prevProps, nextProps) => {
  return prevProps.title.id === nextProps.title.id;
});

// useMemo for expensive calculations
const filteredTitles = useMemo(() => {
  return titles.filter(t => t.kind === selectedKind);
}, [titles, selectedKind]);

// useCallback for stable function references
const handlePlay = useCallback((titleId: string) => {
  navigate({ to: '/watch/$slug', params: { slug: titleId } });
}, [navigate]);
```

## Device-Specific Implementations

### Mobile Optimizations
```typescript
// Mobile-specific components
export const MobileNavigation = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
      <div className="flex justify-around py-2">
        <MobileNavItem icon="home" label="Home" to="/" />
        <MobileNavItem icon="search" label="Search" to="/search" />
        <MobileNavItem icon="list" label="My List" to="/watchlist" />
        <MobileNavItem icon="user" label="Account" to="/account" />
      </div>
    </nav>
  );
};

// Touch-optimized interactions
export const TouchButton = ({ children, ...props }: ButtonProps) => {
  return (
    <button
      {...props}
      className="min-h-[44px] min-w-[44px]" // WCAG touch target size
      onTouchStart={() => {}}
    >
      {children}
    </button>
  );
};

// Swipe gestures for navigation
export const SwipeableRow = ({ children, onSwipeLeft, onSwipeRight }: SwipeableProps) => {
  const handlers = useSwipeable({
    onSwipedLeft: onSwipeLeft,
    onSwipedRight: onSwipeRight,
    trackMouse: true,
  });

  return <div {...handlers}>{children}</div>;
};
```

### TV Optimizations
```typescript
// TV-specific navigation (D-pad support)
export const TVNavigation = () => {
  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        // Navigate up
        break;
      case 'ArrowDown':
        // Navigate down
        break;
      case 'ArrowLeft':
        // Navigate left
        break;
      case 'ArrowRight':
        // Navigate right
        break;
      case 'Enter':
        // Select focused item
        break;
      case 'Back':
        // Go back
        break;
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return null;
};

// Focus management for TV
export const FocusableItem = ({ children, onFocus }: FocusableProps) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      className={isFocused ? 'ring-4 ring-primary' : ''}
    >
      {children}
    </div>
  );
};

// Large UI elements for TV
export const TVButton = ({ children, ...props }: ButtonProps) => {
  return (
    <button
      {...props}
      className="min-h-[60px] min-w-[200px] text-xl" // Larger touch targets
    >
      {children}
    </button>
  );
};
```

### Desktop Optimizations
```typescript
// Keyboard shortcuts
export const KeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            // Focus search
            break;
          case '/':
            e.preventDefault();
            // Open help
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return null;
};

// Hover effects
export const HoverCard = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="group relative">
      {children}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};
```

## Video Player Architecture

### HLS Player with Adaptive Bitrate
```typescript
export const AdvancedVideoPlayer = ({ src, subtitles, variants }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [quality, setQuality] = useState('auto');
  const [subtitleLanguage, setSubtitleLanguage] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let hls: Hls | undefined;
    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 3,
        levelLoadingTimeOut: 10000,
        levelLoadingMaxRetry: 3,
      });

      hls.loadSource(src);
      hls.attachMedia(video);

      // Adaptive bitrate configuration
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const levels = hls.levels;
        // Auto-select quality based on bandwidth
        hls.currentLevel = -1; // Auto
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    }

    return () => {
      hls?.destroy();
    };
  }, [src]);

  const handleQualityChange = (newQuality: string) => {
    if (hlsRef.current) {
      if (newQuality === 'auto') {
        hlsRef.current.currentLevel = -1;
      } else {
        const levelIndex = hlsRef.current.levels.findIndex(
          level => level.height === parseInt(newQuality)
        );
        if (levelIndex !== -1) {
          hlsRef.current.currentLevel = levelIndex;
        }
      }
      setQuality(newQuality);
    }
  };

  return (
    <div className="video-player-container">
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        playsInline
      />
      <VideoControls
        quality={quality}
        onQualityChange={handleQualityChange}
        subtitleLanguage={subtitleLanguage}
        onSubtitleChange={setSubtitleLanguage}
        subtitles={subtitles}
      />
    </div>
  );
};
```

### Video Controls
```typescript
export const VideoControls = ({ quality, onQualityChange, subtitleLanguage, onSubtitleChange, subtitles }: VideoControlsProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  return (
    <div className="video-controls">
      <PlayPauseButton isPlaying={isPlaying} onClick={handlePlayPause} />
      <ProgressBar currentTime={currentTime} duration={duration} onSeek={handleSeek} />
      <VolumeControl volume={volume} onChange={handleVolumeChange} />
      <SpeedControl speed={playbackSpeed} onChange={handleSpeedChange} />
      <QualitySelector quality={quality} onChange={onQualityChange} />
      <SubtitleSelector language={subtitleLanguage} onChange={onSubtitleChange} subtitles={subtitles} />
      <FullscreenButton />
    </div>
  );
};
```

## Internationalization (i18n)

### i18n Setup
```typescript
// i18n configuration
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          'home': 'Home',
          'search': 'Search',
          'watch': 'Watch',
          'my_list': 'My List',
          'account': 'Account',
        },
      },
      es: {
        translation: {
          'home': 'Inicio',
          'search': 'Buscar',
          'watch': 'Ver',
          'my_list': 'Mi Lista',
          'account': 'Cuenta',
        },
      },
      // ... more languages
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// Usage in components
export const Navigation = () => {
  const { t } = useTranslation();
  
  return (
    <nav>
      <Link to="/">{t('home')}</Link>
      <Link to="/search">{t('search')}</Link>
      <Link to="/watchlist">{t('my_list')}</Link>
      <Link to="/account">{t('account')}</Link>
    </nav>
  );
};
```

### RTL Support
```typescript
// RTL-aware components
export const RTLContainer = ({ children, dir }: { children: React.ReactNode; dir?: 'ltr' | 'rtl' }) => {
  const { i18n } = useTranslation();
  const direction = dir || (i18n.dir() as 'ltr' | 'rtl');
  
  return (
    <div dir={direction} className={direction === 'rtl' ? 'rtl' : 'ltr'}>
      {children}
    </div>
  );
};

// RTL-aware layout
export const FlexRow = ({ children, className }: FlexRowProps) => {
  const { dir } = useTranslation();
  
  return (
    <div className={`flex ${dir === 'rtl' ? 'flex-row-reverse' : 'flex-row'} ${className}`}>
      {children}
    </div>
  );
};
```

## Accessibility (a11y)

### ARIA Labels
```typescript
export const AccessibleButton = ({ children, ...props }: ButtonProps) => {
  return (
    <button
      {...props}
      aria-label={props['aria-label'] || props.title}
      role={props.role || 'button'}
    >
      {children}
    </button>
  );
};

export const AccessibleLink = ({ children, ...props }: LinkProps) => {
  return (
    <a
      {...props}
      aria-label={props['aria-label'] || children?.toString()}
      role="link"
    >
      {children}
    </a>
  );
};
```

### Keyboard Navigation
```typescript
export const KeyboardNavigable = ({ children }: { children: React.ReactNode }) => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Handle keyboard navigation
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return <>{children}</>;
};
```

### Screen Reader Support
```typescript
export const ScreenReaderOnly = ({ children }: { children: React.ReactNode }) => {
  return (
    <span className="sr-only">
      {children}
    </span>
  );
};

export const LiveRegion = ({ message }: { message: string }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
};
```

## Testing Strategy

### Unit Testing (Jest + React Testing Library)
```typescript
// Component testing
describe('TitleCard', () => {
  it('renders title information', () => {
    const title = {
      id: '1',
      title: 'Test Movie',
      poster_url: 'https://example.com/poster.jpg',
      kind: 'movie',
      release_year: 2024,
    };
    
    render(<TitleCard title={title} />);
    
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.getByAltText('Test Movie')).toBeInTheDocument();
  });

  it('navigates to title detail on click', () => {
    const title = { /* ... */ };
    const mockNavigate = jest.fn();
    
    render(<TitleCard title={title} />);
    fireEvent.click(screen.getByRole('link'));
    
    expect(mockNavigate).toHaveBeenCalledWith('/title/test-movie-2024');
  });
});
```

### Integration Testing (Playwright)
```typescript
// E2E testing
test('user can browse and watch a title', async ({ page }) => {
  await page.goto('/');
  
  // Wait for hero banner to load
  await page.waitForSelector('[data-testid="hero-banner"]');
  
  // Click on a title
  await page.click('[data-testid="title-card"]:first-child');
  
  // Verify title detail page
  await expect(page).toHaveURL(/\/title\/.+/);
  await expect(page.locator('h1')).toBeVisible();
  
  // Click play button
  await page.click('[data-testid="play-button"]');
  
  // Verify video player loads
  await page.waitForSelector('video');
  await expect(page.locator('video')).toBeVisible();
});
```

### Visual Regression Testing (Percy/Chromatic)
```typescript
// Snapshot testing
describe('HomePage Snapshot', () => {
  it('matches snapshot on desktop', () => {
    const { container } = render(<HomePage />);
    expect(container).toMatchSnapshot();
  });

  it('matches snapshot on mobile', () => {
    // Set mobile viewport
    window.innerWidth = 375;
    const { container } = render(<HomePage />);
    expect(container).toMatchSnapshot();
  });
});
```

## Performance Monitoring

### Web Vitals
```typescript
// Core Web Vitals tracking
export const reportWebVitals = (metric: any) => {
  const { name, value, id } = metric;
  
  // Send to analytics
  fetch('/api/analytics/web-vitals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, value, id }),
  });
};

// Usage in index.tsx
reportWebVitals(onCLS(reportWebVitals));
reportWebVitals(onFID(reportWebVitals));
reportWebVitals(onLCP(reportWebVitals));
```

### Error Tracking
```typescript
// Error boundary with tracking
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Send to error tracking service
    trackError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

## Progressive Web App (PWA)

### Service Worker
```typescript
// Service worker for offline support
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('streamflix-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/offline.html',
        '/manifest.json',
        // Critical assets
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

### Manifest
```json
{
  "name": "StreamFlix",
  "short_name": "StreamFlix",
  "description": "Watch movies and TV shows",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#e50914",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## Build Optimization

### Webpack Configuration
```typescript
// Optimized webpack config
export default {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        common: {
          minChunks: 2,
          chunks: 'all',
          name: 'common',
        },
      },
    },
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
          },
        },
      }),
    ],
  },
  performance: {
    hints: 'warning',
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
};
```

### Tree Shaking
```typescript
// Import only what you need
// Bad
import _ from 'lodash';

// Good
import { debounce } from 'lodash';

// Better
import debounce from 'lodash-es/debounce';
```

## Deployment Strategy

### Static Site Generation (SSG)
```typescript
// Generate static pages for better SEO
export const generateStaticPages = async () => {
  const titles = await fetchAllTitles();
  
  return titles.map((title) => ({
    path: `/title/${title.slug}`,
    component: TitlePage,
    loader: () => fetchTitle(title.slug),
  }));
};
```

### Server-Side Rendering (SSR)
```typescript
// SSR for initial page load
export const renderToString = (url: string) => {
  const app = createApp();
  const context = {};
  
  return renderToString(
    <StaticRouter location={url} context={context}>
      {app}
    </StaticRouter>
  );
};
```

## Migration Path from Current Architecture

### Phase 1: Responsive Enhancements (2-3 weeks)
- Implement responsive breakpoints
- Add mobile-specific components
- Optimize touch interactions
- Add TV navigation support

### Phase 2: Performance Optimization (2-3 weeks)
- Implement code splitting
- Add image optimization
- Implement virtual scrolling
- Add service worker for PWA

### Phase 3: Device-Specific Features (3-4 weeks)
- Implement device detection
- Add mobile-specific features
- Add TV-specific features
- Optimize for different network conditions

### Phase 4: Accessibility & i18n (2-3 weeks)
- Add ARIA labels
- Implement keyboard navigation
- Add screen reader support
- Implement i18n with RTL support

### Phase 5: Testing & Monitoring (2-3 weeks)
- Add unit tests
- Add integration tests
- Add E2E tests
- Implement performance monitoring

## Technology Stack Summary

| Category | Technology | Purpose |
|----------|-----------|---------|
| Framework | React 19 | UI framework |
| Routing | TanStack Router | File-based routing |
| State | TanStack Query | Server state |
| State | Zustand | Client state |
| Styling | Tailwind CSS | Utility styling |
| Components | Radix UI | Accessible components |
| Animation | Framer Motion | Animations |
| Icons | Lucide React | Icon library |
| i18n | i18next | Internationalization |
| Testing | Jest + RTL | Unit testing |
| Testing | Playwright | E2E testing |
| Build | Vite | Build tool |
| PWA | Workbox | Service worker |
| Monitoring | Web Vitals | Performance tracking |
