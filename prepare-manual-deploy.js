import fs from 'fs';
import path from 'path';

console.log('🔧 Preparing manual deployment...\n');

// Create _headers file content for Netlify
const headersContent = `/*
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
  Access-Control-Allow-Headers: Content-Type, Authorization

/static/*
  Cache-Control: public, max-age=31536000, immutable

/*.js
  Cache-Control: public, max-age=31536000, immutable

/*.css
  Cache-Control: public, max-age=31536000, immutable

/*.woff2
  Cache-Control: public, max-age=31536000, immutable`;

// Check if dist folder exists
if (!fs.existsSync('dist')) {
  console.log('❌ dist folder not found. Please run "npm run build" first.');
  process.exit(1);
}

// Create _headers file in dist folder
try {
  fs.writeFileSync('dist/_headers', headersContent);
  console.log('✅ Created dist/_headers file');
} catch (error) {
  console.log('❌ Failed to create _headers file:', error.message);
}

// Verify _redirects file exists in dist
if (fs.existsSync('dist/_redirects')) {
  console.log('✅ _redirects file exists in dist');
} else {
  // Copy _redirects from public to dist
  if (fs.existsSync('public/_redirects')) {
    fs.copyFileSync('public/_redirects', 'dist/_redirects');
    console.log('✅ Copied _redirects to dist folder');
  } else {
    // Create _redirects file
    fs.writeFileSync('dist/_redirects', '/* /index.html 200');
    console.log('✅ Created _redirects file in dist');
  }
}

// Check required files in dist
const requiredFiles = ['index.html', 'assets'];
let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join('dist', file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} exists in dist`);
  } else {
    console.log(`❌ ${file} missing in dist`);
    allFilesExist = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allFilesExist) {
  console.log('🎉 Manual deployment package ready!');
  console.log('\n📋 Next steps:');
  console.log('1. Go to https://netlify.com');
  console.log('2. Drag and drop the entire "dist" folder');
  console.log('3. Wait for deployment to complete');
  console.log('4. Add your Netlify URL to Firebase authorized domains');
  console.log('\n🔗 For detailed steps, see: manual-deploy-fix.md');
} else {
  console.log('⚠️  Some files are missing. Please run "npm run build" first.');
}

console.log('\n🚨 IMPORTANT: After deployment, you MUST add your Netlify URL to Firebase authorized domains!');
console.log('   Go to: Firebase Console → Authentication → Settings → Authorized domains');