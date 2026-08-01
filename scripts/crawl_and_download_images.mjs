import fs from 'fs';
import path from 'path';
import https from 'https';

const pages = [
  'https://klbtheme.com/fynode/',
  'https://klbtheme.com/fynode/home-2/',
  'https://klbtheme.com/fynode/home-3/',
  'https://klbtheme.com/fynode/home-4/',
  'https://klbtheme.com/fynode/home-5/',
  'https://klbtheme.com/fynode/home-6/',
  'https://klbtheme.com/fynode/shop/',
  'https://klbtheme.com/fynode/blog/',
  'https://klbtheme.com/fynode/contact/',
  'https://klbtheme.com/fynode/about-us/',
  'https://klbtheme.com/fynode/product-category/headphones/',
  'https://klbtheme.com/fynode/product-category/earphones/',
  'https://klbtheme.com/fynode/product-category/microphones/',
  'https://klbtheme.com/fynode/product-category/smartwatches/',
  'https://klbtheme.com/fynode/product-category/speakers/'
];

const destDir = path.join(process.cwd(), 'public', 'images', 'downloads');
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

function fetchPage(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

function downloadImage(url) {
  return new Promise((resolve) => {
    try {
      const filename = path.basename(new URL(url).pathname);
      if (!filename || filename.endsWith('.php') || filename.endsWith('.js') || filename.endsWith('.html')) {
        return resolve(false);
      }
      const dest = path.join(destDir, filename);
      if (fs.existsSync(dest)) {
        return resolve(true); // already downloaded
      }
      const file = fs.createWriteStream(dest);
      https.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      }, (response) => {
        if (response.statusCode === 200) {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`Downloaded new: ${filename}`);
            resolve(true);
          });
        } else {
          file.close();
          if (fs.existsSync(dest)) fs.unlinkSync(dest);
          resolve(false);
        }
      }).on('error', () => {
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        resolve(false);
      });
    } catch (e) {
      resolve(false);
    }
  });
}

async function run() {
  const imageUrlSet = new Set();
  const imgRegex = /https:\/\/klbtheme\.com\/fynode\/wp-content\/uploads\/[^\s"'<>(),]+\.(?:png|jpg|jpeg|webp|svg)/gi;

  console.log('Crawling pages for images...');
  for (const pageUrl of pages) {
    console.log(`Scanning page: ${pageUrl}`);
    const html = await fetchPage(pageUrl);
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      // Clean URL (remove thumbnail suffixes like -150x150 if full version exists, or keep original)
      let cleanUrl = match[0];
      imageUrlSet.add(cleanUrl);
      // Also try fetching the full size version if it's a scaled thumbnail (e.g. -1024x1024.jpg -> .jpg)
      const fullUrl = cleanUrl.replace(/-\d+x\d+(\.(?:png|jpg|jpeg|webp|svg))$/i, '$1');
      imageUrlSet.add(fullUrl);
    }
  }

  console.log(`Found ${imageUrlSet.size} unique image URLs across site. Downloading missing ones...`);
  let count = 0;
  for (const url of imageUrlSet) {
    const success = await downloadImage(url);
    if (success) count++;
  }
  console.log(`Done! Total images processed/saved: ${count}`);
}

run();
