// ============================================
// SCRAPER RUNNER - Loads env then runs TypeScript
// ============================================

require('dotenv').config({ path: '.env.local' });

console.log('✓ Environment variables loaded');
console.log('  SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING');
console.log('  SUPABASE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING');
console.log('');

// Now use tsx to run the TypeScript file
const { spawn } = require('child_process');
const path = require('path');

const scriptPath = path.join(__dirname, 'instagram-scraper.ts');
const tsx = spawn('npx', ['tsx', scriptPath], {
  stdio: 'inherit',
  env: process.env,
  shell: true
});

tsx.on('exit', (code) => {
  process.exit(code);
});
