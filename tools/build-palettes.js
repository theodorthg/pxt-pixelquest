// Erzeugt palettes.ts (Biom-Paletten) mit dem Arcade Asset Generator. Aufruf: node tools/build-palettes.js
const fs = require('fs'), path = require('path');
const G = require('../../generator/assetgen.js');
let ts = '// AUTOMATISCH ERZEUGT von tools/build-palettes.js – Farben in generator/assetgen.js (BIOME_PALETTE_OVERRIDES) ändern.\nnamespace pqPalettes {\n';
ts += '    // je Stil 16 Farben zu je 3 Byte (RGB), Reihenfolge = pixelquest.Style\n    export const biome: Buffer[] = [\n';
ts += G.PQ_STYLES.map(b => `        hex\`${G.paletteHex(G.biomePalette(b))}\``).join(',\n') + '\n    ]\n}\n';
fs.writeFileSync(path.join(__dirname, '../palettes.ts'), ts);
console.log('palettes.ts geschrieben');
