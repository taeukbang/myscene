// Seed script with built-in Supabase client
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Sample Tokyo Places from photo-crawler.ts
const SAMPLE_PLACES = [
  {
    name_kr: 'Aoyama Flower Market Tea House',
    name_en: 'Aoyama Flower Market Tea House',
    lat: 35.6644,
    lng: 139.7126,
    address_kr: '도쿄도 미나토구 미나미아오야마 5-1-2',
    category: 'cafe',
    region: 'Aoyama',
    description_kr: '꽃으로 둘러싸인 정원 같은 카페',
    price_range: 3,
  },
  {
    name_kr: "Cafe De L'Ambre",
    name_en: "Cafe De L'Ambre",
    lat: 35.6711,
    lng: 139.7640,
    address_kr: '도쿄도 추오구 긴자 8-10-15',
    category: 'cafe',
    region: 'Ginza',
    description_kr: '1948년부터 시작된 역사적인 긴자 커피숍',
    price_range: 2,
  },
  {
    name_kr: "Ralph's Coffee",
    name_en: "Ralph's Coffee",
    lat: 35.6654,
    lng: 139.7113,
    address_kr: '도쿄도 시부야구 진구마에 4-25-15',
    category: 'cafe',
    region: 'Omotesando',
    description_kr: '바닥부터 천장까지 유리창이 있는 세련된 카페',
    price_range: 3,
  },
  {
    name_kr: 'Flamingo Shibuya',
    name_en: 'Flamingo Shibuya',
    lat: 35.6580,
    lng: 139.7016,
    address_kr: '도쿄도 시부야구 시부야 1-23-16',
    category: 'cafe',
    region: 'Shibuya',
    description_kr: '네온 핑크와 레드 라이트의 트렌디한 카페',
    price_range: 2,
  },
  {
    name_kr: 'Dotcom Space Harajuku',
    name_en: 'Dotcom Space Harajuku',
    lat: 35.6698,
    lng: 139.7056,
    address_kr: '도쿄도 시부야구 진구마에 6-31-15',
    category: 'cafe',
    region: 'Harajuku',
    description_kr: '하라주쿠의 일본식 미니멀 카페',
    price_range: 2,
  },
  {
    name_kr: 'Gram Cafe',
    name_en: 'Gram Cafe',
    lat: 35.6595,
    lng: 139.7004,
    address_kr: '도쿄도 시부야구 진난 1-22-3',
    category: 'cafe',
    region: 'Shibuya',
    description_kr: '구름같이 폭신한 팬케이크로 유명',
    price_range: 2,
  },
  {
    name_kr: 'Streamer Coffee Company',
    name_en: 'Streamer Coffee Company',
    lat: 35.6610,
    lng: 139.6986,
    address_kr: '도쿄도 시부야구 시부야 1-20-28',
    category: 'cafe',
    region: 'Shibuya',
    description_kr: '창의적인 라떼 아트, 시그니처 밀리터리 라떼',
    price_range: 2,
  },
  {
    name_kr: 'Meikyoku Kissa Lion',
    name_en: 'Meikyoku Kissa Lion',
    lat: 35.6585,
    lng: 139.6952,
    address_kr: '도쿄도 시부야구 도겐자카 2-19-13',
    category: 'cafe',
    region: 'Shibuya',
    description_kr: '시부야 근처의 100년 역사 바로크 스타일 음악 카페',
    price_range: 2,
  },
  {
    name_kr: 'Chatei Hatou',
    name_en: 'Chatei Hatou',
    lat: 35.6595,
    lng: 139.6949,
    address_kr: '도쿄도 시부야구 도겐자카 1-15-19',
    category: 'cafe',
    region: 'Shibuya',
    description_kr: '모든 것이 핸드메이드인 전통 카페',
    price_range: 2,
  },
  {
    name_kr: 'Kayaba Coffee',
    name_en: 'Kayaba Coffee',
    lat: 35.7213,
    lng: 139.7713,
    address_kr: '도쿄도 다이토구 야나카 6-1-29',
    category: 'cafe',
    region: 'Yanaka',
    description_kr: '리모델링된 오래된 집, 다다미 방 분위기',
    price_range: 2,
  },
];

async function seedPlaces() {
  console.log(`Seeding ${SAMPLE_PLACES.length} places...\n`);

  for (const place of SAMPLE_PLACES) {
    const { data, error } = await supabaseAdmin
      .from('places')
      .insert({
        name: place.name_en,
        name_kr: place.name_kr,
        name_en: place.name_en,
        lat: place.lat,
        lng: place.lng,
        address_kr: place.address_kr,
        city_code: 'TYO',
        region: place.region,
        category: place.category,
        description_kr: place.description_kr,
        price_range: place.price_range,
        is_active: true,
        verification_status: 'verified',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        console.log(`⏭️ Skipped (exists): ${place.name_kr}`);
      } else {
        console.error(`❌ Failed: ${place.name_kr} - ${error.message}`);
      }
    } else {
      console.log(`✅ Inserted: ${place.name_kr}`);
    }
  }
}

async function main() {
  console.log('===================================');
  console.log('   MyScene - Seed Data Script');
  console.log('===================================\n');

  try {
    await seedPlaces();
    console.log('\n✅ Seeding complete!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
