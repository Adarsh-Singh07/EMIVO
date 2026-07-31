const fs = require('fs');

const dataFile = 'e:/EMIVO/demo/lib/data.ts';
let content = fs.readFileSync(dataFile, 'utf8');

// A mapping of product IDs to high-quality, normalized product images (white background, transparent-like)
const imageMap = {
  'p_001': [ // iPhone 16 Pro
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-black-titanium-select-202409?wid=5120&hei=5120&fmt=webp&qlt=70&.v=1725525547466',
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-black-titanium-select-202409_AV1?wid=5120&hei=5120&fmt=webp&qlt=70&.v=1724036109919'
  ],
  'p_002': [ // Galaxy S25 Ultra (using S24 Ultra transparent PNG)
    'https://images.samsung.com/is/image/samsung/p6pim/in/2401/gallery/in-galaxy-s24-s928-sm-s928bzkqins-539573322?$1300_1038_PNG$',
    'https://images.samsung.com/is/image/samsung/p6pim/in/2401/gallery/in-galaxy-s24-s928-sm-s928bzkqins-539573322?$1300_1038_PNG$' // fallback
  ],
  'oneplus-12': [
    'https://oasis.opstatics.com/content/dam/oasis/page/2023/global/product/waffle/black/1-Black.png',
    'https://oasis.opstatics.com/content/dam/oasis/page/2023/global/product/waffle/black/4-Black.png'
  ],
  'macbook-air-m3': [
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mba13-midnight-select-202402?wid=5120&hei=5120&fmt=webp&qlt=70&.v=1707346225964',
    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mba13-midnight-select-202402_AV1?wid=5120&hei=5120&fmt=webp&qlt=70&.v=1707346225964'
  ],
  'sony-bravia-65': [
    'https://sony.scene7.com/is/image/sonyglobalsolutions/TV_FY24_31_1-4?$categorypdpnav$&fmt=png-alpha',
    'https://sony.scene7.com/is/image/sonyglobalsolutions/TV_FY24_31_1-4?$categorypdpnav$&fmt=png-alpha'
  ],
  'lg-oled-55': [
    'https://www.lg.com/in/images/tvs/md07584146/gallery/OLED55C3PSA-D-01.jpg',
    'https://www.lg.com/in/images/tvs/md07584146/gallery/OLED55C3PSA-D-02.jpg'
  ],
  'realme-gt-6': [
    'https://image01.realme.net/general/20240618/171868352656360ca04818c3941dfbca3b22e11e5c5ea.png.webp',
    'https://image01.realme.net/general/20240618/171868352656360ca04818c3941dfbca3b22e11e5c5ea.png.webp'
  ],
  'hp-spectre-x360': [
    'https://in-media.apjonlinecdn.com/catalog/product/c/0/c08889988_1.png',
    'https://in-media.apjonlinecdn.com/catalog/product/c/0/c08889989_1.png'
  ],
  'dell-xps-15': [
    'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/xps-notebooks/xps-15-9530/media-gallery/touch/notebook-xps-15-9530-t-sl-gallery-1.psd?fmt=png-alpha&wid=1000&hei=1000',
    'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/xps-notebooks/xps-15-9530/media-gallery/touch/notebook-xps-15-9530-t-sl-gallery-4.psd?fmt=png-alpha&wid=1000&hei=1000'
  ]
};

// Replace URLs for each product in the JSON representation
for (const [id, images] of Object.entries(imageMap)) {
  // Regex to match the gallery array for a specific product ID
  // This is a quick hack to replace the images dynamically
  const productRegex = new RegExp(`id:\\s*"${id}"[\\s\\S]*?gallery:\\s*\\[([\\s\\S]*?)\\]`);
  
  const newGallery = `
    { type: "image", url: "${images[0]}", alt: "Product View 1" },
    { type: "image", url: "${images[1]}", alt: "Product View 2" }
  `;
  
  content = content.replace(productRegex, (match) => {
    return match.replace(/gallery:\s*\[[\s\S]*?\]/, `gallery: [${newGallery}]`);
  });
}

fs.writeFileSync(dataFile, content, 'utf8');
console.log('Images normalized.');
