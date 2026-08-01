import fs from 'fs';
import path from 'path';
import https from 'https';

const inputUrls = [
  "https://klbtheme.com/fynode/wp-content/uploads/2024/11/logo-light-300x68.png",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/11/logo-light-600x137.png",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/11/logo-light-90x21.png",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/11/logo-light.png",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-2-1024x1024.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-2-150x150.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-2-300x300.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-2-450x450.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-2-54x54.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-2-750x750.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-2-768x768.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-2.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-28-1024x1024.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-28-150x150.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-28-300x300.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-28-450x450.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-28-54x54.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-28-750x750.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-28-768x768.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-28.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-3-1024x1024.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-3-150x150.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-3-300x300.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-3-450x450.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-3-54x54.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-3-750x750.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-3-768x768.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-3.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-37-1024x1024.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-37-150x150.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-37-300x300.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-37-450x450.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-37-54x54.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-37-750x750.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-37-768x768.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-37.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-41-1024x1024.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-41-150x150.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-41-300x300.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-41-450x450.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-41-54x54.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-41-750x750.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-41-768x768.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-41.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-49-1024x1024.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-49-150x150.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-49-300x300.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-49-450x450.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-49-54x54.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-49-750x750.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-49-768x768.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-49.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-50-1024x1024.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-50-150x150.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-50-300x300.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-50-450x450.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-50-54x54.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-50-750x750.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-50-768x768.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-50.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-51-1024x1024.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-51-150x150.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-51-300x300.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-51-450x450.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-51-54x54.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-51-750x750.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-51-768x768.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-51.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-1-1024x1024.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-1-150x150.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-1-300x300.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-1-450x450.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-1-54x54.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-1-750x750.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-1-768x768.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-1.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-2-1024x1024.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-2-150x150.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-2-300x300.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-2-450x450.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-2-54x54.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-2-750x750.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-2-768x768.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-2.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-24-1024x1024.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-24-150x150.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-24-300x300.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-24-450x450.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-24-54x54.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-24-750x750.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-24-768x768.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-24.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-32-1024x1024.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-32-150x150.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-32-300x300.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-32-450x450.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-32-54x54.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-32-750x750.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-32-768x768.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-32.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-36-1024x1024.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-36-150x150.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-36-300x300.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-36-450x450.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-36-54x54.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-36-750x750.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-36-768x768.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-36.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-43-1024x1024.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-43-150x150.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-43-300x300.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-43-450x450.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-43-54x54.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-43-750x750.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-43-768x768.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-43.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-44-1024x1024.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-44-150x150.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-44-300x300.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-44-450x450.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-44-54x54.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-44-750x750.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-44-768x768.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-44.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-45-1024x1024.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-45-150x150.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-45-300x300.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-45-450x450.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-45-54x54.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-45-750x750.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-45-768x768.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-45.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-1-1024x1024.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-1-150x150.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-1-300x300.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-1-450x450.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-1-54x54.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-1-750x750.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-1-768x768.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-1.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-2-1024x1024.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-2-150x150.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-2-300x300.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-2-450x450.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-2-54x54.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-2-750x750.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-2-768x768.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-2.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-26-1024x1024.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-26-150x150.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-26-300x300.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-26-450x450.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-26-54x54.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-26-750x750.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-26-768x768.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-26.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-32-1024x1024.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-32-150x150.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-32-300x300.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-32-450x450.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-32-54x54.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-32-750x750.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-32-768x768.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-32.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-33-1024x1024.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-33-150x150.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-33-300x300.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-33-450x450.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-33-54x54.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-33-750x750.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-33-768x768.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-33.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/04-1-1024x1024.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/04-1-150x150.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/04-1-300x300.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/04-1-450x450.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/04-1-54x54.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/04-1-750x750.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/04-1-768x768.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/04-1.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/04-7-1024x1024.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/04-7-150x150.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/04-7-300x300.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/04-7-450x450.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/04-7-54x54.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/04-7-750x750.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/04-7-768x768.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/04-7.jpg",
  "https://klbtheme.com/fynode/wp-content/uploads/2025/01/cropped-fynode-thumbnail-180x180.png",
  "https://klbtheme.com/fynode/wp-content/uploads/2025/01/cropped-fynode-thumbnail-192x192.png",
  "https://klbtheme.com/fynode/wp-content/uploads/2025/01/cropped-fynode-thumbnail-270x270.png",
  "https://klbtheme.com/fynode/wp-content/uploads/2025/01/cropped-fynode-thumbnail-32x32.png"
];

const destDir = path.join(process.cwd(), 'public', 'images', 'downloads');

function downloadImage(url) {
  return new Promise((resolve) => {
    try {
      const filename = path.basename(new URL(url).pathname);
      const dest = path.join(destDir, filename);
      if (fs.existsSync(dest)) {
        return resolve({ status: 'already_exists', filename });
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
            resolve({ status: 'downloaded', filename });
          });
        } else {
          file.close();
          if (fs.existsSync(dest)) fs.unlinkSync(dest);
          resolve({ status: 'failed_status', filename, code: response.statusCode });
        }
      }).on('error', () => {
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        resolve({ status: 'failed_error', filename });
      });
    } catch (e) {
      resolve({ status: 'invalid_url', url });
    }
  });
}

async function run() {
  const uniqueUrls = Array.from(new Set(inputUrls));
  let alreadyExistsCount = 0;
  let downloadedCount = 0;
  let failedCount = 0;

  for (const url of uniqueUrls) {
    const result = await downloadImage(url);
    if (result.status === 'already_exists') {
      alreadyExistsCount++;
    } else if (result.status === 'downloaded') {
      console.log(`[NEW DOWNLOAD] ${result.filename}`);
      downloadedCount++;
    } else {
      console.log(`[FAILED] ${result.filename || url}`);
      failedCount++;
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Total URLs checked: ${uniqueUrls.length}`);
  console.log(`Already present (skipped): ${alreadyExistsCount}`);
  console.log(`Newly downloaded: ${downloadedCount}`);
  console.log(`Failed: ${failedCount}`);
}

run();
