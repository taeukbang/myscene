#!/usr/bin/env node

/**
 * Photo Crawler Runner
 * Loads environment variables and runs the TypeScript crawler
 */

const path = require('path');
const { spawn } = require('child_process');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '../../../.env.local') });

console.log('✓ Environment variables loaded');
console.log('  SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('  SUPABASE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');
console.log('');

// Run the TypeScript crawler using tsx
const scriptPath = path.join(__dirname, 'photo-crawler.ts');
const tsx = spawn('npx', ['tsx', scriptPath], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});

tsx.on('error', (error) => {
  console.error('Failed to start crawler:', error);
  process.exit(1);
});

tsx.on('exit', (code) => {
  process.exit(code || 0);
});
