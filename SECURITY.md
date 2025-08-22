# Security Policy

## Version 1.0 - Stable (Tagged for Backup)

This document outlines the security measures implemented in the YCCC Nursing Inventory system.

## Authentication & Authorization

### Email Whitelist System
- **Whitelisted Domains**: Only `@mainecc.edu` emails are allowed
- **Initial Whitelist**: `john.barr@mainecc.edu`
- **Admin Control**: Admins can add/remove emails from whitelist

### Email Verification
- **Required**: All users must verify their email before accessing the system
- **Secure Tokens**: Cryptographically secure verification tokens
- **Expiration**: Verification links expire after 24 hours
- **Single Use**: Verification tokens can only be used once

### Multi-Layer Security

#### 1. Supabase Row Level Security (RLS)
- **User Isolation**: Users can only access their own data
- **Role-Based Access**: Different permission levels for different user roles
- **Real-time Validation**: Security rules enforced at the database level

#### 2. Client-Side Validation
- **Email Format**: Strict email validation
- **Domain Checking**: Real-time domain verification
- **Input Sanitization**: All inputs sanitized to prevent XSS

#### 3. Server-Side Security
- **Rate Limiting**: Prevents brute force attacks
- **CSRF Protection**: Cross-site request forgery protection
- **SQL Injection Prevention**: Parameterized queries only

## Security Features

### Password Requirements
- Minimum 12 characters
- Must include uppercase, lowercase, numbers, and special characters
- Password strength meter
- Common password detection

### Session Management
- **Secure Cookies**: HttpOnly, Secure, SameSite flags
- **Session Timeout**: Auto-logout after 30 minutes of inactivity
- **Token Rotation**: Refresh tokens rotated regularly

### Audit Logging
- All authentication attempts logged
- Inventory changes tracked with user attribution
- Failed login attempts monitored
- Suspicious activity alerts

## Reporting Security Issues

If you discover a security vulnerability, please email: john.barr@mainecc.edu

Do not create public GitHub issues for security vulnerabilities.