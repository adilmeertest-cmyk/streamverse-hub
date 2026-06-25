# Enterprise Admin Panel Architecture for StreamFlix Platform

## Overview
This document describes the architecture for a completely separate, secure admin panel that is inaccessible to normal users. The admin panel has its own authentication system, enhanced security measures, and is designed for enterprise-level content management.

## Security Architecture

### Separation from User Application
- **Separate Domain**: `admin.streamflix.com` (different from `streamflix.com`)
- **Separate Authentication**: Independent auth system with 2FA mandatory
- **IP Whitelisting**: Only allowed IP addresses can access
- **Session Management**: Strict session timeouts and concurrent session limits
- **Audit Logging**: All admin actions are logged with full context

### Authentication Flow
```
1. Admin visits admin.streamflix.com
2. Check IP against whitelist (if enabled)
3. Request credentials (email + password)
4. Validate credentials against admin database
5. Require 2FA verification (TOTP or backup codes)
6. Verify device (if device verification enabled)
7. Create secure session with limited lifetime
8. Redirect to dashboard
```

### Security Layers

#### Layer 1: Network Security
```typescript
// IP Whitelist middleware
interface IPWhitelistConfig {
  enabled: boolean;
  allowedIPs: string[];
  allowedRanges: string[]; // CIDR notation
  vpnRequired: boolean;
}

export const ipWhitelistMiddleware = async (
  req: Request,
  config: IPWhitelistConfig
): Promise<boolean> => {
  if (!config.enabled) return true;
  
  const clientIP = getClientIP(req);
  
  // Check exact IP match
  if (config.allowedIPs.includes(clientIP)) return true;
  
  // Check CIDR ranges
  for (const range of config.allowedRanges) {
    if (isIPInCIDR(clientIP, range)) return true;
  }
  
  return false;
};
```

#### Layer 2: Authentication
```typescript
// Admin-specific authentication
interface AdminCredentials {
  email: string;
  password: string;
  twoFactorCode: string;
  rememberDevice: boolean;
}

export const authenticateAdmin = async (
  credentials: AdminCredentials
): Promise<AdminSession | null> => {
  // 1. Validate credentials
  const admin = await getAdminByEmail(credentials.email);
  if (!admin) return null;
  
  const isValidPassword = await verifyPassword(
    credentials.password,
    admin.passwordHash
  );
  if (!isValidPassword) {
    await logFailedLoginAttempt(admin.id, 'invalid_password');
    return null;
  }
  
  // 2. Check account status
  if (admin.status !== 'active') {
    throw new Error('Account is not active');
  }
  
  // 3. Verify 2FA
  const isValid2FA = await verifyTwoFactorCode(
    admin.twoFactorSecret,
    credentials.twoFactorCode
  );
  if (!isValid2FA) {
    await logFailedLoginAttempt(admin.id, 'invalid_2fa');
    return null;
  }
  
  // 4. Check device (if verification enabled)
  if (admin.deviceVerificationRequired) {
    const device = await getDeviceByFingerprint(getDeviceFingerprint());
    if (!device || !device.verified) {
      throw new Error('Device not verified');
    }
  }
  
  // 5. Create session
  const session = await createAdminSession({
    adminId: admin.id,
    ipAddress: getClientIP(),
    userAgent: getUserAgent(),
    deviceFingerprint: getDeviceFingerprint(),
    rememberDevice: credentials.rememberDevice,
  });
  
  // 6. Log successful login
  await logSuccessfulLogin(admin.id, session.id);
  
  return session;
};
```

#### Layer 3: Session Management
```typescript
// Session configuration
interface SessionConfig {
  maxLifetime: number; // 30 minutes
  absoluteLifetime: number; // 8 hours
  maxConcurrentSessions: number; // 2
  requireReauth: boolean; // Require re-auth for sensitive actions
}

export const validateAdminSession = async (
  sessionId: string
): Promise<AdminSession | null> => {
  const session = await getSession(sessionId);
  
  if (!session) return null;
  
  // Check session lifetime
  const sessionAge = Date.now() - session.createdAt;
  if (sessionAge > config.absoluteLifetime) {
    await revokeSession(sessionId);
    return null;
  }
  
  // Check inactivity
  const inactivity = Date.now() - session.lastActivity;
  if (inactivity > config.maxLifetime) {
    await revokeSession(sessionId);
    return null;
  }
  
  // Check concurrent sessions
  const activeSessions = await getActiveSessions(session.adminId);
  if (activeSessions.length > config.maxConcurrentSessions) {
    // Revoke oldest session
    await revokeSession(activeSessions[0].id);
  }
  
  // Update last activity
  await updateSessionActivity(sessionId);
  
  return session;
};
```

#### Layer 4: Role-Based Access Control (RBAC)
```typescript
// Enhanced RBAC system
interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  inheritsFrom?: string[];
}

// Role definitions
const ROLES: Record<string, Role> = {
  super_admin: {
    id: 'super_admin',
    name: 'Super Admin',
    permissions: [
      { resource: '*', action: '*' }, // Full access
    ],
  },
  content_manager: {
    id: 'content_manager',
    name: 'Content Manager',
    permissions: [
      { resource: 'titles', action: ['create', 'read', 'update', 'delete'] },
      { resource: 'episodes', action: ['create', 'read', 'update', 'delete'] },
      { resource: 'categories', action: ['create', 'read', 'update', 'delete'] },
      { resource: 'genres', action: ['create', 'read', 'update', 'delete'] },
      { resource: 'users', action: ['read'] },
      { resource: 'analytics', action: ['read'] },
    ],
  },
  moderator: {
    id: 'moderator',
    name: 'Moderator',
    permissions: [
      { resource: 'titles', action: ['read', 'update'] },
      { resource: 'reviews', action: ['read', 'update', 'delete'] },
      { resource: 'reports', action: ['read', 'update'] },
    ],
  },
  finance_manager: {
    id: 'finance_manager',
    name: 'Finance Manager',
    permissions: [
      { resource: 'subscriptions', action: ['read', 'update'] },
      { resource: 'payments', action: ['read'] },
      { resource: 'invoices', action: ['read', 'update'] },
      { resource: 'coupons', action: ['create', 'read', 'update', 'delete'] },
      { resource: 'users', action: ['read'] },
      { resource: 'analytics', action: ['read'] },
    ],
  },
  support_agent: {
    id: 'support_agent',
    name: 'Support Agent',
    permissions: [
      { resource: 'users', action: ['read', 'update'] },
      { resource: 'subscriptions', action: ['read'] },
      { resource: 'tickets', action: ['create', 'read', 'update'] },
    ],
  },
  analytics_manager: {
    id: 'analytics_manager',
    name: 'Analytics Manager',
    permissions: [
      { resource: 'analytics', action: ['read'] },
      { resource: 'reports', action: ['read', 'create'] },
      { resource: 'content', action: ['read'] },
      { resource: 'users', action: ['read'] },
    ],
  },
};

export const hasPermission = (
  role: string,
  resource: string,
  action: string
): boolean => {
  const roleConfig = ROLES[role];
  if (!roleConfig) return false;
  
  return roleConfig.permissions.some((permission) => {
    const resourceMatch = permission.resource === '*' || permission.resource === resource;
    const actionMatch = permission.action === '*' || 
      (Array.isArray(permission.action) ? permission.action.includes(action) : permission.action === action);
    
    return resourceMatch && actionMatch;
  });
};
```

## Admin Panel Routes

### Separate Route Structure
```
/admin (separate from user app)
├── /login                  # Admin login
├── /logout                 # Admin logout
├── /dashboard              # Main dashboard
├── /content
│   ├── /titles             # Title management
│   ├── /titles/:id         # Title detail/edit
│   ├── /episodes           # Episode management
│   ├── /categories         # Category management
│   ├── /genres             # Genre management
│   ├── /collections        # Collection management
│   └── /sync               # Content sync
├── /users
│   ├── /list               # User list
│   ├── /:id                # User detail
│   ├── /roles              # Role management
│   └── /devices            # Device management
├── /analytics
│   ├── /overview          # Analytics overview
│   ├── /content           # Content analytics
│   ├── /users             # User analytics
│   ├── /revenue           # Revenue analytics
│   └── /reports           # Custom reports
├── /payments
│   ├── /subscriptions     # Subscription management
│   ├── /invoices          # Invoice management
│   ├── /coupons           # Coupon management
│   └── /webhooks          # Webhook management
├── /moderation
│   ├── /reviews           # Review moderation
│   ├── /reports           # User reports
│   └── /flags             # Content flags
├── /settings
│   ├── /profile           # Admin profile
│   ├── /security          # Security settings
│   ├── /2fa               # 2FA setup
│   ├── /devices           # Device management
│   └── /audit             # Audit logs
└── /system
    ├── /health            # System health
    ├── /logs              # System logs
    ├── /config            # System configuration
    └── /maintenance       # Maintenance mode
```

## Admin Panel Components

### Dashboard Component
```typescript
// src/admin/components/Dashboard.tsx
export const AdminDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: fetchDashboardStats,
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['admin-recent-activity'],
    queryFn: fetchRecentActivity,
  });

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={stats?.totalUsers || 0}
            change={stats?.userGrowth || 0}
            icon={Users}
          />
          <StatCard
            title="Active Subscriptions"
            value={stats?.activeSubscriptions || 0}
            change={stats?.subscriptionGrowth || 0}
            icon={CreditCard}
          />
          <StatCard
            title="Total Titles"
            value={stats?.totalTitles || 0}
            change={stats?.titleGrowth || 0}
            icon={Film}
          />
          <StatCard
            title="Revenue (MTD)"
            value={`$${stats?.revenue || 0}`}
            change={stats?.revenueGrowth || 0}
            icon={DollarSign}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <RevenueChart data={stats?.revenueData} />
          <UserGrowthChart data={stats?.userGrowthData} />
        </div>

        {/* Recent Activity */}
        <ActivityFeed activities={recentActivity} />
      </div>
    </AdminLayout>
  );
};
```

### Content Management Component
```typescript
// src/admin/components/content/TitleManager.tsx
export const TitleManager = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedTitles, setSelectedTitles] = useState<string[]>([]);

  const { data: titles, isLoading } = useQuery({
    queryKey: ['admin-titles', search, filter],
    queryFn: () => fetchTitles({ search, filter }),
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => bulkDeleteTitles(ids),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-titles']);
      setSelectedTitles([]);
    },
  });

  const exportMutation = useMutation({
    mutationFn: (format: 'csv' | 'json') => exportTitles(format),
  });

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Titles</h1>
          <div className="flex gap-2">
            <Button onClick={() => exportMutation.mutate('csv')}>
              Export CSV
            </Button>
            <Button onClick={() => exportMutation.mutate('json')}>
              Export JSON
            </Button>
            <Button onClick={() => navigate('/admin/content/titles/new')}>
              Add Title
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <Input
            placeholder="Search titles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions */}
        {selectedTitles.length > 0 && (
          <div className="bg-secondary p-4 rounded-lg mb-4 flex gap-2">
            <span className="text-sm">{selectedTitles.length} selected</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteMutation.mutate(selectedTitles)}
            >
              Delete Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => bulkPublish(selectedTitles)}
            >
              Publish Selected
            </Button>
          </div>
        )}

        {/* Titles Table */}
        <TitlesTable
          titles={titles}
          isLoading={isLoading}
          selectedTitles={selectedTitles}
          onSelectTitle={(id) => {
            setSelectedTitles((prev) =>
              prev.includes(id)
                ? prev.filter((t) => t !== id)
                : [...prev, id]
            );
          }}
        />
      </div>
    </AdminLayout>
  );
};
```

### User Management Component
```typescript
// src/admin/components/users/UserManager.tsx
export const UserManager = () => {
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const { data: users } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => fetchUsers({ search }),
  });

  const { data: userDetail } = useQuery({
    queryKey: ['admin-user-detail', selectedUser],
    queryFn: () => fetchUserDetail(selectedUser),
    enabled: !!selectedUser,
  });

  const grantRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      grantUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      queryClient.invalidateQueries(['admin-user-detail']);
    },
  });

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Users</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User List */}
          <div className="lg:col-span-1">
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-4"
            />
            <UserList
              users={users}
              selectedUser={selectedUser}
              onSelectUser={setSelectedUser}
            />
          </div>

          {/* User Detail */}
          <div className="lg:col-span-2">
            {userDetail ? (
              <UserDetail
                user={userDetail}
                onGrantRole={(role) =>
                  grantRoleMutation.mutate({ userId: selectedUser, role })
                }
              />
            ) : (
              <div className="text-center text-muted-foreground py-12">
                Select a user to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
```

## Security Features Implementation

### Two-Factor Authentication (2FA)
```typescript
// 2FA Setup Component
export const TwoFactorSetup = () => {
  const [step, setStep] = useState<'setup' | 'verify'>('setup');
  const [secret, setSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const setupMutation = useMutation({
    mutationFn: () => setupTwoFactor(),
    onSuccess: (data) => {
      setSecret(data.secret);
      setQrCode(data.qrCode);
      setBackupCodes(data.backupCodes);
      setStep('verify');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (code: string) => verifyTwoFactorCode(code),
    onSuccess: () => {
      toast.success('2FA enabled successfully');
      navigate('/admin/settings/security');
    },
  });

  if (step === 'setup') {
    return (
      <div className="max-w-md">
        <h2 className="text-2xl font-bold mb-4">Set up Two-Factor Authentication</h2>
        <p className="text-muted-foreground mb-6">
          Scan the QR code with your authenticator app to enable 2FA.
        </p>
        <Button onClick={() => setupMutation.mutate()}>
          Generate QR Code
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <h2 className="text-2xl font-bold mb-4">Verify Two-Factor Authentication</h2>
      <img src={qrCode} alt="QR Code" className="mb-4" />
      <Input
        placeholder="Enter 6-digit code"
        maxLength={6}
        onChange={(e) => verifyMutation.mutate(e.target.value)}
      />
      <div className="mt-4">
        <h3 className="font-semibold mb-2">Backup Codes</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Save these codes in a safe place. You can use them to access your account
          if you lose your authenticator device.
        </p>
        <div className="bg-secondary p-4 rounded">
          {backupCodes.map((code) => (
            <div key={code} className="font-mono">
              {code}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

### Device Management
```typescript
// Device Management Component
export const DeviceManagement = () => {
  const { data: devices } = useQuery({
    queryKey: ['admin-devices'],
    queryFn: fetchAdminDevices,
  });

  const revokeMutation = useMutation({
    mutationFn: (deviceId: string) => revokeDevice(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-devices']);
      toast.success('Device revoked');
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Trusted Devices</h2>
      {devices?.map((device) => (
        <div
          key={device.id}
          className="flex items-center justify-between p-4 border rounded-lg"
        >
          <div>
            <div className="font-semibold">{device.name}</div>
            <div className="text-sm text-muted-foreground">
              {device.userAgent} • Last used: {formatDate(device.lastUsed)}
            </div>
          </div>
          {!device.current && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => revokeMutation.mutate(device.id)}
            >
              Revoke
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};
```

### Audit Log Viewer
```typescript
// Audit Log Component
export const AuditLogViewer = () => {
  const [filters, setFilters] = useState({
    action: '',
    userId: '',
    dateFrom: '',
    dateTo: '',
  });

  const { data: logs } = useQuery({
    queryKey: ['admin-audit-logs', filters],
    queryFn: () => fetchAuditLogs(filters),
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Audit Logs</h2>
      
      {/* Filters */}
      <div className="flex gap-4">
        <Input
          placeholder="Filter by action"
          value={filters.action}
          onChange={(e) => setFilters({ ...filters, action: e.target.value })}
        />
        <Input
          placeholder="Filter by user ID"
          value={filters.userId}
          onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
        />
        <Input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
        />
        <Input
          type="date"
          value={filters.dateTo}
          onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
        />
      </div>

      {/* Logs Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Admin</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead>IP Address</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs?.map((log) => (
            <TableRow key={log.id}>
              <TableCell>{formatDate(log.timestamp)}</TableCell>
              <TableCell>{log.adminEmail}</TableCell>
              <TableCell>{log.action}</TableCell>
              <TableCell>{log.entityType}</TableCell>
              <TableCell>{log.ipAddress}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => showLogDetails(log)}
                >
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
```

## Admin API Endpoints

### Authentication Endpoints
```typescript
// POST /admin/api/auth/login
export const adminLogin = async (credentials: AdminCredentials) => {
  const response = await fetch('/admin/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  return response.json();
};

// POST /admin/api/auth/logout
export const adminLogout = async () => {
  const response = await fetch('/admin/api/auth/logout', {
    method: 'POST',
  });
  return response.json();
};

// POST /admin/api/auth/refresh
export const refreshAdminSession = async () => {
  const response = await fetch('/admin/api/auth/refresh', {
    method: 'POST',
  });
  return response.json();
};

// POST /admin/api/auth/verify-2fa
export const verifyTwoFactor = async (code: string) => {
  const response = await fetch('/admin/api/auth/verify-2fa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  return response.json();
};
```

### Content Management Endpoints
```typescript
// GET /admin/api/content/titles
export const fetchTitles = async (params: FetchTitlesParams) => {
  const response = await fetch(`/admin/api/content/titles?${new URLSearchParams(params)}`);
  return response.json();
};

// POST /admin/api/content/titles
export const createTitle = async (title: CreateTitleData) => {
  const response = await fetch('/admin/api/content/titles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(title),
  });
  return response.json();
};

// PUT /admin/api/content/titles/:id
export const updateTitle = async (id: string, title: UpdateTitleData) => {
  const response = await fetch(`/admin/api/content/titles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(title),
  });
  return response.json();
};

// DELETE /admin/api/content/titles/:id
export const deleteTitle = async (id: string) => {
  const response = await fetch(`/admin/api/content/titles/${id}`, {
    method: 'DELETE',
  });
  return response.json();
};

// POST /admin/api/content/titles/bulk-delete
export const bulkDeleteTitles = async (ids: string[]) => {
  const response = await fetch('/admin/api/content/titles/bulk-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  return response.json();
};

// POST /admin/api/content/titles/bulk-publish
export const bulkPublishTitles = async (ids: string[]) => {
  const response = await fetch('/admin/api/content/titles/bulk-publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  return response.json();
};
```

### User Management Endpoints
```typescript
// GET /admin/api/users
export const fetchUsers = async (params: FetchUsersParams) => {
  const response = await fetch(`/admin/api/users?${new URLSearchParams(params)}`);
  return response.json();
};

// GET /admin/api/users/:id
export const fetchUserDetail = async (id: string) => {
  const response = await fetch(`/admin/api/users/${id}`);
  return response.json();
};

// POST /admin/api/users/:id/roles
export const grantUserRole = async (userId: string, role: string) => {
  const response = await fetch(`/admin/api/users/${userId}/roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  return response.json();
};

// DELETE /admin/api/users/:id/roles/:role
export const revokeUserRole = async (userId: string, role: string) => {
  const response = await fetch(`/admin/api/users/${userId}/roles/${role}`, {
    method: 'DELETE',
  });
  return response.json();
};
```

## Admin Panel Styling

### Dark Theme (Default)
```css
/* src/admin/styles/admin.css */
:root {
  --admin-bg-primary: #0a0a0a;
  --admin-bg-secondary: #1a1a1a;
  --admin-bg-tertiary: #2a2a2a;
  --admin-text-primary: #ffffff;
  --admin-text-secondary: #a0a0a0;
  --admin-border: #333333;
  --admin-primary: #e50914;
  --admin-primary-hover: #b20710;
  --admin-success: #22c55e;
  --admin-warning: #f59e0b;
  --admin-danger: #ef4444;
}

.admin-layout {
  background-color: var(--admin-bg-primary);
  color: var(--admin-text-primary);
  min-height: 100vh;
}

.admin-sidebar {
  background-color: var(--admin-bg-secondary);
  border-right: 1px solid var(--admin-border);
}

.admin-card {
  background-color: var(--admin-bg-secondary);
  border: 1px solid var(--admin-border);
  border-radius: 8px;
}

.admin-button {
  background-color: var(--admin-primary);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
}

.admin-button:hover {
  background-color: var(--admin-primary-hover);
}
```

## Deployment Configuration

### Separate Build Process
```typescript
// admin/vite.config.ts
export default defineConfig({
  build: {
    outDir: 'dist/admin',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'src/admin/main.tsx',
      },
    },
  },
  server: {
    port: 3001,
    proxy: {
      '/admin/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
```

### Environment Variables
```bash
# .env.admin
VITE_ADMIN_API_URL=https://admin-api.streamflix.com
VITE_ADMIN_ENABLED=true
VITE_ADMIN_IP_WHITELIST_ENABLED=true
VITE_ADMIN_2FA_REQUIRED=true
VITE_ADMIN_SESSION_TIMEOUT=1800000
VITE_ADMIN_MAX_CONCURRENT_SESSIONS=2
```

## Security Best Practices

### 1. Content Security Policy (CSP)
```typescript
// src/admin/middleware/csp.ts
export const cspMiddleware = (req: Request, res: Response) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https://admin-api.streamflix.com; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';"
  );
};
```

### 2. Rate Limiting
```typescript
// src/admin/middleware/rate-limit.ts
export const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for whitelisted IPs
    const clientIP = getClientIP(req);
    return isWhitelistedIP(clientIP);
  },
});
```

### 3. Request Validation
```typescript
// src/admin/middleware/validation.ts
export const validateAdminRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }
  };
};
```

## Monitoring and Alerting

### Admin Activity Monitoring
```typescript
// src/admin/services/monitoring.ts
export const monitorAdminActivity = (adminId: string, action: string) => {
  // Log to audit system
  logAuditEvent({
    adminId,
    action,
    timestamp: new Date(),
    ipAddress: getClientIP(),
    userAgent: getUserAgent(),
  });

  // Check for suspicious patterns
  if (isSuspiciousActivity(adminId, action)) {
    sendSecurityAlert({
      adminId,
      action,
      severity: 'high',
      message: 'Suspicious admin activity detected',
    });
  }
};
```

### Performance Monitoring
```typescript
// src/admin/services/performance.ts
export const trackAdminPerformance = (metric: string, value: number) => {
  // Send to monitoring service
  sendMetric({
    name: `admin_${metric}`,
    value,
    timestamp: new Date(),
  });
};
```

## Migration from Current Admin Panel

### Phase 1: Security Enhancement (1-2 weeks)
- Implement 2FA for existing admin routes
- Add session management
- Implement audit logging
- Add IP whitelisting option

### Phase 2: Separate Admin Panel (2-3 weeks)
- Create separate admin subdomain
- Implement separate authentication
- Migrate admin routes to new structure
- Update RBAC system

### Phase 3: Enhanced Features (2-3 weeks)
- Add device management
- Implement advanced audit logging
- Add security monitoring
- Implement admin analytics

### Phase 4: Testing & Deployment (1-2 weeks)
- Security audit
- Penetration testing
- Performance testing
- Gradual rollout

## Technology Stack Summary

| Category | Technology | Purpose |
|----------|-----------|---------|
| Framework | React 19 | UI framework |
| Routing | TanStack Router | Routing |
| State | TanStack Query | Server state |
| State | Zustand | Client state |
| Styling | Tailwind CSS | Styling |
| Components | Radix UI | UI components |
| Forms | React Hook Form | Form handling |
| Validation | Zod | Schema validation |
| Icons | Lucide React | Icons |
| Charts | Recharts | Data visualization |
| Tables | TanStack Table | Data tables |
| Auth | Custom implementation | Authentication |
| 2FA | otpauth | TOTP implementation |
| Monitoring | Custom + Sentry | Error tracking |
