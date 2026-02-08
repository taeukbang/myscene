require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkFilterResults() {
  console.log('📊 Checking filter results...\n');

  // Total photos
  const { count: total } = await supabase
    .from('photos_staging')
    .select('*', { count: 'exact', head: true });

  // Filtered photos
  const { count: filtered } = await supabase
    .from('photos_staging')
    .select('*', { count: 'exact', head: true })
    .eq('is_filtered', true);

  // Passed photos
  const { count: passed } = await supabase
    .from('photos_staging')
    .select('*', { count: 'exact', head: true })
    .eq('is_filtered', false);

  // Pending photos (not yet filtered)
  const { count: pending } = await supabase
    .from('photos_staging')
    .select('*', { count: 'exact', head: true })
    .is('is_filtered', null);

  console.log(`Total photos: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Filtered: ${filtered}`);
  console.log(`⏳ Pending: ${pending || 0}`);

  // Top filter reasons
  const { data: reasons } = await supabase
    .from('photos_staging')
    .select('filter_reason')
    .eq('is_filtered', true)
    .not('filter_reason', 'is', null);

  if (reasons && reasons.length > 0) {
    const reasonCounts = {};
    reasons.forEach(r => {
      const reason = r.filter_reason || 'Unknown';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });

    console.log('\n📋 Top filter reasons:');
    Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([reason, count]) => {
        console.log(`   ${reason}: ${count}`);
      });
  }

  // Average filter score
  const { data: scores } = await supabase
    .from('photos_staging')
    .select('filter_score')
    .eq('is_filtered', false)
    .not('filter_score', 'is', null);

  if (scores && scores.length > 0) {
    const avgScore = scores.reduce((sum, s) => sum + (s.filter_score || 0), 0) / scores.length;
    console.log(`\n⭐ Average quality score: ${avgScore.toFixed(1)}/100`);
  }
}

checkFilterResults();
