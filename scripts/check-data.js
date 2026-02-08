require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkData() {
  console.log('📊 Checking database data...\n');
  
  // Check places
  const { data: places, error: placesError } = await supabase
    .from('places')
    .select('place_id, name, category')
    .limit(10);
  
  console.log(`📍 Places: ${places?.length || 0} records`);
  if (places?.length > 0) {
    places.forEach(p => console.log(`   - ${p.name} (${p.category})`));
  }
  
  // Check photos_staging
  const { data: staging, error: stagingError } = await supabase
    .from('photos_staging')
    .select('staging_id, place_name, review_status')
    .limit(10);
  
  console.log(`\n📸 Photos Staging: ${staging?.length || 0} records`);
  if (staging?.length > 0) {
    const pending = staging.filter(s => s.review_status === 'pending').length;
    const approved = staging.filter(s => s.review_status === 'approved').length;
    console.log(`   - Pending: ${pending}, Approved: ${approved}`);
  }
  
  // Check place_photos (approved photos)
  const { data: photos, error: photosError } = await supabase
    .from('place_photos')
    .select('photo_id, place_id')
    .limit(10);
  
  console.log(`\n🖼️ Approved Photos: ${photos?.length || 0} records`);
  
  // Check destinations
  const { data: destinations } = await supabase
    .from('destinations')
    .select('*');
  
  console.log(`\n🌍 Destinations: ${destinations?.length || 0} records`);
  if (destinations?.length > 0) {
    destinations.forEach(d => console.log(`   - ${d.code}: ${d.name_kr || d.name}`));
  }
  
  console.log('\n✅ Done checking data.');
}

checkData();
