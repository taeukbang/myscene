/**
 * Image Filtering Module
 * 
 * Filters photos based on:
 * 1. Resolution (minimum 500px)
 * 2. Aspect ratio (0.3 to 3.0)
 * 3. Duplicate detection (perceptual hash)
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import sharp from 'sharp';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface FilterResult {
  passed: boolean;
  score: number; // 0-100
  reason?: string;
  perceptualHash?: string;
}

/**
 * Calculate perceptual hash for duplicate detection
 * Uses blockhash algorithm
 */
async function calculatePerceptualHash(imageUrl: string): Promise<string | null> {
  try {
    // Download image
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      maxContentLength: 10 * 1024 * 1024, // 10MB max
    });

    // Convert to buffer and process with sharp
    const imageBuffer = Buffer.from(response.data);
    const { data, info } = await sharp(imageBuffer)
      .resize(16, 16, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Simple blockhash calculation (16x16 = 256 bits)
    let hash = '';
    const threshold = 128; // Average brightness threshold

    for (let i = 0; i < data.length; i += 3) {
      // Calculate brightness (RGB average)
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      hash += brightness > threshold ? '1' : '0';
    }

    return hash;
  } catch (error) {
    console.error(`Failed to calculate hash for ${imageUrl}:`, error);
    return null;
  }
}

/**
 * Check if image is duplicate based on perceptual hash
 */
async function isDuplicate(hash: string, placeName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('photos_staging')
      .select('perceptual_hash')
      .eq('place_name', placeName)
      .not('perceptual_hash', 'is', null);

    if (error || !data) {
      return false;
    }

    // Calculate Hamming distance
    for (const existing of data) {
      if (!existing.perceptual_hash) continue;

      const distance = hammingDistance(hash, existing.perceptual_hash);
      const similarity = 1 - distance / hash.length;

      // 90% similarity threshold
      if (similarity > 0.9) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking duplicates:', error);
    return false;
  }
}

/**
 * Calculate Hamming distance between two binary strings
 */
function hammingDistance(str1: string, str2: string): number {
  if (str1.length !== str2.length) {
    return Math.max(str1.length, str2.length);
  }

  let distance = 0;
  for (let i = 0; i < str1.length; i++) {
    if (str1[i] !== str2[i]) {
      distance++;
    }
  }
  return distance;
}

/**
 * Filter single photo
 */
export async function filterPhoto(
  imageUrl: string,
  width: number,
  height: number,
  placeName: string
): Promise<FilterResult> {
  let score = 100;
  const reasons: string[] = [];

  // 1. Resolution check
  if (width < 500 || height < 500) {
    return {
      passed: false,
      score: 0,
      reason: `Resolution too low: ${width}x${height} (minimum 500px)`,
    };
  }

  // 2. Aspect ratio check
  const aspectRatio = width / height;
  if (aspectRatio < 0.3 || aspectRatio > 3.0) {
    return {
      passed: false,
      score: 0,
      reason: `Aspect ratio out of range: ${aspectRatio.toFixed(2)} (acceptable: 0.3-3.0)`,
    };
  }

  // 3. Calculate perceptual hash
  const hash = await calculatePerceptualHash(imageUrl);
  if (!hash) {
    score -= 10;
    reasons.push('Could not calculate perceptual hash');
  } else {
    // 4. Check for duplicates
    const duplicate = await isDuplicate(hash, placeName);
    if (duplicate) {
      return {
        passed: false,
        score: 0,
        reason: 'Duplicate image detected',
        perceptualHash: hash,
      };
    }
  }

  // Score based on resolution (higher is better)
  const megapixels = (width * height) / 1000000;
  if (megapixels < 0.5) {
    score -= 20;
    reasons.push('Low resolution');
  } else if (megapixels > 2.0) {
    score += 10; // Bonus for high resolution
  }

  return {
    passed: true,
    score: Math.max(0, Math.min(100, score)),
    reason: reasons.length > 0 ? reasons.join(', ') : undefined,
    perceptualHash: hash || undefined,
  };
}

/**
 * Filter multiple photos and update database
 */
export async function filterStagingPhotos(placeName?: string) {
  console.log('🔍 Starting photo filtering...');

  let query = supabase
    .from('photos_staging')
    .select('*')
    .eq('review_status', 'pending');

  // Only filter by is_filtered if column exists
  // For now, process all pending photos
  // .is('is_filtered', false);

  if (placeName) {
    query = query.eq('place_name', placeName);
  }

  const { data: photos, error } = await query;

  if (error || !photos) {
    console.error('Error fetching photos:', error);
    return;
  }

  console.log(`📸 Filtering ${photos.length} photos...`);

  let passed = 0;
  let filtered = 0;

  for (const photo of photos) {
    if (!photo.image_url || !photo.original_width || !photo.original_height) {
      // Mark as filtered if missing required data
      try {
        await supabase
          .from('photos_staging')
          .update({
            is_filtered: true,
            filter_reason: 'Missing image data',
            filter_score: 0,
          })
          .eq('staging_id', photo.staging_id);
      } catch (err) {
        // Columns may not exist yet
        console.log(`⚠️  Photo ${photo.staging_id}: Missing image data`);
      }
      filtered++;
      continue;
    }

    const result = await filterPhoto(
      photo.image_url,
      photo.original_width,
      photo.original_height,
      photo.place_name || ''
    );

    // Update with filter results (columns may not exist yet)
    const updateData: any = {};
    
    // Try to update filter columns if they exist
    try {
      const { error: updateError } = await supabase
        .from('photos_staging')
        .update({
          is_filtered: !result.passed,
          filter_reason: result.reason,
          filter_score: result.score,
          perceptual_hash: result.perceptualHash || null,
        })
        .eq('staging_id', photo.staging_id);

      if (updateError && updateError.message.includes('column')) {
        // Columns don't exist - just log the result
        console.log(`⚠️  Filter columns not found. Result: ${result.passed ? 'PASS' : 'FAIL'} - ${result.reason}`);
      }
    } catch (err: any) {
      // If columns don't exist, we'll just skip the update
      console.log(`⚠️  Could not update filter data: ${err.message}`);
    }

    if (result.passed) {
      passed++;
    } else {
      filtered++;
      console.log(`❌ Filtered: ${result.reason}`);
    }

    // Rate limiting: wait 100ms between requests
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`\n✅ Filtering complete:`);
  console.log(`   Passed: ${passed}`);
  console.log(`   Filtered: ${filtered}`);
}

// Run if executed directly
if (require.main === module) {
  require('dotenv').config({ path: '.env.local' });
  const placeName = process.argv[2]; // Optional: filter specific place

  filterStagingPhotos(placeName)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Filtering failed:', error);
      process.exit(1);
    });
}
