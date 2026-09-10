// Genera tracks.json scansionando la cartella audio/ alla ricerca di file audio.
// Viene eseguito automaticamente da Vercel prima del deploy.
const fs   = require('fs');
const path = require('path');

const AUDIO_DIR = 'audio';
const AUDIO_EXT = /\.(wav|mp3|ogg|flac|aac|m4a)$/i;

const files = fs.existsSync(AUDIO_DIR)
  ? fs.readdirSync(AUDIO_DIR).filter(f => AUDIO_EXT.test(f))
  : [];

const tracks = files
  .map(f => ({
    name:  path.basename(f, path.extname(f)),
    file:  `${AUDIO_DIR}/${f}`,
    badge: path.extname(f).slice(1).toUpperCase()
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'it'));

fs.writeFileSync('tracks.json', JSON.stringify(tracks, null, 2), 'utf8');

console.log(`tracks.json generato: ${tracks.length} traccia/e`);
tracks.forEach((t, i) => console.log(`  ${i + 1}. ${t.name}`));
