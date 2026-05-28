import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');

const themeColor = '#1d4ed8';
const textColor = '#ffffff';

async function createIcon(size, filename, maskable = false) {
  const padding = maskable ? size * 0.2 : 0; // 20% padding for maskable
  const contentSize = size - (padding * 2);
  const fontSize = Math.floor(contentSize * 0.6);
  
  // Create SVG
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${themeColor}"/>
      ${maskable ? `<rect x="${padding}" y="${padding}" width="${contentSize}" height="${contentSize}" fill="${themeColor}" rx="${contentSize * 0.2}"/>` : ''}
      <text 
        x="50%" 
        y="50%" 
        font-family="Arial, sans-serif" 
        font-size="${fontSize}" 
        font-weight="bold" 
        fill="${textColor}" 
        text-anchor="middle" 
        dominant-baseline="central"
      >G</text>
    </svg>
  `;

  // Convert SVG to PNG
  const buffer = await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toBuffer();

  const filepath = join(publicDir, filename);
  writeFileSync(filepath, buffer);
  console.log(`Created ${filename} (${size}x${size})`);
}

async function generateIcons() {
  console.log('Generating PWA icons...');
  
  await createIcon(192, 'pwa-192.png', false);
  await createIcon(512, 'pwa-512.png', false);
  await createIcon(512, 'pwa-512-maskable.png', true);
  
  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
