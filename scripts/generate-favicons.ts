import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. High contrast, crisp SVG logo designed for both 16x16 tab favicons and 512x512 app icons
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="60%" stop-color="#090a0f" />
      <stop offset="100%" stop-color="#020408" />
    </radialGradient>
    <linearGradient id="cyanPurple" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22d3ee" />
      <stop offset="50%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#8b5cf6" />
    </linearGradient>
    <linearGradient id="glowBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.9" />
      <stop offset="50%" stop-color="#06b6d4" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#a855f7" stop-opacity="0.8" />
    </linearGradient>
    <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background container with smooth squircle -->
  <rect x="24" y="24" width="464" height="464" rx="112" fill="url(#bgGrad)" stroke="url(#glowBorder)" stroke-width="16" />

  <!-- Background decorative grid / cyber ring -->
  <circle cx="256" cy="256" r="150" fill="none" stroke="#22d3ee" stroke-width="6" stroke-opacity="0.25" stroke-dasharray="8 8" />
  <circle cx="256" cy="256" r="185" fill="none" stroke="#a855f7" stroke-width="4" stroke-opacity="0.2" />

  <!-- Outer Ring with glowing accent -->
  <circle cx="256" cy="256" r="115" fill="#090a0f" stroke="url(#cyanPurple)" stroke-width="18" filter="url(#cyanGlow)" />

  <!-- Compass Star Needle (The signature Obsidian Vault logo) -->
  <g transform="translate(256, 256)">
    <!-- North-East tip (bright cyan) -->
    <polygon points="0,-85 24,0 0,24 -24,0" fill="#22d3ee" />
    <!-- South-West tip (deep purple/cyan) -->
    <polygon points="0,85 24,0 0,-24 -24,0" fill="#0284c7" />
    <!-- East-West points -->
    <polygon points="-85,0 0,24 24,0 0,-24" fill="#06b6d4" />
    <polygon points="85,0 0,24 -24,0 0,-24" fill="#38bdf8" />

    <!-- Center Obsidian Crystal Core -->
    <circle cx="0" cy="0" r="28" fill="#090a0f" stroke="#22d3ee" stroke-width="8" />
    <circle cx="0" cy="0" r="14" fill="#22d3ee" />
  </g>

  <!-- Cyber Beacon Dot -->
  <circle cx="360" cy="152" r="18" fill="#22d3ee" filter="url(#cyanGlow)" />
</svg>`;

async function run() {
  const svgPath = path.join(publicDir, 'favicon.svg');
  fs.writeFileSync(svgPath, svgContent, 'utf-8');
  console.log('Saved favicon.svg');

  const svgBuffer = Buffer.from(svgContent);

  // Generate PNG sizes required by Google and Web standards:
  // Googlebot requires 48x48 or multiple (48, 96, 144, 192)
  await sharp(svgBuffer).resize(48, 48).png().toFile(path.join(publicDir, 'favicon-48x48.png'));
  console.log('Saved favicon-48x48.png');

  await sharp(svgBuffer).resize(96, 96).png().toFile(path.join(publicDir, 'favicon-96x96.png'));
  console.log('Saved favicon-96x96.png');

  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Saved apple-touch-icon.png');

  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png'));
  console.log('Saved icon-192.png');

  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'));
  console.log('Saved icon-512.png');

  // Generate standard 32x32 and write as favicon.ico
  // Modern browsers and Google will read favicon.ico
  const ico32Buffer = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico32Buffer);
  console.log('Saved favicon.ico');

  // Also create site.webmanifest for PWA and search engines
  const webManifest = {
    name: "Obsidian Vault",
    short_name: "ObsidianVault",
    description: "Ultra-fast, luxury cyber-dark link and bookmark management vault with embedded media viewer, advanced fuzzy search, and OpenGraph scraper.",
    start_url: "/",
    display: "standalone",
    background_color: "#090a0f",
    theme_color: "#090a0f",
    icons: [
      {
        src: "/favicon-48x48.png",
        sizes: "48x48",
        type: "image/png"
      },
      {
        src: "/favicon-96x96.png",
        sizes: "96x96",
        type: "image/png"
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png"
      },
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
  fs.writeFileSync(path.join(publicDir, 'site.webmanifest'), JSON.stringify(webManifest, null, 2), 'utf-8');
  console.log('Saved site.webmanifest');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
