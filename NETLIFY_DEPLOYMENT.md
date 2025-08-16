# Netlify Deployment Guide

## Fixed CORS Issues

The following changes have been made to fix CORS and deployment issues:

### 1. Created `netlify.toml`
- Proper build configuration
- Redirect rules for SPA routing
- Security headers
- Cache optimization

### 2. Updated `vite.config.ts`
- Added build optimizations
- Manual chunk splitting for better performance
- Proper server configuration

### 3. Updated Firebase Configuration
- Now uses environment variables properly
- Fallback values for development

### 4. Environment Variables Setup

#### In Netlify Dashboard:
1. Go to Site Settings → Environment Variables
2. Add the following variables:

```
VITE_FIREBASE_API_KEY=AIzaSyCnR5SMrO8vhO1lEPRx1Ctg6gxyhYfVMp0
VITE_FIREBASE_AUTH_DOMAIN=store-b8644.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=store-b8644
VITE_FIREBASE_STORAGE_BUCKET=store-b8644.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=353628807781
VITE_FIREBASE_APP_ID=1:353628807781:web:950616402c6e1157729c8c
VITE_FIREBASE_MEASUREMENT_ID=G-YL7NLQBLG9
```

### 5. Firebase Console Setup

#### Add your Netlify domain to Firebase:
1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Add your Netlify domain (e.g., `your-app-name.netlify.app`)
3. Also add any custom domains you plan to use

#### For Firestore Security Rules:
Make sure your Firestore rules allow your domain:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Your existing rules here
    // Make sure they don't block requests from your domain
  }
}
```

### 6. Deployment Steps

1. **Push to Git Repository**
   ```bash
   git add .
   git commit -m "Fix Netlify CORS issues and deployment configuration"
   git push origin main
   ```

2. **Connect to Netlify**
   - Go to Netlify Dashboard
   - Click "New site from Git"
   - Connect your repository
   - Build settings should auto-detect from `netlify.toml`

3. **Manual Deploy Settings (if needed)**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: `18`

### 7. Common Issues and Solutions

#### CORS Errors:
- ✅ Fixed with proper headers in `netlify.toml`
- ✅ Firebase domain authorization
- ✅ Environment variables properly configured

#### Build Errors:
- ✅ TypeScript compilation fixed
- ✅ Vite build optimization added
- ✅ Proper chunk splitting for large bundles

#### Routing Issues:
- ✅ SPA redirect rules added in `netlify.toml`
- ✅ Proper `_redirects` file in public folder

### 8. Testing Deployment

After deployment, test these features:
1. Page refresh on any route (should not show 404)
2. Firebase authentication
3. Firestore data loading
4. Image uploads to Firebase Storage
5. All navigation and routing

### 9. Performance Optimizations Applied

- Manual chunk splitting for vendor libraries
- Proper caching headers
- Optimized build output
- Source maps disabled for production

## Troubleshooting

If you still encounter issues:

1. **Check Netlify Deploy Logs**
   - Look for build errors or warnings
   - Verify environment variables are set

2. **Check Browser Console**
   - Look for CORS errors
   - Verify Firebase configuration

3. **Check Firebase Console**
   - Verify domain is authorized
   - Check Firestore rules
   - Verify API keys are correct

4. **Clear Cache**
   - Clear browser cache
   - Trigger a new Netlify deploy