// Genera tracks.json scansionando la cartella audio/ alla ricerca di file audio.
// Ogni sottocartella diretta di audio/ diventa una categoria: i file al suo interno
// vengono etichettati con il nome della cartella. I file posti direttamente dentro
// audio/ (senza sottocartella) finiscono nella categoria di default.
// Viene eseguito automaticamente da Vercel prima del deploy.
const fs   = require('fs');
const path = require('path');

const AUDIO_DIR         = 'audio';
const AUDIO_EXT         = /\.(wav|mp3|ogg|flac|aac|m4a)$/i;
const DEFAULT_CATEGORY  = 'Generali';

function collectTracks() {
  if (!fs.existsSync(AUDIO_DIR)) return [];

  const tracks  = [];
  const entries = fs.readdirSync(AUDIO_DIR, { withFileTypes: true });

  entries.forEach(entry => {
    if (entry.isDirectory()) {
      const category = entry.name;
      const dirPath  = path.join(AUDIO_DIR, entry.name);

      fs.readdirSync(dirPath)
        .filter(f => AUDIO_EXT.test(f))
        .forEach(f => tracks.push({
          name:     path.basename(f, path.extname(f)),
          file:     `${dirPath}/${f}`.split(path.sep).join('/'),
          badge:    path.extname(f).slice(1).toUpperCase(),
          category
        }));
    } else if (entry.isFile() && AUDIO_EXT.test(entry.name)) {
      tracks.push({
        name:     path.basename(entry.name, path.extname(entry.name)),
        file:     `${AUDIO_DIR}/${entry.name}`,
        badge:    path.extname(entry.name).slice(1).toUpperCase(),
        category: DEFAULT_CATEGORY
      });
    }
  });

  return tracks;
}

const tracks = collectTracks().sort((a, b) =>
  a.category.localeCompare(b.category, 'it') || a.name.localeCompare(b.name, 'it')
);

fs.writeFileSync('tracks.json', JSON.stringify(tracks, null, 2), 'utf8');

console.log(`tracks.json generato: ${tracks.length} traccia/e`);
let lastCategory = null;
tracks.forEach(t => {
  if (t.category !== lastCategory) {
    console.log(`\n[${t.category}]`);
    lastCategory = t.category;
  }
  console.log(`  - ${t.name}`);
});
