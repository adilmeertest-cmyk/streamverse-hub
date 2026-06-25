# Enterprise Security Architecture for StreamFlix Platform

## Overview
This document describes the comprehensive enterprise security architecture for a Netflix-style streaming platform, including JWT authentication, refresh tokens, RBAC permissions, API protection, CSRF/XSS/SQL injection protection, audit logs, login monitoring, and two-factor authentication for admins.

## Security Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    Security Layers                               │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Network Security                                      │
│  - WAF (Web Application Firewall)                               │
│  - DDoS Protection                                              │
│  - IP Whitelisting (Admin Panel)                                │
│  - TLS 1.3 Encryption                                           │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Authentication & Authorization                        │
│  - JWT Access Tokens (15 min)                                   │
│  - Refresh Tokens (30 days)                                     │
│  - 2FA (TOTP) for Admins                                        │
│  - RBAC (Role-Based Access Control)                            │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: Application Security                                  │
│  - Input Validation (Zod)                                       │
│  - SQL Injection Prevention (Parameterized Queries)             │
│  - XSS Protection (Content Security Policy)                     │
│  - CSRF Protection (Token-based)                                │
├─────────────────────────────────────────────────────────────────┤
│  Layer 4: Data Security                                         │
│  - Encryption at Rest (AES-256)                                 │
│  - Encryption in Transit (TLS 1.3)                              │
│  - PII Protection (GDPR/CCPA)                                   │
│  - Secrets Management (AWS Secrets Manager)                    │
├─────────────────────────────────────────────────────────────────┤
│  Layer 5: Monitoring & Auditing                                 │
│  - Audit Logs (All Admin Actions)                               │
│  - Login Monitoring (Failed Attempts)                           │
│  - Security Alerts (Suspicious Activity)                        │
│  - Penetration Testing (Regular)                                │
└─────────────────────────────────────────────────────────────────┘
```

## Authentication System

### JWT Token Structure
```typescript
interface JWTPayload {
  sub: string;           // User ID
  iat: number;           // Issued at (timestamp)
  exp: number;           // Expiration (timestamp)
  jti: string;           // JWT ID (for revocation)
  typ: string;           // Token type ('access' | 'refresh')
  aud: string;           // Audience ('user' | 'admin')
  roles: string[];       // User roles
  permissions: string[]; // Granular permissions
  deviceId: string;      // Device identifier
  ip: string;            // IP address at issue time
}

interface JWTHeader {
  alg: string;           // Algorithm (RS256)
  typ: string;           // Token type (JWT)
  kid: string;           // Key ID (for key rotation)
}
```

### Token Generation
```typescript
export class TokenManager {
  private privateKey: string;
  private publicKey: string;
  private keyId: string;

  constructor(config: TokenConfig) {
    this.privateKey = config.privateKey;
    this.publicKey = config.publicKey;
    this.keyId = config.keyId;
  }

  generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'jti'>): string {
    const now = Math.floor(Date.now() / 1000);
    const fullPayload: JWTPayload = {
      ...payload,
      iat: now,
      exp: now + 15 * 60, // 15 minutes
      jti: this.generateJTI(),
      typ: 'access',
    };

    return jwt.sign(fullPayload, this.privateKey, {
      algorithm: 'RS256',
      keyid: this.keyId,
      header: { kid: this.keyId },
    });
  }

  generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'jti'>): string {
    const now = Math.floor(Date.now() / 1000);
    const fullPayload: JWTPayload = {
      ...payload,
      iat: now,
      exp: now + 30 * 24 * 60 * 60, // 30 days
      jti: this.generateJTI(),
      typ: 'refresh',
    };

    return jwt.sign(fullPayload, this.privateKey, {
      algorithm: 'RS256',
      keyid: this.keyId,
      header: { kid: this.keyId },
    });
  }

  verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
      }) as JWTPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  private generateJTI(): string {
    return crypto.randomUUID();
  }
}
```

### Token Rotation
```typescript
export class TokenRotationService {
  private tokenManager: TokenManager;
  private tokenBlacklist: TokenBlacklist;

  constructor(tokenManager: TokenManager, tokenBlacklist: TokenBlacklist) {
    this.tokenManager = tokenManager;
    this.tokenBlacklist = tokenBlacklist;
  }

  async rotateRefreshToken(
    oldRefreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string } | null> {
    const payload = this.tokenManager.verifyToken(oldRefreshToken);
    
    if (!payload || payload.typ !== 'refresh') {
      return null;
    }

    // Check if token is blacklisted
    const isBlacklisted = await this.tokenBlacklist.isBlacklisted(payload.jti);
    if (isBlacklisted) {
      return null;
    }

    // Blacklist old refresh token
    await this.tokenBlacklist.blacklist(payload.jti, payload.exp);

    // Generate new tokens
    const newPayload = {
      sub: payload.sub,
      roles: payload.roles,
      permissions: payload.permissions,
      deviceId: payload.deviceId,
      ip: payload.ip,
      aud: payload.aud,
    };

    const accessToken = this.tokenManager.generateAccessToken(newPayload);
    const refreshToken = this.tokenManager.generateRefreshToken(newPayload);

    return { accessToken, refreshToken };
  }
}

class TokenBlacklist {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async blacklist(jti: string, exp: number): Promise<void> {
    const ttl = exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.redis.setex(`blacklist:${jti}`, ttl, '1');
    }
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    const result = await this.redis.get(`blacklist:${jti}`);
    return result !== null;
  }
}
```

## Two-Factor Authentication (2FA)

### TOTP Implementation
```typescript
export class TwoFactorAuthService {
  private issuer: string;

  constructor(issuer: string) {
    this.issuer = issuer;
  }

  generateSecret(userId: string): TwoFactorSetup {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(userId, this.issuer, secret);
    const qrCode = QRCode.toDataURL(otpauthUrl);
    const backupCodes = this.generateBackupCodes();

    return {
      secret,
      qrCode,
      backupCodes,
    };
  }

  verifyCode(secret: string, token: string): boolean {
    return authenticator.verify({
      token,
      secret,
      encoding: 'base32',
    });
  }

  verifyBackupCode(userId: string, code: string): boolean {
    // Check against stored backup codes
    const storedCodes = this.getStoredBackupCodes(userId);
    const index = storedCodes.indexOf(code);
    
    if (index !== -1) {
      // Remove used backup code
      storedCodes.splice(index, 1);
      this.updateStoredBackupCodes(userId, storedCodes);
      return true;
    }

    return false;
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  private getStoredBackupCodes(userId: string): string[] {
    // Retrieve from secure storage
    return [];
  }

  private updateStoredBackupCodes(userId: string, codes: string[]): void {
    // Update in secure storage
  }
}

interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}
```

### 2FA Middleware
```typescript
export const requireTwoFactor = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const user = await getCurrentUser(req);
  
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Check if user has 2FA enabled
  const has2FA = await userHasTwoFactorEnabled(user.id);
  
  if (has2FA) {
    const twoFactorCode = req.headers['x-2fa-code'] as string;
    
    if (!twoFactorCode) {
      res.status(403).json({ error: '2FA code required' });
      return;
    }

    const isValid = await verifyTwoFactorCode(user.id, twoFactorCode);
    
    if (!isValid) {
      await logFailed2FAAttempt(user.id);
      res.status(403).json({ error: 'Invalid 2FA code' });
      return;
    }
  }

  next();
};
```

## Role-Based Access Control (RBAC)

### Permission System
```typescript
export class RBACService {
  private rolePermissions: Map<string, Permission[]> = new Map();

  constructor() {
    this.initializeRoles();
  }

  private initializeRoles(): void {
    // Super Admin - Full access
    this.rolePermissions.set('super_admin', [
      { resource: '*', action: '*' },
    ]);

    // Content Manager - Content management
    this.rolePermissions.set('content_manager', [
      { resource: 'titles', action: ['create', 'read', 'update', 'delete'] },
      { resource: 'episodes', action: ['create', 'read', 'update', 'delete'] },
      { resource: 'categories', action: ['create', 'read', 'update', 'delete'] },
      { resource: 'genres', action: ['create', 'read', 'update', 'delete'] },
      { resource: 'users', action: ['read'] },
      { resource: 'analytics', action: ['read'] },
    ]);

    // Moderator - Content moderation
    this.rolePermissions.set('moderator', [
      { resource: 'titles', action: ['read', 'update'] },
      { resource: 'reviews', action: ['read', 'update', 'delete'] },
      { resource: 'reports', action: ['read', 'update'] },
    ]);

    // Finance Manager - Payments and subscriptions
    this.rolePermissions.set('finance_manager', [
      { resource: 'subscriptions', action: ['read', 'update'] },
      { resource: 'payments', action: ['read'] },
      { resource: 'invoices', action: ['read', 'update'] },
      { resource: 'coupons', action: ['create', 'read', 'update', 'delete'] },
      { resource: 'users', action: ['read'] },
      { resource: 'analytics', action: ['read'] },
    ]);

    // Support Agent - User support
    this.rolePermissions.set('support_agent', [
      { resource: 'users', action: ['read', 'update'] },
      { resource: 'subscriptions', action: ['read'] },
      { resource: 'tickets', action: ['create', 'read', 'update'] },
    ]);

    // Analytics Manager - Analytics and reports
    this.rolePermissions.set('analytics_manager', [
      { resource: 'analytics', action: ['read'] },
      { resource: 'reports', action: ['read', 'create'] },
      { resource: 'content', action: ['read'] },
      { resource: 'users', action: ['read'] },
    ]);
  }

  hasPermission(
    role: string,
    resource: string,
    action: string
  ): boolean {
    const permissions = this.rolePermissions.get(role);
    
    if (!permissions) return false;

    return permissions.some((permission) => {
      const resourceMatch = permission.resource === '*' || permission.resource === resource;
      const actionMatch = permission.action === '*' || 
        (Array.isArray(permission.action) ? permission.action.includes(action) : permission.action === action);
      
      return resourceMatch && actionMatch;
    });
  }

  hasAnyPermission(
    role: string,
    resource: string,
    actions: string[]
  ): boolean {
    return actions.some(action => this.hasPermission(role, resource, action));
  }

  hasAllPermissions(
    role: string,
    resource: string,
    actions: string[]
  ): boolean {
    return actions.every(action => this.hasPermission(role, resource, action));
  }
}

interface Permission {
  resource: string;
  action: string | string[];
}
```

### RBAC Middleware
```typescript
export const requirePermission = (
  resource: string,
  action: string
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = await getCurrentUser(req);
    
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const rbac = new RBACService();
    const hasPermission = user.roles.some(role =>
      rbac.hasPermission(role, resource, action)
    );

    if (!hasPermission) {
      await logUnauthorizedAccess(user.id, resource, action);
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    next();
  };
};

export const requireAnyPermission = (
  resource: string,
  actions: string[]
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = await getCurrentUser(req);
    
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const rbac = new RBACService();
    const hasPermission = user.roles.some(role =>
      rbac.hasAnyPermission(role, resource, actions)
    );

    if (!hasPermission) {
      await logUnauthorizedAccess(user.id, resource, actions.join(','));
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    next();
  };
};
```

## Audit Logging

### Audit Log System
```typescript
export class AuditLogger {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  async log(entry: AuditLogEntry): Promise<void> {
    await this.db.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, payload, ip_address, user_agent, severity, risk_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        entry.actorId,
        entry.action,
        entry.entityType,
        entry.entityId,
        JSON.stringify(entry.payload),
        entry.ipAddress,
        entry.userAgent,
        entry.severity || 'info',
        entry.riskScore || 0,
      ]
    );

    // Check if action requires immediate alert
    if (entry.riskScore >= 80) {
      await this.sendSecurityAlert(entry);
    }
  }

  async getLogs(filters: AuditLogFilters): Promise<AuditLogEntry[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.actorId) {
      conditions.push(`actor_id = $${paramIndex++}`);
      params.push(filters.actorId);
    }

    if (filters.action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(filters.action);
    }

    if (filters.entityType) {
      conditions.push(`entity_type = $${paramIndex++}`);
      params.push(filters.entityType);
    }

    if (filters.startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(filters.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitClause = filters.limit ? `LIMIT ${filters.limit}` : '';
    const offsetClause = filters.offset ? `OFFSET ${filters.offset}` : '';

    const query = `
      SELECT * FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      ${limitClause}
      ${offsetClause}
    `;

    return await this.db.query(query, params);
  }

  private async sendSecurityAlert(entry: AuditLogEntry): Promise<void> {
    const admins = await getAdminUsers();
    
    for (const admin of admins) {
      await sendNotification(admin.id, {
        type: 'security_alert',
        title: 'Security Alert',
        body: `High-risk action detected: ${entry.action}`,
        severity: 'high',
        link: '/admin/settings/audit',
      });
    }
  }
}

interface AuditLogEntry {
  actorId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  riskScore?: number;
}

interface AuditLogFilters {
  actorId?: string;
  action?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}
```

### Risk Assessment
```typescript
export class RiskAssessment {
  private riskRules: RiskRule[] = [
    {
      action: 'delete',
      entityTypes: ['titles', 'users'],
      baseScore: 70,
    },
    {
      action: 'update',
      entityTypes: ['subscription_plans'],
      baseScore: 60,
    },
    {
      action: 'grant_role',
      entityTypes: ['users'],
      baseScore: 80,
    },
    {
      action: 'bulk_delete',
      entityTypes: ['titles'],
      baseScore: 90,
    },
  ];

  assessRisk(entry: AuditLogEntry): number {
    let riskScore = 0;

    // Base score from action
    const rule = this.riskRules.find(
      r => r.action === entry.action && 
           (!r.entityTypes || r.entityTypes.includes(entry.entityType || ''))
    );

    if (rule) {
      riskScore += rule.baseScore;
    }

    // Increase risk for bulk operations
    if (entry.payload?.bulk && entry.payload.count > 10) {
      riskScore += 20;
    }

    // Increase risk for sensitive data access
    if (entry.entityType === 'users' && entry.action === 'read') {
      riskScore += 10;
    }

    // Decrease risk for routine operations
    if (['read', 'list'].includes(entry.action)) {
      riskScore = Math.max(0, riskScore - 20);
    }

    return Math.min(100, riskScore);
  }
}

interface RiskRule {
  action: string;
  entityTypes?: string[];
  baseScore: number;
}
```

## Login Monitoring

### Failed Login Tracking
```typescript
export class LoginMonitor {
  private db: DatabaseConnection;
  private maxAttempts = 5;
  private lockoutDuration = 15 * 60 * 1000; // 15 minutes

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  async recordAttempt(attempt: LoginAttempt): Promise<void> {
    await this.db.query(
      `INSERT INTO login_attempts (user_id, email, ip_address, user_agent, success, attempt_type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        attempt.userId,
        attempt.email,
        attempt.ipAddress,
        attempt.userAgent,
        attempt.success,
        attempt.attemptType,
      ]
    );

    if (!attempt.success) {
      await this.handleFailedAttempt(attempt);
    }
  }

  private async handleFailedAttempt(attempt: LoginAttempt): Promise<void> {
    const recentFailures = await this.getRecentFailures(attempt.email, attempt.ipAddress);
    
    if (recentFailures.length >= this.maxAttempts) {
      await this.lockoutAccount(attempt.email, attempt.ipAddress);
      await this.sendLockoutAlert(attempt);
    }
  }

  private async getRecentFailures(
    email: string,
    ipAddress: string
  ): Promise<LoginAttempt[]> {
    const result = await this.db.query(
      `SELECT * FROM login_attempts
       WHERE (email = $1 OR ip_address = $2)
         AND success = false
         AND created_at > NOW() - INTERVAL '15 minutes'
       ORDER BY created_at DESC`,
      [email, ipAddress]
    );
    return result;
  }

  private async lockoutAccount(email: string, ipAddress: string): Promise<void> {
    await this.db.query(
      `UPDATE profiles
       SET locked_until = NOW() + INTERVAL '15 minutes',
           failed_login_attempts = failed_login_attempts + 1
       WHERE email = $1`,
      [email]
    );

    // Also lockout IP
    await this.db.query(
      `INSERT INTO rate_limits (identifier, endpoint, request_count, window_start, blocked_until)
       VALUES ($1, 'login', $2, NOW(), NOW() + INTERVAL '15 minutes')
       ON CONFLICT (identifier, endpoint) DO UPDATE
       SET blocked_until = NOW() + INTERVAL '15 minutes'`,
      [ipAddress, this.maxAttempts]
    );
  }

  private async sendLockoutAlert(attempt: LoginAttempt): Promise<void> {
    const user = await getUserByEmail(attempt.email);
    
    if (user) {
      await sendNotification(user.id, {
        type: 'security_alert',
        title: 'Account Locked',
        body: 'Your account has been locked due to multiple failed login attempts',
        severity: 'high',
      });
    }

    // Alert admins
    const admins = await getAdminUsers();
    for (const admin of admins) {
      await sendNotification(admin.id, {
        type: 'security_alert',
        title: 'Suspicious Login Activity',
        body: `Multiple failed login attempts detected for ${attempt.email}`,
        severity: 'high',
      });
    }
  }

  async isAccountLocked(email: string): Promise<boolean> {
    const result = await this.db.query(
      `SELECT locked_until FROM profiles WHERE email = $1`,
      [email]
    );

    if (result.length === 0) return false;

    const lockedUntil = result[0].locked_until;
    if (!lockedUntil) return false;

    return new Date(lockedUntil) > new Date();
  }
}

interface LoginAttempt {
  userId?: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  attemptType: 'password' | 'oauth' | '2fa';
}
```

## Input Validation

### Schema Validation
```typescript
export const validationSchemas = {
  // User registration
  register: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string()
      .min(12, 'Password must be at least 12 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    displayName: z.string().min(2).max(50),
  }),

  // Title creation
  createTitle: z.object({
    title: z.string().min(2).max(255),
    slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
    kind: z.enum(['movie', 'series', 'drama', 'cartoon', 'documentary']),
    synopsis: z.string().max(5000),
    releaseYear: z.number().min(1900).max(new Date().getFullYear() + 5),
    runtime: z.number().min(1).max(1000).optional(),
    posterUrl: z.string().url().optional(),
    backdropUrl: z.string().url().optional(),
    videoUrl: z.string().url().optional(),
    genres: z.array(z.string()).min(1),
  }),

  // Search query
  search: z.object({
    query: z.string().min(2).max(100),
    kind: z.enum(['movie', 'series', 'drama', 'cartoon', 'documentary']).optional(),
    year: z.number().min(1900).max(new Date().getFullYear() + 5).optional(),
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(20),
  }),
};

export const validateInput = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T => {
  return schema.parse(data);
};
```

### SQL Injection Prevention
```typescript
export class SecureQueryBuilder {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  async query<T>(
    sql: string,
    params: any[]
  ): Promise<T[]> {
    // Always use parameterized queries
    return await this.db.query(sql, params);
  }

  async queryWithPagination<T>(
    sql: string,
    params: any[],
    page: number,
    limit: number
  ): Promise<PaginatedResult<T>> {
    const offset = (page - 1) * limit;
    const countSql = `SELECT COUNT(*) as total FROM (${sql}) as count_query`;
    const dataSql = `${sql} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    const [countResult, dataResult] = await Promise.all([
      this.query<{ total: number }>(countSql, params),
      this.query<T>(dataSql, [...params, limit, offset]),
    ]);

    return {
      data: dataResult,
      total: countResult[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].total / limit),
    };
  }
}
```

## XSS Protection

### Content Security Policy
```typescript
export const getCSPHeaders = (nonce: string): Headers => {
  const headers = new Headers();
  
  headers.set(
    'Content-Security-Policy',
    [
      `default-src 'self'`,
      `script-src 'self' 'nonce-${nonce}' 'unsafe-inline' 'unsafe-eval'`,
      `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
      `img-src 'self' data: https: blob:`,
      `font-src 'self' data:`,
      `connect-src 'self' https://api.streamflix.com https://cdn.streamflix.com`,
      `media-src 'self' https: blob:`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `frame-ancestors 'none'`,
      `block-all-mixed-content`,
      `upgrade-insecure-requests`,
    ].join('; ')
  );

  return headers;
};
```

### Input Sanitization
```typescript
import DOMPurify from 'dompurify';

export class InputSanitizer {
  static sanitizeHTML(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
      ALLOWED_ATTR: ['href', 'title', 'target'],
    });
  }

  static sanitizeString(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, ''); // Remove event handlers
  }

  static sanitizeURL(url: string): string {
    try {
      const parsed = new URL(url);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return '';
      }

      // Remove javascript: and data: URLs
      if (url.startsWith('javascript:') || url.startsWith('data:')) {
        return '';
      }

      return url;
    } catch {
      return '';
    }
  }
}
```

## CSRF Protection

### CSRF Token Management
```typescript
export class CSRFProtection {
  private tokenSecret: string;

  constructor(tokenSecret: string) {
    this.tokenSecret = tokenSecret;
  }

  generateToken(userId: string): string {
    const timestamp = Date.now();
    const token = crypto
      .createHmac('sha256', this.tokenSecret)
      .update(`${userId}:${timestamp}`)
      .digest('hex');

    return `${timestamp}:${token}`;
  }

  verifyToken(token: string, userId: string): boolean {
    const [timestamp, hash] = token.split(':');
    
    if (!timestamp || !hash) return false;

    // Check token age (max 1 hour)
    const tokenAge = Date.now() - parseInt(timestamp);
    if (tokenAge > 3600000) return false;

    // Verify hash
    const expectedHash = crypto
      .createHmac('sha256', this.tokenSecret)
      .update(`${userId}:${timestamp}`)
      .digest('hex');

    return hash === expectedHash;
  }
}
```

## Secrets Management

### AWS Secrets Manager Integration
```typescript
export class SecretsManager {
  private client: SecretsManagerClient;

  constructor(region: string = 'us-east-1') {
    this.client = new SecretsManagerClient({ region });
  }

  async getSecret(secretName: string): Promise<string> {
    const command = new GetSecretValueCommand({
      SecretId: secretName,
    });

    const response = await this.client.send(command);
    
    if (response.SecretString) {
      return response.SecretString;
    }

    throw new Error('Secret not found');
  }

  async getSecretJSON<T>(secretName: string): Promise<T> {
    const secretString = await this.getSecret(secretName);
    return JSON.parse(secretString) as T;
  }

  async updateSecret(secretName: string, secretValue: string): Promise<void> {
    const command = new UpdateSecretCommand({
      SecretId: secretName,
      SecretString: secretValue,
    });

    await this.client.send(command);
  }
}
```

## Security Headers

### Security Headers Middleware
```typescript
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // HTTPS enforcement
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  next();
};
```

## Rate Limiting

### Rate Limiter Implementation
```typescript
export class RateLimiter {
  private redis: Redis;
  private limits: Map<string, RateLimitConfig> = new Map();

  constructor(redis: Redis) {
    this.redis = redis;
    this.initializeLimits();
  }

  private initializeLimits(): void {
    this.limits.set('api', {
      requests: 1000,
      window: 60, // 1 minute
    });

    this.limits.set('login', {
      requests: 5,
      window: 300, // 5 minutes
    });

    this.limits.set('password_reset', {
      requests: 3,
      window: 3600, // 1 hour
    });

    this.limits.set('content_upload', {
      requests: 10,
      window: 3600, // 1 hour
    });
  }

  async checkLimit(
    identifier: string,
    endpoint: string
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const config = this.limits.get(endpoint) || this.limits.get('api')!;
    const key = `ratelimit:${endpoint}:${identifier}`;

    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, config.window);
    }

    const allowed = current <= config.requests;
    const remaining = Math.max(0, config.requests - current);
    const resetAt = Date.now() + config.window * 1000;

    return { allowed, remaining, resetAt };
  }
}

interface RateLimitConfig {
  requests: number;
  window: number; // seconds
}
```

## Technology Stack Summary

| Category | Technology | Purpose |
|----------|-----------|---------|
| Authentication | JWT (RS256) | Token-based auth |
| 2FA | OTPAuth | TOTP implementation |
| Validation | Zod | Schema validation |
| Sanitization | DOMPurify | XSS prevention |
| Secrets | AWS Secrets Manager | Secure storage |
| Rate Limiting | Redis | Request limiting |
| Audit Logging | PostgreSQL | Activity tracking |
| WAF | AWS WAF | Web firewall |
| DDoS Protection | AWS Shield | DDoS mitigation |
| Encryption | AES-256 | Data encryption |
