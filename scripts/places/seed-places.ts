// ============================================
// MANUAL SEED SCRIPT - TOKYO PLACES
// ============================================

import { supabaseAdmin } from '../../lib/supabase';

interface PlaceSeedData {
  name_kr: string;
  name_en: string;
  lat: number;
  lng: number;
  address_kr: string;
  category: 'cafe' | 'viewspot';
  region: string;
  description_kr?: string;
  price_range?: number;
}

interface PhotoSeedData {
  place_name_kr: string;
  image_url: string;
  source_platform: string;
  source_account: string;
  source_post_url?: string;
  shooting_guide: {
    location?: { specific_spot: string };
    time?: { optimal_hours: string[]; lighting: string };
    composition?: { angle: string; include_person: boolean };
  };
  failure_conditions?: Record<string, string>;
  time_tags: string[];
  composition_tags: string[];
  mood_tags: string[];
}

/**
 * Sample Tokyo Places
 *
 * TODO: Replace with real data
 * You can collect this from:
 * - Google Maps
 * - Instagram location tags
 * - Korean travel blogs
 */
const SAMPLE_PLACES: PlaceSeedData[] = [
  {
    name_kr: '어바웃 라이프 커피',
    name_en: 'About Life Coffee',
    lat: 35.6681,
    lng: 139.7038,
    address_kr: '도쿄도 시부야구 진구마에 3-1-7',
    category: 'cafe',
    region: 'Harajuku',
    description_kr: '감성적인 인테리어와 자연광이 아름다운 카페',
    price_range: 2,
  },
  {
    name_kr: '블루 보틀 커피 시부야',
    name_en: 'Blue Bottle Coffee Shibuya',
    lat: 35.6612,
    lng: 139.7027,
    address_kr: '도쿄도 시부야구 시부야 3-7-1',
    category: 'cafe',
    region: 'Shibuya',
    description_kr: '미니멀한 인테리어와 고품질 커피',
    price_range: 3,
  },
  {
    name_kr: '도쿄 타워',
    name_en: 'Tokyo Tower',
    lat: 35.6586,
    lng: 139.7454,
    address_kr: '도쿄도 미나토구 시바코엔 4-2-8',
    category: 'viewspot',
    region: 'Minato',
    description_kr: '도쿄의 랜드마크 타워, 야경 촬영 명소',
    price_range: 2,
  },
];

/**
 * Sample Photos
 *
 * TODO: Replace with real photo URLs
 */
const SAMPLE_PHOTOS: PhotoSeedData[] = [
  {
    place_name_kr: '어바웃 라이프 커피',
    image_url: 'https://via.placeholder.com/800x600',
    source_platform: 'instagram',
    source_account: '@example_user',
    shooting_guide: {
      location: { specific_spot: '2층 창가 테이블' },
      time: { optimal_hours: ['14:00-16:00'], lighting: '자연광' },
      composition: { angle: '정면', include_person: true },
    },
    failure_conditions: {
      wait_time: '주말 오후 1시간 대기',
      lighting: '오전 역광 주의',
    },
    time_tags: ['afternoon'],
    composition_tags: ['portrait', 'food'],
    mood_tags: ['aesthetic', 'cozy'],
  },
];

/**
 * Seed places
 */
async function seedPlaces() {
  console.log(`Seeding ${SAMPLE_PLACES.length} places...`);

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
      console.error(`Failed to insert place ${place.name_kr}:`, error);
    } else {
      console.log(`✓ Inserted: ${place.name_kr} (${data.place_id})`);
    }
  }
}

/**
 * Seed photos
 */
async function seedPhotos() {
  console.log(`\nSeeding ${SAMPLE_PHOTOS.length} photos...`);

  for (const photo of SAMPLE_PHOTOS) {
    // Find place by name
    const { data: place, error: placeError } = await supabaseAdmin
      .from('places')
      .select('place_id')
      .eq('name_kr', photo.place_name_kr)
      .single();

    if (placeError || !place) {
      console.error(`Place not found: ${photo.place_name_kr}`);
      continue;
    }

    const { error } = await supabaseAdmin
      .from('place_photos')
      .insert({
        place_id: place.place_id,
        image_url: photo.image_url,
        image_thumbnail_url: photo.image_url,
        source_platform: photo.source_platform,
        source_account: photo.source_account,
        source_post_url: photo.source_post_url,
        shooting_guide: photo.shooting_guide,
        failure_conditions: photo.failure_conditions,
        time_tags: photo.time_tags,
        composition_tags: photo.composition_tags,
        mood_tags: photo.mood_tags,
        is_active: true,
        moderation_status: 'approved',
        display_priority: 50,
      });

    if (error) {
      console.error(`Failed to insert photo for ${photo.place_name_kr}:`, error);
    } else {
      console.log(`✓ Inserted photo for: ${photo.place_name_kr}`);
    }
  }
}

/**
 * Main seed function
 */
async function main() {
  console.log('===================================');
  console.log('   MyScene - Seed Data Script');
  console.log('===================================\n');

  try {
    await seedPlaces();
    await seedPhotos();

    console.log('\n✅ Seeding complete!');
    console.log('\nNext steps:');
    console.log('1. Add more real data to SAMPLE_PLACES and SAMPLE_PHOTOS');
    console.log('2. Run this script again: npm run seed');
    console.log('3. Test the app: npm run dev');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
