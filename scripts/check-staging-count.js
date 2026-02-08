require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStagingCount() {
  const { count, error } = await supabase
    .from('photos_staging')
    .select('*', { count: 'exact', head: true });

  console.log(`Total photos in staging: ${count}`);
  
  // Get breakdown by place_name
  const { data: byPlace } = await supabase
    .from('photos_staging')
    .select('place_name')
    .eq('review_status', 'pending');
  
  const placeCounts = {};
  byPlace?.forEach(p => {
    placeCounts[p.place_name] = (placeCounts[p.place_name] || 0) + 1;
  });
  
  console.log('\nBy place:');
  Object.entries(placeCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([name, count]) => {
      console.log(`  ${name}: ${count} photos`);
    });
}

checkStagingCount();
