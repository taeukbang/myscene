// ============================================
// PLACE MATCHER - Match scraped photos to places
// ============================================

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from project root
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { supabaseAdmin } from '../../../lib/supabase';

interface StagingPhoto {
  staging_id: string;
  location_name?: string;
  caption: string;
  hashtags: string[];
}

interface TokyoPlace {
  name_kr: string;
  name_en: string;
  lat: number;
  lng: number;
  region: string;
  category: 'cafe' | 'viewspot';
}

/**
 * Known Tokyo places (manually curated)
 * TODO: Expand this list or fetch from external API
 */
const KNOWN_TOKYO_PLACES: TokyoPlace[] = [
  // Harajuku Cafes
  { name_kr: '어바웃 라이프 커피', name_en: 'About Life Coffee', lat: 35.6681, lng: 139.7038, region: 'Harajuku', category: 'cafe' },
  { name_kr: '블루 보틀 커피 시부야', name_en: 'Blue Bottle Coffee Shibuya', lat: 35.6612, lng: 139.7027, region: 'Shibuya', category: 'cafe' },
  { name_kr: '라틀리에 드 주엘 로뽕기', name_en: 'L\'Atelier de Joël Robuchon', lat: 35.6654, lng: 139.7298, region: 'Roppongi', category: 'cafe' },

  // Shibuya Cafes
  { name_kr: '스타벅스 리저브 로스터리 도쿄', name_en: 'Starbucks Reserve Roastery Tokyo', lat: 35.6571, lng: 139.7044, region: 'Nakameguro', category: 'cafe' },
  { name_kr: '카페 키츠네', name_en: 'Café Kitsuné', lat: 35.6618, lng: 139.7038, region: 'Shibuya', category: 'cafe' },

  // View Spots
  { name_kr: '도쿄 타워', name_en: 'Tokyo Tower', lat: 35.6586, lng: 139.7454, region: 'Minato', category: 'viewspot' },
  { name_kr: '도쿄 스카이트리', name_en: 'Tokyo Skytree', lat: 35.7101, lng: 139.8107, region: 'Sumida', category: 'viewspot' },
  { name_kr: '롯폰기 힐스 전망대', name_en: 'Roppongi Hills Mori Tower', lat: 35.6604, lng: 139.7292, region: 'Roppongi', category: 'viewspot' },
  { name_kr: '팀랩 보더리스', name_en: 'teamLab Borderless', lat: 35.6245, lng: 139.7758, region: 'Odaiba', category: 'viewspot' },
  { name_kr: '센소지 (아사쿠사 절)', name_en: 'Senso-ji Temple', lat: 35.7148, lng: 139.7967, region: 'Asakusa', category: 'viewspot' },
];

/**
 * Match staging photos to known places based on location name or caption
 */
export async function matchStagingPhotosToPlaces() {
  console.log('===================================');
  console.log('   Place Matcher - Auto Matching');
  console.log('===================================\n');

  // Get all pending staging photos
  const { data: stagingPhotos, error } = await supabaseAdmin
    .from('photos_staging')
    .select('*')
    .eq('review_status', 'pending')
    .is('matched_place_id', null);

  if (error) {
    console.error('❌ Error fetching staging photos:', error);
    return;
  }

  if (!stagingPhotos || stagingPhotos.length === 0) {
    console.log('ℹ️  No staging photos to match');
    return;
  }

  console.log(`📸 Found ${stagingPhotos.length} photos to match\n`);

  let matchedCount = 0;
  let unmatchedCount = 0;

  for (const photo of stagingPhotos) {
    const match = findBestMatch(photo);

    if (match) {
      // Ensure the place exists in the database
      const placeId = await ensurePlaceExists(match.place);

      if (placeId) {
        // Update staging photo with matched place
        const { error: updateError } = await supabaseAdmin
          .from('photos_staging')
          .update({
            matched_place_id: placeId,
            match_confidence: match.confidence,
          })
          .eq('staging_id', photo.staging_id);

        if (updateError) {
          console.error(`  ❌ Failed to update staging photo: ${updateError.message}`);
        } else {
          console.log(`  ✓ Matched: "${photo.location_name || 'Unknown'}" → ${match.place.name_kr} (confidence: ${match.confidence.toFixed(2)})`);
          matchedCount++;
        }
      }
    } else {
      console.log(`  ⚠️  No match: "${photo.location_name || photo.caption.substring(0, 50)}..."`);
      unmatchedCount++;
    }
  }

  console.log(`\n===================================`);
  console.log(`✅ Matched: ${matchedCount}`);
  console.log(`⚠️  Unmatched: ${unmatchedCount}`);
  console.log(`📋 Total: ${stagingPhotos.length}`);
  console.log(`===================================\n`);
}

/**
 * Find best matching place for a staging photo
 */
function findBestMatch(photo: any): { place: TokyoPlace; confidence: number } | null {
  const searchText = `${photo.location_name || ''} ${photo.caption} ${photo.hashtags?.join(' ') || ''}`.toLowerCase();

  let bestMatch: { place: TokyoPlace; confidence: number } | null = null;

  for (const place of KNOWN_TOKYO_PLACES) {
    const score = calculateMatchScore(place, searchText);
    if (score > 0.5 && (!bestMatch || score > bestMatch.confidence)) {
      bestMatch = { place, confidence: score };
    }
  }

  return bestMatch;
}

/**
 * Calculate match score between a place and search text
 */
function calculateMatchScore(place: TokyoPlace, searchText: string): number {
  let score = 0;

  // Check Korean name
  if (place.name_kr && searchText.includes(place.name_kr.toLowerCase())) {
    score += 0.9;
  }

  // Check English name
  if (place.name_en && searchText.includes(place.name_en.toLowerCase())) {
    score += 0.8;
  }

  // Check region
  if (place.region && searchText.includes(place.region.toLowerCase())) {
    score += 0.3;
  }

  // Check category keywords
  if (place.category === 'cafe') {
    if (searchText.includes('cafe') || searchText.includes('카페') || searchText.includes('coffee') || searchText.includes('커피')) {
      score += 0.2;
    }
  } else if (place.category === 'viewspot') {
    if (searchText.includes('view') || searchText.includes('tower') || searchText.includes('타워') || searchText.includes('전망')) {
      score += 0.2;
    }
  }

  return Math.min(score, 1.0);
}

/**
 * Ensure a place exists in the database, create if not
 */
async function ensurePlaceExists(place: TokyoPlace): Promise<string | null> {
  // Check if place already exists
  const { data: existing } = await supabaseAdmin
    .from('places')
    .select('place_id')
    .eq('name_kr', place.name_kr)
    .single();

  if (existing) {
    return existing.place_id;
  }

  // Create new place
  const { data: newPlace, error } = await supabaseAdmin
    .from('places')
    .insert({
      name: place.name_en,
      name_kr: place.name_kr,
      name_en: place.name_en,
      lat: place.lat,
      lng: place.lng,
      city_code: 'TYO',
      region: place.region,
      category: place.category,
      is_active: true,
      verification_status: 'pending',
    })
    .select('place_id')
    .single();

  if (error) {
    console.error(`  ❌ Failed to create place "${place.name_kr}":`, error.message);
    return null;
  }

  console.log(`  ✨ Created new place: ${place.name_kr}`);
  return newPlace.place_id;
}

// Run if executed directly
if (require.main === module) {
  matchStagingPhotosToPlaces()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
