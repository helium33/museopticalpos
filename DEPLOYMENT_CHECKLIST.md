# 🚀 Netlify Deployment Checklist

## ✅ Step-by-Step Fix for "Origin returned error code"

### 1. Set Environment Variables in Netlify (CRITICAL)

Go to your Netlify site dashboard → **Site Settings** → **Environment Variables** and add:

```
VITE_FIREBASE_API_KEY=AIzaSyCnR5SMrO8vhO1lEPRx1Ctg6gxyhYfVMp0
VITE_FIREBASE_AUTH_DOMAIN=store-b8644.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=store-b8644
VITE_FIREBASE_STORAGE_BUCKET=store-b8644.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=353628807781
VITE_FIREBASE_APP_ID=1:353628807781:web:950616402c6e1157729c8c
VITE_FIREBASE_MEASUREMENT_ID=G-YL7NLQBLG9
```

### 2. Authorize Netlify Domain in Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **store-b8644**
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Click **Add domain**
5. Add your Netlify URL (e.g., `your-app-name.netlify.app`)

### 3. Clear Netlify Cache and Redeploy

1. In Netlify dashboard, go to **Deploys**
2. Click **Trigger deploy** → **Clear cache and deploy**

### 4. Verify Build Settings

In Netlify **Site Settings** → **Build & deploy** → **Build settings**:

- **Build command**: `npm ci && npm run build`
- **Publish directory**: `dist`
- **Node version**: `18` (in Environment variables: `NODE_VERSION = 18`)

### 5. Check Deploy Logs

If deployment still fails:
1. Go to **Deploys** in Netlify dashboard
2. Click on the failed deploy
3. Check the deploy log for specific error messages
4. Look for:
   - Missing environment variables
   - Build failures
   - Memory issues
   - Firebase connection errors

## 🔧 Common Issues and Solutions

### Issue: "Environment variable undefined"
**Solution**: Double-check all VITE_ variables are set in Netlify

### Issue: "Firebase configuration error"
**Solution**: Verify Firebase project ID and authorized domains

### Issue: "Build exceeded memory limit"
**Solution**: Already fixed with `NODE_OPTIONS = "--max-old-space-size=4096"`

### Issue: "404 on page refresh"
**Solution**: Already fixed with `_redirects` file and netlify.toml redirects

## 🧪 Test Locally First

Before deploying, test locally:

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Test the build
npm run preview
```

## 📞 If Still Having Issues

1. **Manual Deploy**: Build locally and drag `dist` folder to Netlify
2. **Alternative Platform**: Use Vercel (vercel.json is already configured)
3. **Simplified Deploy**: Temporarily comment out complex Firebase features

## 🎯 Success Indicators

After successful deployment, you should see:
- ✅ Site loads without errors
- ✅ Firebase authentication works
- ✅ All routes accessible (no 404 on refresh)
- ✅ Data loads from Firestore
- ✅ No console errors

---

**Most Common Fix**: The "origin returned error code" is usually caused by missing environment variables in Netlify. Make sure Step 1 is completed first!