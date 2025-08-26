# YCCC Nursing Inventory - Troubleshooting Guide

## Issues with Editing and Deleting Items

If you're experiencing problems with editing or deleting existing inventory items, this guide will help you identify and resolve the issues.

## Quick Fix - Use Enhanced Version

**First, try using the enhanced version of the application:**
- Navigate to: `https://your-domain.com/yccc-nurse-stash/enhanced`
- This version includes better error handling, debugging tools, and undo/redo functionality

## Common Issues and Solutions

### 1. Authentication Problems

**Symptoms:**
- Can add new items but cannot edit/delete existing ones
- Getting "Permission denied" errors
- Changes don't save

**Solutions:**
1. **Check Email Verification:**
   - Make sure your email is verified in Supabase
   - Check your email for verification links
   - Re-send verification email if needed

2. **Confirm Email Domain:**
   - Only `@mainecc.edu` emails are whitelisted
   - Contact admin to add other domains if needed

3. **Re-authenticate:**
   - Sign out and sign back in
   - Clear browser cache and cookies
   - Try in an incognito/private window

### 2. Database Permission Issues

**Symptoms:**
- Database connection errors
- "Row Level Security" policy violations
- Operations failing silently

**Solutions:**
1. **Use Debug Panel:**
   - Go to enhanced version (`/enhanced`)
   - Click "Debug" button in header
   - Run diagnostics to see detailed error information

2. **Check RLS Policies:**
   - Ensure your user account has proper permissions
   - Verify email is in whitelist table

### 3. Session Expiration

**Symptoms:**
- Was working before, now getting errors
- Intermittent failures

**Solutions:**
1. **Refresh Session:**
   - Sign out and sign back in
   - Refresh the page
   - Check if session has expired

## Using the Enhanced Version Features

### Undo/Redo Functionality
- **Undo Button:** Reverses the last action (add, edit, delete)
- **Redo Button:** Re-applies an undone action
- **History Panel:** Shows all recent actions with timestamps

### Debug Panel
1. Click "Debug" button in the header
2. Click "Run Diagnostics"
3. Review the results:
   - ✅ Green checkmarks = Working correctly
   - ❌ Red X marks = Issues found
   - ⚠️ Yellow warnings = Potential problems

### Better Error Messages
- Enhanced version shows detailed error messages
- Console logging for debugging
- Retry mechanisms for failed operations

## Step-by-Step Debugging Process

### Step 1: Verify Authentication
1. Go to `/enhanced` route
2. Click "Debug" button
3. Run diagnostics
4. Check "Authentication Status" section:
   - Should show "Authenticated: Yes"
   - Email should be confirmed
   - User ID should be present

### Step 2: Test Permissions
1. In debug panel, check "Permissions Test" section:
   - Read Permission should be "Granted"
   - Insert Permission should be "Granted"
2. If denied, check email whitelist section

### Step 3: Test Database Connection
1. Check "Database Connection" section in debug panel
2. Should show "Database connection successful"
3. If failed, there may be a network or configuration issue

### Step 4: Try Operations with Better Logging
1. Use enhanced version for all operations
2. Check browser console (F12) for detailed error messages
3. Try editing/deleting with debug panel open

## Database Schema Issues

### Row Level Security (RLS) Policies
The database uses strict RLS policies that require:
- Verified email address (`email_confirmed_at` must be set)
- Email must be in whitelist (`@mainecc.edu` domain)
- Proper authentication session

### Checking Whitelist Status
1. Use debug panel to see whitelisted emails
2. Ensure your email domain is included
3. Contact admin if your domain needs to be added

## Manual Database Fixes (Admin Only)

### Add Email to Whitelist
```sql
INSERT INTO email_whitelist (email, domain, notes) 
VALUES ('user@domain.edu', 'domain.edu', 'Added for troubleshooting');
```

### Check User Email Verification
```sql
SELECT email, email_confirmed_at 
FROM auth.users 
WHERE email = 'user@domain.edu';
```

### Verify RLS Policies
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'inventory_items';
```

## Contact Information

If you continue to experience issues:

1. **First:** Use the debug panel and copy the diagnostic information
2. **Then:** Contact the system administrator with:
   - Debug panel output
   - Specific error messages
   - Steps to reproduce the issue
   - Your email address used for login

## Advanced Troubleshooting

### Browser Console Debugging
1. Open browser developer tools (F12)
2. Go to Console tab
3. Try the operation that's failing
4. Look for error messages in red
5. Copy any error messages for support

### Network Tab Analysis
1. Open browser developer tools (F12)
2. Go to Network tab
3. Try the failing operation
4. Look for failed requests (red status codes)
5. Check response details for error messages

### Clear Application Data
1. Open browser developer tools (F12)
2. Go to Application tab (Chrome) or Storage tab (Firefox)
3. Clear Local Storage, Session Storage, and Cookies for the site
4. Refresh page and try again

## Prevention Tips

1. **Always verify your email** when first signing up
2. **Use the enhanced version** for better error handling
3. **Don't leave the application open for extended periods** (sessions expire)
4. **Use supported browsers** (Chrome, Firefox, Safari, Edge)
5. **Keep browser updated** for best compatibility

## Version Comparison

| Feature | Original Version | Enhanced Version |
|---------|------------------|------------------|
| Error Messages | Basic | Detailed |
| Debugging | None | Debug Panel |
| Undo/Redo | No | Yes |
| History Tracking | No | Yes |
| Console Logging | Minimal | Comprehensive |
| Permission Checking | Basic | Advanced |
| Retry Logic | No | Yes |

**Recommendation:** Use the enhanced version (`/enhanced`) for all operations until issues are resolved.