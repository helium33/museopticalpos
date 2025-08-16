# Netlify Deployment Fix Guide

## Issue: "Origin returned error code" - Deploy failed

This error typically occurs due to one of the following issues:

### 1. Environment Variables Missing in Netlify

**Solution:** Add these environment variables in Netlify Dashboard:

1. Go to your Netlify site dashboard
2. Navigate to **Site Settings** → **Environment Variables**
3. Add the following variables:

```
VITE_FIREBASE_API_KEY=AIzaSyCnR5SMrO8vhO1lEPRx1Ctg6gxyhYfVMp0
VITE_FIREBASE_AUTH_DOMAIN=store-b8644.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=store-b8644
VITE_FIREBASE_STORAGE_BUCKET=store-b8644.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=353628807781
VITE_FIREBASE_APP_ID=1:353628807781:web:950616402c6e1157729c8c
VITE_FIREBASE_MEASUREMENT_ID=G-YL7NLQBLG9
```

### 2. Build Command Issues

**Current build settings should be:**
- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Node version: `18`

### 3. Firebase Domain Authorization

**Solution:** Add your Netlify domain to Firebase:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `store-b8644`
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Add your Netlify domain (e.g., `your-app-name.netlify.app`)
5. Also add any custom domains you plan to use

### 4. Memory Issues During Build

The updated `netlify.toml` now includes `NODE_OPTIONS = "--max-old-space-size=4096"` to handle large builds.

### 5. Quick Deployment Steps

1. **Clear Netlify Cache:**
   - In Netlify dashboard, go to **Deploys**
   - Click **Trigger deploy** → **Clear cache and deploy**

2. **Manual Deploy (if needed):**
   - Build locally: `npm run build`
   - Drag and drop the `dist` folder to Netlify

3. **Check Deploy Logs:**
   - Look for specific error messages in the deploy logs
   - Common issues: missing environment variables, build failures, memory issues

### 6. Test Deployment Locally

Run these commands to test locally:

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Preview the build
npm run preview
```

### 7. Common Error Messages and Solutions

**"Failed to resolve import":**
- Check if all dependencies are installed
- Run `npm install` again

**"Environment variable not defined":**
- Ensure all VITE_ prefixed variables are set in Netlify

**"Build exceeded memory limit":**
- The NODE_OPTIONS setting should fix this

**"Firebase configuration error":**
- Verify Firebase project settings
- Check if domain is authorized

### 8. Alternative Deployment Method

If Netlify continues to fail, try these alternatives:

1. **Manual Deploy:**
   - Run `npm run build` locally
   - Upload the `dist` folder manually to Netlify

2. **Vercel Deployment:**
   - The project includes `vercel.json` configuration
   - Can be deployed to Vercel as an alternative

### 9. Verification Checklist

After successful deployment, verify:
- [ ] Site loads without errors
- [ ] Firebase authentication works
- [ ] All routes work (no 404 on refresh)
- [ ] Environment variables are loaded
- [ ] Firebase connection is established

### 10. Emergency Fallback

If all else fails, you can deploy a simplified version:

1. Comment out complex Firebase operations temporarily
2. Deploy basic version first
3. Gradually add features back

## Need Help?

If you're still experiencing issues, please provide:
1. The exact error message from Netlify deploy logs
2. Your Netlify site URL
3. Screenshot of the error