// ============================================
// INSTAGRAM PHOTO SCRAPER - WORKING VERSION
// ============================================

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from project root
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { supabaseAdmin } from '../../../lib/supabase';

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

interface InstagramPost {
  imageUrl: string;
  caption: string;
  account: string;
  postUrl: string;
  locationName?: string;
  hashtags: string[];
  likes: number;
  comments: number;
}

/**
 * Login to Instagram
 */
async function loginToInstagram(page: any): Promise<boolean> {
  const username = process.env.INSTAGRAM_USERNAME;
  const password = process.env.INSTAGRAM_PASSWORD;

  if (!username || !password) {
    console.log('⚠️  Instagram credentials not found in .env.local');
    console.log('   Add INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD to continue');
    return false;
  }

  try {
    console.log('🔑 Logging in to Instagram...');

    await page.goto('https://www.instagram.com/accounts/login/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Take screenshot for debugging
    await page.screenshot({ path: 'instagram-login-page.png' });
    console.log('📸 Screenshot saved: instagram-login-page.png');

    // Check current page content
    const pageTitle = await page.title();
    const currentUrl = page.url();
    console.log(`📄 Page title: ${pageTitle}`);
    console.log(`🔗 Current URL: ${currentUrl}`);

    // Try to find the username input - Instagram uses various attributes
    const inputs = await page.$$('input');
    let usernameInput = null;
    let passwordInput = null;

    for (const input of inputs) {
      const type = await input.evaluate((el: any) => el.type);
      const name = await input.evaluate((el: any) => el.name);
      const ariaLabel = await input.evaluate((el: any) => el.getAttribute('aria-label'));

      if (type === 'text' || name === 'username' || (ariaLabel && ariaLabel.includes('username'))) {
        usernameInput = input;
      } else if (type === 'password' || name === 'password') {
        passwordInput = input;
      }
    }

    if (!usernameInput) {
      console.log('❌ Could not find username input field');
      console.log('   Instagram may have changed their page structure');
      return false;
    }

    if (!passwordInput) {
      console.log('❌ Could not find password input field');
      return false;
    }

    // Fill in credentials
    await usernameInput.click();
    await usernameInput.type(username, { delay: 100 });

    await passwordInput.click();
    await passwordInput.type(password, { delay: 100 });

    // Find and click login button
    const buttons = await page.$$('button');
    console.log(`🔍 Found ${buttons.length} buttons on page`);

    let loginButton = null;

    for (const button of buttons) {
      const text = await button.evaluate((el: any) => el.textContent || el.innerText);
      const buttonHtml = await button.evaluate((el: any) => el.outerHTML.substring(0, 100));
      console.log(`   Button text: "${text}" | HTML: ${buttonHtml}...`);

      if (text && (text.includes('Log in') || text.includes('로그인') || text.trim() === 'Log in')) {
        loginButton = button;
        console.log('   ✓ Found login button!');
        break;
      }
    }

    if (!loginButton) {
      console.log('❌ Could not find login button');
      console.log('   Trying to find by div with role="button"...');

      // Try alternative: div with role="button"
      const divButtons = await page.$$('div[role="button"]');
      for (const button of divButtons) {
        const text = await button.evaluate((el: any) => el.textContent || el.innerText);
        if (text && (text.includes('Log in') || text.includes('로그인'))) {
          loginButton = button;
          console.log('   ✓ Found login button as div!');
          break;
        }
      }
    }

    if (!loginButton) {
      console.log('❌ Still could not find login button');
      return false;
    }

    await loginButton.click();
    console.log('✓ Clicked login button, waiting for response...');

    // Wait for either navigation or error message to appear
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Take screenshot after login attempt
    await page.screenshot({ path: 'instagram-after-login.png' });
    console.log('📸 Screenshot saved: instagram-after-login.png');

    const urlAfterLogin = page.url();
    console.log(`🔗 URL after login: ${urlAfterLogin}`);

    // Check for error messages
    const errorElements = await page.$$('div[role="alert"]');
    if (errorElements.length > 0) {
      for (const error of errorElements) {
        const errorText = await error.evaluate((el: any) => el.textContent);
        console.log(`⚠️  Error message: ${errorText}`);
      }
    }

    // Check if still on login page
    if (urlAfterLogin.includes('/accounts/login/')) {
      console.log('⚠️  Still on login page - checking for error reason');

      // Check for specific error messages
      const pageContent = await page.content();

      if (pageContent.includes('incorrect') || pageContent.includes('wrong')) {
        console.log('❌ Login failed: Incorrect username or password');
        console.log('   Current username: ' + username);
        console.log('   Please verify your Instagram credentials in .env.local');
        console.log('   Make sure you can login manually first');
        return false;
      }

      if (pageContent.includes('challenge') || pageContent.includes('checkpoint')) {
        console.log('❌ Instagram requires additional verification (CAPTCHA/2FA)');
        console.log('   This account may need to verify identity first');
        console.log('   Try logging in manually to complete the verification');
        return false;
      }

      if (pageContent.includes('suspicious') || pageContent.includes('unusual')) {
        console.log('❌ Instagram detected suspicious activity');
        console.log('   This happens when using automation tools');
        console.log('   Wait a few hours and try again, or login manually first');
        return false;
      }

      console.log('❌ Login failed - unknown reason');
      console.log('   Check the browser window to see what Instagram is showing');
      return false;
    }

    // Wait a bit more for any prompts to appear
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Handle "Save Your Login Info" prompt
    try {
      await page.waitForSelector('button', { timeout: 5000 });
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const text = await button.evaluate((el: any) => el.textContent);
        if (text && text.includes('Not Now')) {
          await button.click();
          break;
        }
      }
    } catch (e) {
      // Ignore if prompt doesn't appear
    }

    // Handle notifications prompt
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const text = await button.evaluate((el: any) => el.textContent);
        if (text && text.includes('Not Now')) {
          await button.click();
          break;
        }
      }
    } catch (e) {
      // Ignore if prompt doesn't appear
    }

    console.log('✓ Successfully logged in to Instagram');
    return true;
  } catch (error) {
    console.error('❌ Login error:', error);
    return false;
  }
}

/**
 * Scrape Instagram posts by hashtag (with login)
 */
export async function scrapeInstagramByHashtag(
  hashtag: string,
  maxPosts: number = 30,
  page?: any
): Promise<InstagramPost[]> {
  console.log(`\n🔍 Scraping Instagram for #${hashtag}...`);

  const shouldCloseBrowser = !page;
  let browser;

  if (!page) {
    browser = await puppeteer.launch({
      headless: false, // Show browser for login
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    page = await browser.newPage();

    // Set user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Login first
    const loginSuccess = await loginToInstagram(page);
    if (!loginSuccess) {
      if (browser) await browser.close();
      return [];
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  const posts: InstagramPost[] = [];

  try {
    // Navigate to hashtag page
    const url = `https://www.instagram.com/explore/tags/${encodeURIComponent(hashtag)}/`;
    console.log(`📱 Navigating to: ${url}`);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for posts to load
    await page.waitForSelector('article img', { timeout: 10000 }).catch(() => {
      console.log('⚠️  No posts found or page structure changed');
    });

    // Extract post links from the grid
    const postLinks = await page.evaluate(() => {
      const links: string[] = [];
      const anchors = document.querySelectorAll('article a[href*="/p/"]');
      anchors.forEach((a) => {
        const href = (a as HTMLAnchorElement).href;
        if (href && !links.includes(href)) {
          links.push(href);
        }
      });
      return links;
    });

    console.log(`✓ Found ${postLinks.length} posts on hashtag page`);

    // Visit each post (limit to maxPosts)
    const linksToVisit = postLinks.slice(0, Math.min(maxPosts, postLinks.length));

    for (let i = 0; i < linksToVisit.length; i++) {
      const postUrl = linksToVisit[i];
      console.log(`📸 [${i + 1}/${linksToVisit.length}] Scraping: ${postUrl}`);

      try {
        await page.goto(postUrl, { waitUntil: 'networkidle2', timeout: 20000 });
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for dynamic content

        // Extract post data
        const postData = await page.evaluate(() => {
          // Extract image URL
          const imgElement = document.querySelector('article img');
          const imageUrl = imgElement ? (imgElement as HTMLImageElement).src : '';

          // Extract caption
          const captionElement = document.querySelector(
            'article h1 ~ div span, article h1 ~ span'
          );
          const caption = captionElement ? captionElement.textContent || '' : '';

          // Extract account name
          const accountElement = document.querySelector('article header a');
          const account = accountElement ? accountElement.textContent || '' : '';

          // Extract engagement (likes) - Instagram hides exact counts, so we estimate
          const likesElement = document.querySelector(
            'article section span[style*="font-weight"]'
          );
          const likesText = likesElement ? likesElement.textContent || '0' : '0';
          const likes = parseInt(likesText.replace(/[^0-9]/g, '')) || 0;

          // Extract location from caption or metadata
          const locationElement = document.querySelector('article header div a[href*="/locations/"]');
          const locationName = locationElement ? locationElement.textContent || '' : '';

          return {
            imageUrl,
            caption,
            account,
            likes,
            locationName,
          };
        });

        // Extract hashtags from caption
        const hashtags = (postData.caption.match(/#[a-zA-Z가-힣0-9_]+/g) || []).map((tag) =>
          tag.replace('#', '')
        );

        const post: InstagramPost = {
          imageUrl: postData.imageUrl,
          caption: postData.caption,
          account: postData.account,
          postUrl: postUrl,
          locationName: postData.locationName,
          hashtags: hashtags,
          likes: postData.likes,
          comments: 0, // Instagram doesn't show comment count easily
        };

        // Only add posts with valid images and engagement
        if (post.imageUrl && post.likes > 100) {
          posts.push(post);
          console.log(`  ✓ Captured: ${post.account} (${post.likes} likes)`);
        } else {
          console.log(`  ⏭️  Skipped: Low engagement or no image`);
        }
      } catch (error) {
        console.log(`  ❌ Failed to scrape post: ${error}`);
      }

      // Random delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    }
  } catch (error) {
    console.error(`❌ Error scraping hashtag #${hashtag}:`, error);
  } finally {
    if (shouldCloseBrowser && browser) {
      await browser.close();
    }
  }

  return posts;
}

/**
 * Save scraped posts to staging table
 */
export async function saveStagingPhotos(posts: InstagramPost[]) {
  console.log(`\n💾 Saving ${posts.length} photos to staging...`);

  for (const post of posts) {
    const { data, error } = await supabaseAdmin
      .from('photos_staging')
      .insert({
        image_url: post.imageUrl,
        source_platform: 'instagram',
        source_account: post.account,
        source_post_url: post.postUrl,
        location_name: post.locationName,
        caption: post.caption,
        hashtags: post.hashtags,
        engagement_likes: post.likes,
        engagement_comments: post.comments,
        review_status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error(`  ❌ Failed to save: ${post.account}`, error.message);
    } else {
      console.log(`  ✓ Saved: ${post.account} (staging_id: ${data.staging_id})`);
    }
  }

  console.log(`✅ Saved ${posts.length} photos to staging table`);
}

/**
 * Main scraping workflow
 */
export async function runInstagramScraper() {
  console.log('===================================');
  console.log('   Instagram Scraper - Tokyo');
  console.log('===================================\n');

  const hashtags = [
    '도쿄카페',
    '도쿄감성카페',
    'tokyocafe',
    '도쿄여행',
  ];

  let totalScraped = 0;

  // Create browser once and reuse for all hashtags
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Set user agent
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  // Login once at the beginning
  const loginSuccess = await loginToInstagram(page);
  if (!loginSuccess) {
    await browser.close();
    console.log('❌ Scraping aborted due to login failure');
    return;
  }

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Scrape all hashtags with the same logged-in page
  for (const hashtag of hashtags) {
    try {
      const posts = await scrapeInstagramByHashtag(hashtag, 10, page); // Pass page to reuse session
      if (posts.length > 0) {
        await saveStagingPhotos(posts);
        totalScraped += posts.length;
      }

      // Delay between hashtags
      console.log(`\n⏳ Waiting 5 seconds before next hashtag...`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (error) {
      console.error(`❌ Error scraping #${hashtag}:`, error);
    }
  }

  // Close browser after all hashtags are done
  await browser.close();

  console.log(`\n✅ Total scraped: ${totalScraped} photos`);
  console.log('📋 Next step: Review photos at /admin/review');
  console.log('\nTo view staging data:');
  console.log('  SELECT * FROM photos_staging WHERE review_status = \'pending\';');
}

// Run if executed directly
if (require.main === module) {
  runInstagramScraper()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
