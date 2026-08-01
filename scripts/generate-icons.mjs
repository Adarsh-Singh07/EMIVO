import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const src = 'public/images/downloads/cropped-fynode-thumbnail-192x192.png';
const outDir = 'public/icons';

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const sizes = [16, 32, 48, 72, 96, 128, 144, 152, 180, 192, 384, 512];

async function generate() {
  for (const size of sizes) {
    await sharp(src)
      .resize(size, size, { fit: 'contain', background: { r: 18, g: 33, b: 59, alpha: 1 } })
      .png()
      .toFile(join(outDir, `icon-${size}x${size}.png`));
    console.log(`Generated icon-${size}x${size}.png`);
  }

  // Apple touch icon (180x180)
  await sharp(src)
    .resize(180, 180, { fit: 'contain', background: { r: 18, g: 33, b: 59, alpha: 1 } })
    .png()
    .toFile(join(outDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // Favicon ICO (16x16 + 32x32)
  const favicon16 = await sharp(src).resize(16, 16).png().toBuffer();
  const favicon32 = await sharp(src).resize(32, 32).png().toBuffer();
  // ICO needs special handling - use 32px PNG as favicon.ico fallback
  await sharp(src).resize(32, 32, { fit: 'contain', background: { r: 18, g: 33, b: 59, alpha: 1 } })
    .png()
    .toFile(join(outDir, 'favicon.png'));
  console.log('Generated favicon.png (use /icons/favicon.png as fallback)');
}

generate().catch(console.error);
