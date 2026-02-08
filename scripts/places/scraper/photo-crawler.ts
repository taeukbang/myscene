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
  sourcePlatform: 'pinterest' | 'google' | 'unsplash';
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

    // Click on images to get original high-resolution URLs
    const imageData = await page.evaluate(async () => {
      const results: any[] = [];
      const imgElements = Array.from(document.querySelectorAll('img[data-src], img[src]'));
      
      for (const img of imgElements.slice(0, 50)) {
        try {
          // Try to get the original image URL from data attributes
          const dataSrc = img.getAttribute('data-src') || img.getAttribute('src');
          if (!dataSrc || dataSrc.includes('google.com/') || dataSrc.startsWith('data:')) {
            continue;
          }

          // Extract original URL from Google Images structure
          const parent = img.closest('a');
          if (parent) {
            const href = parent.getAttribute('href');
            if (href && href.includes('imgurl=')) {
              const match = href.match(/imgurl=([^&]+)/);
              if (match) {
                const originalUrl = decodeURIComponent(match[1]);
                // Create image element to check dimensions
                const testImg = new Image();
                testImg.src = originalUrl;
                await new Promise((resolve) => {
                  testImg.onload = () => {
                    if (testImg.naturalWidth >= 800 && testImg.naturalHeight >= 800) {
                      results.push({
                        src: originalUrl,
                        width: testImg.naturalWidth,
                        height: testImg.naturalHeight,
                      });
                    }
                    resolve(null);
                  };
                  testImg.onerror = () => resolve(null);
                  setTimeout(() => resolve(null), 2000); // Timeout
                });
              }
            }
          }
        } catch (e) {
          // Skip if error
        }
      }
      return results;
    });

    console.log(`   Found ${imageData.length} high-res images`);

    for (const img of imageData.slice(0, maxPhotos)) {
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

    // Extract pin URLs and high-resolution images
    const pins = await page.evaluate(() => {
      const pinElements = Array.from(
        document.querySelectorAll('div[data-test-id="pin"]')
      );
      return pinElements
        .map((pin) => {
          const img = pin.querySelector('img');
          const link = pin.querySelector('a');
          
          if (!img || !link) return null;

          // Try to get high-res image URL
          // Pinterest uses different image sizes: 236x, 474x, 564x, 736x, originals
          let imageUrl = img.src;
          
          // Replace thumbnail URL with higher resolution
          if (imageUrl.includes('236x') || imageUrl.includes('474x')) {
            imageUrl = imageUrl.replace(/\/\d+x\//, '/736x/'); // Try 736x first
          }
          
          // If still small, try to get original
          if (imageUrl.includes('236x') || imageUrl.includes('474x')) {
            imageUrl = imageUrl.replace(/\/\d+x\//, '/originals/');
          }

          return {
            imageUrl: imageUrl,
            pinUrl: link.href,
            width: img.naturalWidth || 0,
            height: img.naturalHeight || 0,
          };
        })
        .filter((pin) => {
          if (!pin || !pin.imageUrl || !pin.pinUrl) {
            return false;
          }
          // Minimum resolution: 800px on both dimensions for high quality
          if (pin.width < 800 || pin.height < 800) {
            return false;
          }
          // Aspect ratio check: reject too narrow or too wide images (0.3 to 3.0)
          const aspectRatio = pin.width / pin.height;
          if (aspectRatio < 0.3 || aspectRatio > 3.0) {
            return false;
          }
          return true;
        });
    });

    console.log(`   Found ${pins.length} pins`);

    for (const pin of pins.slice(0, maxPhotos)) {
      if (pin && pin.imageUrl && pin.pinUrl) {
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
 * Search Unsplash for high-quality cafe photos
 */
async function searchUnsplash(
  cafeName: string,
  maxPhotos: number = 25
): Promise<CafePhoto[]> {
  console.log(`📷 Searching Unsplash for: ${cafeName}`);

  const photos: CafePhoto[] = [];

  try {
    // Unsplash API (free tier: 50 requests/hour)
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      console.log('   ⚠️  UNSPLASH_ACCESS_KEY not set, skipping Unsplash');
      return photos;
    }

    const searchQuery = `${cafeName} tokyo cafe interior`;
    const apiUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
      searchQuery
    )}&per_page=${maxPhotos}&orientation=landscape`;

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
    });

    if (!response.ok) {
      console.log(`   ⚠️  Unsplash API error: ${response.status}`);
      return photos;
    }

    const data = await response.json();

    for (const photo of data.results || []) {
      // Unsplash provides high-resolution images
      // Use 'regular' size (1080px) or 'full' if available
      const imageUrl = photo.urls?.regular || photo.urls?.small;
      const fullUrl = photo.urls?.full; // Original resolution

      if (imageUrl && photo.width && photo.height) {
        // Only include if resolution is high enough
        if (photo.width >= 800 && photo.height >= 800) {
          photos.push({
            imageUrl: fullUrl || imageUrl, // Prefer full resolution
            sourceUrl: photo.links?.html || `https://unsplash.com/photos/${photo.id}`,
            sourcePlatform: 'unsplash',
            width: photo.width,
            height: photo.height,
          });
        }
      }
    }

    console.log(`   Found ${photos.length} high-quality photos from Unsplash`);
  } catch (error) {
    console.error(`   ❌ Error searching Unsplash:`, error);
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

  // Search Unsplash first (high quality, free API)
  const unsplashPhotos = await searchUnsplash(cafe.name, Math.ceil(targetCount / 3));
  allPhotos.push(...unsplashPhotos);

  // Search Google Images
  const googlePhotos = await searchGoogleImages(
    cafe.name,
    Math.ceil(targetCount / 3)
  );
  allPhotos.push(...googlePhotos);

  // Search Pinterest
  const pinterestPhotos = await searchPinterest(
    cafe.name,
    Math.ceil(targetCount / 3)
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
