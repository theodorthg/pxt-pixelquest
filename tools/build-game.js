// Erzeugt das "offene" Spielprojekt: alle Grafiken als Projekt-Assets (Namen, die die Engine sucht),
// die Welten als Tilemaps welt1..N (aus levels/level*.txt) und main.ts mit den Pixel-Quest-Blöcken.
// Aufruf: node tools/build-game.js [Zielordner] [Erweiterungs-Version]
//   Standard-Ziel: ../jump-and-run/projects/jump-and-run
const fs = require('fs'), path = require('path');
const G = require('../../generator/assetgen.js');
const CONFIG = require('./config.js');

const target = path.resolve(process.argv[2] || path.join(__dirname, '../../jump-and-run/projects/jump-and-run'));
const extVersion = process.argv[3] || 'v' + require('../pxt.json').version;
const STYLES = G.PQ_STYLES;

// Welten aus den Text-Leveln (Kopfzeilen name/biome wie in build-levels.js)
const dir = path.join(__dirname, '../levels');
const worlds = fs.readdirSync(dir).filter(f => /^level\d+\.txt$/.test(f)).sort().map((file, i) => {
    const meta = {}, rows = [];
    fs.readFileSync(path.join(dir, file), 'utf8').split('\n').forEach(l => {
        const m = l.match(/^(\w+):\s*(.*)$/);
        if (m) meta[m[1]] = m[2].trim(); else if (l.trim()) rows.push(l.replace(/\s+$/, ''));
    });
    const style = meta.biome || 'grass';
    return { name: 'welt' + (i + 1), style, level: G.asciiLevel('welt' + (i + 1), rows, style) };
});

const spec = G.pixelquestAssets({
    styles: STYLES.map(style => ({ style, seed: CONFIG.seeds[style] })),
    char: CONFIG.hero, bossType: CONFIG.bossType, bossSeed: CONFIG.bossSeed,
    itemSeed: CONFIG.itemSeed, enemySeed: CONFIG.enemySeed,
});
spec.tilemaps = worlds.map(w => w.level);
const files = G.buildAssetFiles(spec);

const main = [
    'pixelquest.setTitle("PIXEL-QUEST")',
    ...worlds.map((w, i) => `pixelquest.setWorld(${i + 1}, tilemap\`${w.name}\`, pixelquest.Style.${G.PQ_STYLE_ENUM[STYLES.indexOf(w.style)]})`),
    'pixelquest.setLives(3)',
    'pixelquest.setMaxLives(5)',
    'pixelquest.setRunSpeed(80)',
    'pixelquest.setJumpPower(175)',
    'pixelquest.setDoubleJump(true)',
    'pixelquest.setDoubleJumpPower(160)',
    'pixelquest.setGravity(400)',
    'pixelquest.setEnemySpeed(100)',
    'pixelquest.setBossEnergy(20)',
    'pixelquest.setStartWorld(1)',
    'pixelquest.startGame()',
    '',
].join('\n');

const pxtJsonPath = path.join(target, 'pxt.json');
const pxt = fs.existsSync(pxtJsonPath) ? JSON.parse(fs.readFileSync(pxtJsonPath, 'utf8')) : { name: 'pixel-quest' };
pxt.description = 'Pixel-Quest: Jump & Run in 3 Welten';
pxt.dependencies = { device: '*', pixelquest: 'github:theodorthg/pxt-pixelquest#' + extVersion };
pxt.files = ['main.blocks', 'main.ts', 'README.md', 'assets.json', 'images.g.jres', 'images.g.ts', 'tilemap.g.jres', 'tilemap.g.ts'];
pxt.preferredEditor = 'blocksprj';

fs.mkdirSync(target, { recursive: true });
for (const f in files) fs.writeFileSync(path.join(target, f), files[f]);
fs.writeFileSync(path.join(target, 'main.ts'), main);
if (!fs.existsSync(path.join(target, 'assets.json'))) fs.writeFileSync(path.join(target, 'assets.json'), '');
fs.writeFileSync(pxtJsonPath, JSON.stringify(pxt, null, 4) + '\n');
console.log('Spielprojekt geschrieben nach', target);
console.log(' ', spec.images.length, 'Bilder,', spec.anims.length, 'Animationen,', spec.tiles.length, 'Kacheln,', worlds.length, 'Welten; Erweiterung', extVersion);
console.log('  Danach main.blocks erzeugen: node ../jump-and-run/tools/check-blocks.js projects/<name> --write');
