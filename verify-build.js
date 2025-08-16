[build]
  command = "npm run build"
  publish = "build"

[context.production.environment]
  NODE_ENV = "production"
#!/usr/bin/env node

/**
 * Build Verification Script for Netlify Deployment
 * This script checks common issues that cause deployment failures
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Verifying build configuration...\n');

// Check if required files exist
const requiredFiles = [
  'package.json',
  'netlify.toml',
  'public/_redirects',
  'src/main.tsx',
  'index.html'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} is missing`);
    allFilesExist = false;
  }
});

// Check package.json scripts
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (packageJson.scripts && packageJson.scripts.build) {
    console.log(`✅ Build script found: ${packageJson.scripts.build}`);
  } else {
    console.log('❌ Build script missing in package.json');
    allFilesExist = false;
  }
  
  // Check for required dependencies
  const requiredDeps = ['react', 'react-dom', 'vite', 'typescript'];
  const missingDeps = requiredDeps.filter(dep => 
    !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
  );
  
  if (missingDeps.length === 0) {
    console.log('✅ All required dependencies found');
  } else {
    console.log(`❌ Missing dependencies: ${missingDeps.join(', ')}`);
    allFilesExist = false;
  }
  
} catch (error) {
  console.log('❌ Error reading package.json:', error.message);
  allFilesExist = false;
}

// Check netlify.toml configuration
try {
  const netlifyConfig = fs.readFileSync('netlify.toml', 'utf8');
  
  if (netlifyConfig.includes('publish = "dist"')) {
    console.log('✅ Netlify publish directory configured correctly');
  } else {
    console.log('❌ Netlify publish directory not set to "dist"');
  }
  
  if (netlifyConfig.includes('npm ci && npm run build') || netlifyConfig.includes('npm run build')) {
    console.log('✅ Netlify build command configured');
  } else {
    console.log('❌ Netlify build command not configured');
  }
  
} catch (error) {
  console.log('❌ Error reading netlify.toml:', error.message);
}

// Check environment file
if (fs.existsSync('.env.production')) {
  console.log('✅ .env.production file exists');
  
  try {
    const envContent = fs.readFileSync('.env.production', 'utf8');
    const requiredEnvVars = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(envVar => 
      !envContent.includes(envVar)
    );
    
    if (missingEnvVars.length === 0) {
      console.log('✅ All required environment variables found in .env.production');
    } else {
      console.log(`⚠️  Missing environment variables in .env.production: ${missingEnvVars.join(', ')}`);
      console.log('   Make sure to set these in Netlify dashboard');
    }
    
  } catch (error) {
    console.log('❌ Error reading .env.production:', error.message);
  }
} else {
  console.log('⚠️  .env.production file not found (environment variables should be set in Netlify)');
}

// Check TypeScript configuration
if (fs.existsSync('tsconfig.json')) {
  console.log('✅ TypeScript configuration found');
} else {
  console.log('❌ tsconfig.json missing');
  allFilesExist = false;
}

// Check Vite configuration
if (fs.existsSync('vite.config.ts')) {
  console.log('✅ Vite configuration found');
} else {
  console.log('❌ vite.config.ts missing');
  allFilesExist = false;
}

console.log('\n' + '='.repeat(50));

if (allFilesExist) {
  console.log('🎉 Build configuration looks good!');
  console.log('\n📋 Next steps for Netlify deployment:');
  console.log('1. Ensure environment variables are set in Netlify dashboard');
  console.log('2. Add your Netlify domain to Firebase authorized domains');
  console.log('3. Try deploying with "Clear cache and deploy"');
} else {
  console.log('⚠️  Some issues found. Please fix them before deploying.');
}

console.log('\n🔗 For detailed troubleshooting, see: netlify-deploy-fix.md');