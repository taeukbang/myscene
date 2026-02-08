// Test filter on a small sample
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testMigration() {
  // Check if filter columns exist
  const { data, error } = await supabase
    .from('photos_staging')
    .select('filter_score, filter_reason, is_filtered, perceptual_hash')
    .limit(1);

  if (error) {
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.log('❌ Migration not applied. Please run 013_add_filter_columns.sql in Supabase SQL Editor');
      return false;
    }
    console.error('Error:', error);
    return false;
  }

  console.log('✅ Migration applied - filter columns exist');
  return true;
}

testMigration().then(ok => {
  if (ok) {
    console.log('\n📋 Ready to run filter. Execute: npm run filter-photos');
  } else {
    console.log('\n📋 Please apply migration first, then run: npm run filter-photos');
  }
  process.exit(ok ? 0 : 1);
});
