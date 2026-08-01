import fs from 'fs';
import path from 'path';
import https from 'https';

const urls = [
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/category-headphones.png',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/category-earphones.png',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/category-microphone.png',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/category-speakers.png',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/slider-03.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/slider-02-1.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/slider-03-1.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/banner-01.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/banner-02.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/banner-03.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-51.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-45.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-50.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-44.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-33.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-49.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-43.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-32.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-41.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-36.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/04-7.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-37.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-32.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-26.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-28.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-24.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-3.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-2.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-2.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/01-2.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/02-1.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/04-1.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/12/03-1.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/11/logo-01.png',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/11/logo-02.png',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/11/logo-03.png',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/11/logo-04.png',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/11/logo-05.png',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/11/logo-06.png',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/11/logo-08.png',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/11/blog-1-456x486.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/11/blog-2-456x486.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/11/blog-3-456x486.jpg',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/11/footer.png',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/11/footer2.png',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/11/footer3.png',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/11/footer4.png',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/11/payment.png',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/11/payment2.png',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/11/payment3.png',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/11/payment4.png',
  'https://klbtheme.com/fynode/wp-content/uploads/2024/11/payment5.png'
];

const destDir = path.join(process.cwd(), 'public', 'images', 'downloads');
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

function download(url) {
  return new Promise((resolve) => {
    const filename = path.basename(url);
    const dest = path.join(destDir, filename);
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
          console.log(`Downloaded: ${filename}`);
          resolve(true);
        });
      } else {
        console.error(`Failed ${response.statusCode}: ${url}`);
        file.close();
        fs.unlinkSync(dest);
        resolve(false);
      }
    }).on('error', (err) => {
      console.error(`Error ${err.message}: ${url}`);
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      resolve(false);
    });
  });
}

async function run() {
  for (const url of urls) {
    await download(url);
  }
}

run();
