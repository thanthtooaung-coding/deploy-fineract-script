# Session Expired Issue: Privacy Policy Page Navigation

## Problem Description

When users navigate to the Privacy Policy page (or Terms/Cookies pages) from the footer, they are redirected to the "Session Expired" page, even though these pages should be publicly accessible without authentication.

## Root Cause

The issue is a **route mismatch** between:
1. The actual route paths used in the application
2. The public routes list in the authentication middleware

### Route Mismatch Details

| Component | Footer Link | Actual Route | Middleware Public Route | Status |
|-----------|-------------|--------------|------------------------|--------|
| Privacy Policy | `/privacy` | `/privacy` | `/privacy-policy` | ❌ Mismatch |
| Terms & Conditions | `/terms` | `/terms` | `/terms-and-conditions` | ❌ Mismatch |
| Cookie Policy | `/cookies` | `/cookies` | Not listed | ❌ Missing |

### Technical Flow

1. **User clicks Privacy Policy link in footer** (`MainFooter.tsx` line 52)
   - Link points to: `/privacy`
   - Actual page exists at: `src/app/[locale]/(main)/privacy/page.tsx`

2. **Middleware intercepts the request** (`src/proxy.ts`)
   - Extracts pathname: `/privacy` (after locale removal)
   - Checks against `publicRoutes` array (line 10-33)
   - Finds `/privacy-policy` but NOT `/privacy`

3. **Route not recognized as public**
   - `isPublicRoute` check fails (line 89-91)
   - Middleware proceeds to authentication verification (line 97)

4. **Authentication check fails**
   - `verifyAuthentication()` function (line 37-66) is called
   - Checks for valid JWT token and validates with auth server
   - If token is missing, expired, or validation fails → returns `false`

5. **Redirect to session expired**
   - Since `isAuthenticated === false` (line 99)
   - User is redirected to `/{locale}/session-expired` (line 100)

## Affected Files

### 1. Middleware Configuration
**File**: `src/proxy.ts`
- **Lines 10-33**: `publicRoutes` array definition
- **Issue**: Routes don't match actual application routes

```typescript
const publicRoutes = [
    "/",
    "/about",
    "/contact",
    "/services",
    "/privacy-policy",        // ❌ Should be "/privacy"
    "/terms-and-conditions",  // ❌ Should be "/terms"
    // ❌ Missing "/cookies"
    "/session-expired",
    // ... other routes
];
```

### 2. Footer Component
**File**: `src/components/layout/main/MainFooter.tsx`
- **Line 52**: Privacy Policy link (`href="/privacy"`)
- **Line 60**: Terms link (`href="/terms"`)
- **Line 68**: Cookies link (`href="/cookies"`)

### 3. Actual Route Pages
- `src/app/[locale]/(main)/privacy/page.tsx` - Privacy Policy page
- `src/app/[locale]/(main)/terms/page.tsx` - Terms & Conditions page
- `src/app/[locale]/(main)/cookies/page.tsx` - Cookie Policy page

## Impact

- **User Experience**: Users cannot access legal pages without being logged in
- **Accessibility**: Legal pages should be publicly accessible per standard web practices
- **SEO**: Public pages should be crawlable without authentication
- **Compliance**: Privacy policies and terms should be accessible to all users

## Solution

Update the `publicRoutes` array in `src/proxy.ts` to match the actual route paths:

```typescript
const publicRoutes = [
    "/",
    "/about",
    "/contact",
    "/services",
    "/privacy",      // ✅ Changed from "/privacy-policy"
    "/terms",        // ✅ Changed from "/terms-and-conditions"
    "/cookies",      // ✅ Added missing route
    "/session-expired",
    "/service-unavailable",
    "/login",
    "/sign-up",
    "/forgot-password",
    "/verify-otp",
    "/find-work",
    "/find-talent",
    // ... admin routes
];
```

## Verification Steps

After applying the fix:

1. **Test as logged-out user**:
   - Navigate to `/privacy` → Should load without redirect
   - Navigate to `/terms` → Should load without redirect
   - Navigate to `/cookies` → Should load without redirect

2. **Test as logged-in user**:
   - Navigate to `/privacy` → Should load normally
   - Navigate to `/terms` → Should load normally
   - Navigate to `/cookies` → Should load normally

3. **Test from footer links**:
   - Click "Privacy Policy" in footer → Should navigate successfully
   - Click "Terms" in footer → Should navigate successfully
   - Click "Cookie Policy" in footer → Should navigate successfully

## Additional Notes

### Why This Happened

The route names in the middleware (`/privacy-policy`, `/terms-and-conditions`) suggest they may have been planned or used at some point, but the actual implementation uses shorter, cleaner URLs (`/privacy`, `/terms`). This inconsistency was not caught during development.

### Prevention

To prevent similar issues in the future:

1. **Route Registry**: Maintain a single source of truth for all routes
2. **Automated Testing**: Add tests that verify public routes are accessible without authentication
3. **Type Safety**: Consider using TypeScript enums or constants for route definitions
4. **Code Review**: Ensure route definitions match between components and middleware

## Related Code References

- **Middleware**: `src/proxy.ts` (lines 10-33, 89-91, 97-101)
- **Footer**: `src/components/layout/main/MainFooter.tsx` (lines 50-73)
- **Session Expired Page**: `src/app/[locale]/session-expired/page.tsx`
- **Authentication Check**: `src/proxy.ts` `verifyAuthentication()` function (lines 37-66)

---

**Documentation Created**: 2024
**Issue Type**: Route Configuration Mismatch
**Severity**: High (Affects user experience and accessibility)
**Status**: Identified - Requires Fix
