/**
 * Photo Crawler - Collect ~50 photos per cafe from Pinterest/Google Images
 *
 * Strategy:
 * 1. Get cafe names (from Claude/Gemini or manual input)
 * 2. Search Pinterest/Google Images for each cafe
 * 3. Download ~50 photos per cafe
 * 4. Store in database with source URLs
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { createClient } from '@supabase/supabase-js';

puppeteer.use(StealthPlugin());

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CafePhoto {
  imageUrl: string;
  sourceUrl: string;
  sourcePlatform: 'pinterest' | 'google';
  width?: number;
  height?: number;
}

interface CafeInfo {
  name: string;
  nameJapanese?: string;
  category: string;
  description?: string;
}

/**
 * Search Google Images for cafe photos
 */
async function searchGoogleImages(
  cafeName: string,
  maxPhotos: number = 50
): Promise<CafePhoto[]> {
  console.log(`🔍 Searching Google Images for: ${cafeName}`);

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  const photos: CafePhoto[] = [];

  try {
    // Search query with location
    const searchQuery = `${cafeName} tokyo cafe interior`;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
      searchQuery
    )}&tbm=isch`;

    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Scroll to load more images
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Extract image URLs
    const images = await page.evaluate(() => {
      const imgElements = Array.from(document.querySelectorAll('img'));
      return imgElements
        .map((img) => ({
          src: img.src,
          width: img.naturalWidth,
          height: img.naturalHeight,
        }))
        .filter(
          (img) =>
            img.src &&
            !img.src.includes('google.com/') &&
            !img.src.startsWith('data:') &&
            img.width > 200 &&
            img.height > 200
        );
    });

    console.log(`   Found ${images.length} images`);

    for (const img of images.slice(0, maxPhotos)) {
      photos.push({
        imageUrl: img.src,
        sourceUrl: searchUrl,
        sourcePlatform: 'google',
        width: img.width,
        height: img.height,
      });
    }
  } catch (error) {
    console.error(`   ❌ Error searching Google Images:`, error);
  } finally {
    await browser.close();
  }

  return photos;
}

/**
 * Search Pinterest for cafe photos
 */
async function searchPinterest(
  cafeName: string,
  maxPhotos: number = 50
): Promise<CafePhoto[]> {
  console.log(`📌 Searching Pinterest for: ${cafeName}`);

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  const photos: CafePhoto[] = [];

  try {
    const searchQuery = `${cafeName} tokyo cafe`;
    const searchUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(
      searchQuery
    )}`;

    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Scroll to load more pins
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Extract pin URLs and images
    const pins = await page.evaluate(() => {
      const pinElements = Array.from(
        document.querySelectorAll('div[data-test-id="pin"]')
      );
      return pinElements
        .map((pin) => {
          const img = pin.querySelector('img');
          const link = pin.querySelector('a');
          return {
            imageUrl: img?.src,
            pinUrl: link?.href,
            width: img?.naturalWidth,
            height: img?.naturalHeight,
          };
        })
        .filter(
          (pin) =>
            pin.imageUrl &&
            pin.pinUrl &&
            pin.width &&
            pin.height &&
            pin.width > 200 &&
            pin.height > 200
        );
    });

    console.log(`   Found ${pins.length} pins`);

    for (const pin of pins.slice(0, maxPhotos)) {
      if (pin.imageUrl && pin.pinUrl) {
        photos.push({
          imageUrl: pin.imageUrl,
          sourceUrl: pin.pinUrl,
          sourcePlatform: 'pinterest',
          width: pin.width,
          height: pin.height,
        });
      }
    }
  } catch (error) {
    console.error(`   ❌ Error searching Pinterest:`, error);
  } finally {
    await browser.close();
  }

  return photos;
}

/**
 * Combine photos from multiple sources
 */
async function collectPhotosForCafe(
  cafe: CafeInfo,
  targetCount: number = 50
): Promise<CafePhoto[]> {
  console.log(`\n📸 Collecting photos for: ${cafe.name}`);

  const allPhotos: CafePhoto[] = [];

  // Search Google Images (25 photos)
  const googlePhotos = await searchGoogleImages(
    cafe.name,
    Math.ceil(targetCount / 2)
  );
  allPhotos.push(...googlePhotos);

  // Search Pinterest (25 photos)
  const pinterestPhotos = await searchPinterest(
    cafe.name,
    Math.ceil(targetCount / 2)
  );
  allPhotos.push(...pinterestPhotos);

  // Deduplicate by image URL
  const uniquePhotos = Array.from(
    new Map(allPhotos.map((p) => [p.imageUrl, p])).values()
  );

  console.log(`✅ Collected ${uniquePhotos.length} unique photos`);
  return uniquePhotos.slice(0, targetCount);
}

/**
 * Save photos to staging table
 */
async function savePhotosToStaging(
  cafe: CafeInfo,
  photos: CafePhoto[],
  placeId?: string
) {
  console.log(`💾 Saving ${photos.length} photos to database...`);

  const stagingPhotos = photos.map((photo) => ({
    place_id: placeId,
    place_name: cafe.name,
    image_url: photo.imageUrl,
    source_platform: photo.sourcePlatform,
    source_post_url: photo.sourceUrl,
    original_width: photo.width,
    original_height: photo.height,
    aspect_ratio: photo.width && photo.height ? photo.width / photo.height : null,
    collection_date: new Date().toISOString(),
    review_status: 'pending',
    caption: `${cafe.name} - ${cafe.category}`,
    hashtags: [cafe.name, 'tokyo', 'cafe'],
  }));

  const { data, error } = await supabase
    .from('photos_staging')
    .insert(stagingPhotos)
    .select();

  if (error) {
    console.error('❌ Database error:', error);
    throw error;
  }

  console.log(`✅ Saved ${data?.length || 0} photos to staging`);
}

/**
 * Main crawler function
 */
export async function runPhotoCrawler(cafes: CafeInfo[], photosPerCafe: number = 50) {
  console.log('===================================');
  console.log('   Photo Crawler');
  console.log('===================================\n');

  let totalCollected = 0;

  for (const cafe of cafes) {
    try {
      const photos = await collectPhotosForCafe(cafe, photosPerCafe);
      await savePhotosToStaging(cafe, photos);
      totalCollected += photos.length;

      // Delay between cafes to avoid rate limiting
      console.log('\n⏳ Waiting 10 seconds before next cafe...');
      await new Promise((resolve) => setTimeout(resolve, 10000));
    } catch (error) {
      console.error(`❌ Error processing ${cafe.name}:`, error);
    }
  }

  console.log(`\n✅ Total collected: ${totalCollected} photos`);
  console.log('📋 Next step: Review photos at /admin/photos');
}

// Example usage
if (require.main === module) {
  // Tokyo cafes from 2025 recommendations (WebSearch Jan 2025)
  const tokyoCafes: CafeInfo[] = [
    {
      name: 'Aoyama Flower Market Tea House',
      nameJapanese: '青山フラワーマーケット ティーハウス',
      category: 'cafe',
      description: 'Garden-like cafe surrounded by fresh flowers in Minato City',
    },
    {
      name: 'Cafe De L\'Ambre',
      nameJapanese: 'カフェ・ド・ランブル',
      category: 'cafe',
      description: 'Historic Ginza coffee shop since 1948, handcrafted coffee',
    },
    {
      name: 'Ralph\'s Coffee',
      nameJapanese: 'ラルフズ コーヒー',
      category: 'cafe',
      description: 'Sophisticated cafe in Omotesando with floor-to-ceiling windows',
    },
    {
      name: 'Flamingo Shibuya',
      nameJapanese: 'フラミンゴ 渋谷',
      category: 'cafe',
      description: 'Trendy cafe with neon pink and red lights in Shibuya',
    },
    {
      name: 'Dotcom Space Harajuku',
      nameJapanese: 'ドットコムスペース 原宿',
      category: 'cafe',
      description: 'Japanese minimalist cafe in Harajuku',
    },
    {
      name: 'Gram Cafe',
      nameJapanese: 'グラム カフェ',
      category: 'cafe',
      description: 'Famous for fluffy cloud-like pancakes',
    },
    {
      name: 'Streamer Coffee Company',
      nameJapanese: 'ストリーマー コーヒーカンパニー',
      category: 'cafe',
      description: 'Creative latte art, signature Military Latte',
    },
    {
      name: 'Meikyoku Kissa Lion',
      nameJapanese: '名曲喫茶ライオン',
      category: 'cafe',
      description: 'Baroque-style music cafe near Shibuya, 100 years history',
    },
    {
      name: 'Chatei Hatou',
      nameJapanese: '茶亭羽當',
      category: 'cafe',
      description: 'Traditional cafe, everything handmade',
    },
    {
      name: 'Kayaba Coffee',
      nameJapanese: 'カヤバ珈琲',
      category: 'cafe',
      description: 'Remodeled old house, tatami room atmosphere',
    },
  ];

  // Use only first 5 cafes for faster testing
  const selectedCafes = tokyoCafes.slice(0, 5);
  console.log(`📋 Running crawler for ${selectedCafes.length} cafes (out of ${tokyoCafes.length})`);
  runPhotoCrawler(selectedCafes, 50);
}
