#!/usr/bin/env node

/**
 * Netlify Deployment Checker
 * Verifies all requirements before deployment
 */

import fs from 'fs';
import path from 'path';

console.log('🚀 Netlify Deployment Checker\n');

let allChecksPass = true;
const issues = [];
const warnings = [];

// Check 1: Required files
console.log('📁 Checking required files...');
const requiredFiles = [
  'package.json',
  'netlify.toml', 
  'public/_redirects',
  'src/main.tsx',
  'index.html',
  'vite.config.ts'
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    issues.push(`Missing required file: ${file}`);
    allChecksPass = false;
  }
});

// Check 2: Package.json configuration
console.log('\n📦 Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (packageJson.scripts?.build) {
    console.log(`  ✅ Build script: ${packageJson.scripts.build}`);
  } else {
    console.log('  ❌ Build script missing');
    issues.push('Build script missing in package.json');
    allChecksPass = false;
  }
  
  // Check dependencies
  const criticalDeps = ['react', 'react-dom', 'vite', 'typescript'];
  const missingDeps = criticalDeps.filter(dep => 
    !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
  );
  
  if (missingDeps.length === 0) {
    console.log('  ✅ All critical dependencies present');
  } else {
    console.log(`  ❌ Missing dependencies: ${missingDeps.join(', ')}`);
    issues.push(`Missing dependencies: ${missingDeps.join(', ')}`);
    allChecksPass = false;
  }
  
} catch (error) {
  console.log('  ❌ Error reading package.json');
  issues.push('Cannot read package.json');
  allChecksPass = false;
}

// Check 3: Netlify configuration
console.log('\n⚙️  Checking netlify.toml...');
try {
  const netlifyConfig = fs.readFileSync('netlify.toml', 'utf8');
  
  if (netlifyConfig.includes('publish = "dist"')) {
    console.log('  ✅ Publish directory configured');
  } else {
    console.log('  ❌ Publish directory not set to "dist"');
    issues.push('Netlify publish directory should be "dist"');
  }
  
  if (netlifyConfig.includes('npm ci && npm run build') || netlifyConfig.includes('npm run build')) {
    console.log('  ✅ Build command configured');
  } else {
    console.log('  ❌ Build command not configured');
    issues.push('Netlify build command not configured');
  }
  
  if (netlifyConfig.includes('NODE_VERSION')) {
    console.log('  ✅ Node version specified');
  } else {
    console.log('  ⚠️  Node version not specified');
    warnings.push('Consider specifying Node version in netlify.toml');
  }
  
} catch (error) {
  console.log('  ❌ Error reading netlify.toml');
  issues.push('Cannot read netlify.toml');
  allChecksPass = false;
}

// Check 4: Environment variables template
console.log('\n🔐 Checking environment configuration...');
if (fs.existsSync('.env.production')) {
  console.log('  ✅ .env.production exists');
  
  try {
    const envContent = fs.readFileSync('.env.production', 'utf8');
    const requiredEnvVars = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN', 
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(envVar => 
      !envContent.includes(envVar)
    );
    
    if (missingEnvVars.length === 0) {
      console.log('  ✅ All Firebase environment variables present');
    } else {
      console.log(`  ⚠️  Missing env vars: ${missingEnvVars.join(', ')}`);
      warnings.push(`Missing environment variables: ${missingEnvVars.join(', ')}`);
    }
    
  } catch (error) {
    console.log('  ❌ Error reading .env.production');
    warnings.push('Cannot read .env.production file');
  }
} else {
  console.log('  ⚠️  .env.production not found');
  warnings.push('.env.production file not found - ensure env vars are set in Netlify dashboard');
}

// Check 5: Firebase configuration
console.log('\n🔥 Checking Firebase configuration...');
try {
  const firebaseConfig = fs.readFileSync('src/lib/firebase.ts', 'utf8');
  
  if (firebaseConfig.includes('import.meta.env.VITE_FIREBASE_API_KEY')) {
    console.log('  ✅ Environment variables properly used in Firebase config');
  } else {
    console.log('  ⚠️  Firebase config might not use environment variables');
    warnings.push('Verify Firebase config uses environment variables');
  }
  
} catch (error) {
  console.log('  ⚠️  Cannot check Firebase configuration');
  warnings.push('Cannot verify Firebase configuration');
}

// Check 6: Build test
console.log('\n🔨 Testing build process...');
try {
  // Check if dist folder exists (from previous build)
  if (fs.existsSync('dist')) {
    console.log('  ✅ Previous build artifacts found');
    
    // Check if index.html exists in dist
    if (fs.existsSync('dist/index.html')) {
      console.log('  ✅ Build output appears valid');
    } else {
      console.log('  ⚠️  Build output might be incomplete');
      warnings.push('Build output appears incomplete - try running npm run build');
    }
  } else {
    console.log('  ⚠️  No build artifacts found');
    warnings.push('Run "npm run build" to test build process');
  }
} catch (error) {
  console.log('  ⚠️  Cannot check build artifacts');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 DEPLOYMENT READINESS SUMMARY');
console.log('='.repeat(60));

if (allChecksPass && issues.length === 0) {
  console.log('🎉 ALL CHECKS PASSED! Ready for deployment.');
} else {
  console.log('⚠️  ISSUES FOUND - Fix before deploying:');
  issues.forEach(issue => console.log(`   ❌ ${issue}`));
}

if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS (recommended to address):');
  warnings.forEach(warning => console.log(`   ⚠️  ${warning}`));
}

console.log('\n📋 DEPLOYMENT STEPS:');
console.log('1. Fix any issues listed above');
console.log('2. Set environment variables in Netlify dashboard:');
console.log('   - VITE_FIREBASE_API_KEY');
console.log('   - VITE_FIREBASE_AUTH_DOMAIN');
console.log('   - VITE_FIREBASE_PROJECT_ID');
console.log('   - VITE_FIREBASE_STORAGE_BUCKET');
console.log('   - VITE_FIREBASE_MESSAGING_SENDER_ID');
console.log('   - VITE_FIREBASE_APP_ID');
console.log('   - VITE_FIREBASE_MEASUREMENT_ID');
console.log('3. Add Netlify domain to Firebase authorized domains');
console.log('4. Deploy with "Clear cache and deploy"');

console.log('\n🔗 For detailed help: NETLIFY_DEPLOYMENT_SOLUTION.md');

// Exit with appropriate code
process.exit(allChecksPass ? 0 : 1);