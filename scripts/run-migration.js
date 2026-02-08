// Run migration script
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  const migrationFile = path.join(__dirname, '../supabase/migrations/013_add_filter_columns.sql');
  const sql = fs.readFileSync(migrationFile, 'utf8');

  console.log('Running migration 013_add_filter_columns.sql...');

  // Split by semicolon and execute each statement
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    if (statement.includes('COMMENT')) continue; // Skip comments

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
      if (error) {
        // Try direct query if RPC doesn't exist
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        // For ALTER TABLE, we need to use Supabase SQL editor or direct connection
        console.log('⚠️  Please run this migration in Supabase SQL Editor:');
        console.log(sql);
        break;
      }
    } catch (err) {
      console.error('Error:', err.message);
    }
  }
}

// Note: Supabase migrations should be run via SQL Editor
// This script is just a helper to show what needs to be run
console.log('📋 Migration file ready. Please run it in Supabase SQL Editor.');
runMigration();
