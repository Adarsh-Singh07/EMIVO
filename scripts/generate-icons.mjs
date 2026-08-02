import sharp from 'sharp';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
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

  // Browser-default /favicon.ico — ICO container wrapping PNG entries
  // (libvips in this sharp build can't save .ico, so assemble it by hand).
  await buildFaviconIco();
}

const NAVY = { r: 18, g: 33, b: 59, alpha: 1 };

async function buildFaviconIco() {
  const sizes = [16, 32, 48];
  const entries = await Promise.all(
    sizes.map(async (size) => {
      const buf = await sharp(src)
        .resize(size, size, { fit: 'contain', background: NAVY })
        .png()
        .toBuffer();
      return { size, buf };
    })
  );

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4); // image count

  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  entries.forEach(({ size, buf }, i) => {
    const e = dir.subarray(i * 16, i * 16 + 16);
    e.writeUInt8(size === 256 ? 0 : size, 0); // width (0 => 256)
    e.writeUInt8(size === 256 ? 0 : size, 1); // height
    e.writeUInt8(0, 2); // color count
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // color planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(buf.length, 8); // bytes in resource
    e.writeUInt32LE(offset, 12); // image data offset
    offset += buf.length;
  });

  writeFileSync(
    'public/favicon.ico',
    Buffer.concat([header, dir, ...entries.map((e) => e.buf)])
  );
  console.log('Generated public/favicon.ico (multi-size)');
}

generate().catch(console.error);
