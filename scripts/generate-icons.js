// Genera le icone della PWA a partire dal pallone usato nella UI (ballSVG in index.html).
// Uso: npm run icons   (richiede la devDependency "sharp"). I PNG prodotti sono versionati in icons/.
const fs   = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(__dirname, '..', 'icons');
const BG  = '#0a1f12';

// Il pallone occupa un viewBox 100x100; "scale" è la frazione di tela coperta dal pallone.
function iconSvg({ size, scale, rounded }) {
  const ball = size * scale;
  const off  = (size - ball) / 2;
  const k    = ball / 100;
  const bgShape = rounded
    ? `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${BG}"/>`
    : `<rect width="${size}" height="${size}" fill="${BG}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="bg" cx="36%" cy="30%" r="68%">
      <stop offset="0%" stop-color="#f8f8f8"/><stop offset="100%" stop-color="#aaaaaa"/>
    </radialGradient>
    <clipPath id="cl"><circle cx="50" cy="50" r="46"/></clipPath>
  </defs>
  ${bgShape}
  <g transform="translate(${off} ${off}) scale(${k})">
    <circle cx="50" cy="50" r="49" fill="none" stroke="#f0a500" stroke-width="2.4"/>
    <circle cx="50" cy="50" r="48" fill="#111"/>
    <circle cx="50" cy="50" r="46" fill="url(#bg)"/>
    <g clip-path="url(#cl)" fill="#111" opacity=".85">
      <polygon points="50,29 63,39 58,54 42,54 37,39"/>
      <polygon points="50,4 62,13 59,27 41,27 38,13"/>
      <polygon points="77,22 83,36 73,44 62,38 63,23"/>
      <polygon points="79,59 74,73 61,75 55,62 66,53"/>
      <polygon points="21,59 34,53 45,62 39,75 26,73"/>
      <polygon points="23,22 37,23 38,38 27,44 17,36"/>
    </g>
    <circle cx="50" cy="50" r="46" fill="none" stroke="#444" stroke-width="1"/>
  </g>
</svg>`;
}

const targets = [
  // purpose "any": pallone ben visibile su sfondo pieno
  { file: 'icon-192.png',          size: 192, scale: 0.86 },
  { file: 'icon-512.png',          size: 512, scale: 0.86 },
  // purpose "maskable": tutto il contenuto entro la safe zone (margine 10% per lato => 80%)
  { file: 'icon-maskable-512.png', size: 512, scale: 0.78 },
  // iOS arrotonda da sé gli angoli: serve un quadrato pieno senza trasparenza
  { file: 'apple-touch-icon.png',  size: 180, scale: 0.8 },
  { file: 'favicon-32.png',        size: 32,  scale: 0.96, rounded: true },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const t of targets) {
    const svg = iconSvg(t);
    await sharp(Buffer.from(svg), { density: 384 })
      .resize(t.size, t.size)
      .flatten({ background: BG })
      .png({ compressionLevel: 9 })
      .toFile(path.join(OUT, t.file));
    console.log('icons/' + t.file);
  }
  // Favicon vettoriale per i browser moderni
  fs.writeFileSync(path.join(OUT, 'favicon.svg'), iconSvg({ size: 64, scale: 0.96, rounded: true }));
  console.log('icons/favicon.svg');
})().catch(e => { console.error(e); process.exit(1); });
