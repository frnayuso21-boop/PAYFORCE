const sharp = require("sharp");
const fs    = require("fs");
const path  = require("path");

const svg = fs.readFileSync(path.join(__dirname, "..", "public", "icon.svg"));

const sizes = [
  { size: 512, name: "icon-512.png" },
  { size: 192, name: "icon-192.png" },
  { size: 180, name: "apple-touch-icon.png" },
  { size: 32,  name: "favicon-32x32.png" },
  { size: 16,  name: "favicon-16x16.png" },
];

Promise.all(
  sizes.map(({ size, name }) =>
    sharp(svg)
      .resize(size, size)
      .png()
      .toFile(path.join(__dirname, "..", "public", name))
      .then(() => console.log(`✅ ${name} (${size}x${size})`)),
  ),
)
  .then(() => console.log("\n🎉 Todos los iconos generados en /public/"))
  .catch((err) => { console.error(err); process.exit(1); });
