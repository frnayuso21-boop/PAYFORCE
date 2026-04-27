const sharp = require("sharp");
const path = require("path");

// Hexágono PayForce — fondo negro sólido, hex blanco centrado al 60%
const svgIcon = `
<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#ffffff" rx="90"/>
  <path d="M256 105 L390 183 L390 329 L256 407 L122 329 L122 183 Z" fill="#0A0A0A"/>
</svg>
`;

const sizes = [
  { size: 512, name: "icon-512.png" },
  { size: 192, name: "icon-192.png" },
  { size: 180, name: "apple-touch-icon.png" },
  { size: 32,  name: "favicon-32.png" },
  { size: 16,  name: "favicon-16.png" },
];

async function generate() {
  const buf = Buffer.from(svgIcon);
  for (const { size, name } of sizes) {
    const out = path.join(__dirname, "..", "public", name);
    await sharp(buf)
      .resize(size, size)
      .png()
      .toFile(out);
    console.log(`✅ ${name} (${size}x${size})`);
  }
  console.log("\n🎉 Iconos generados correctamente en /public/");
}

generate().catch((err) => { console.error(err); process.exit(1); });
