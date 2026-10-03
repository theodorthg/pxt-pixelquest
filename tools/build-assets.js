// Erzeugt assets.ts (eingebaute Grafiken = Fallback) und sounds.ts mit dem Arcade Asset Generator.
// Seeds, Figur und Sounds stehen in tools/config.js. Aufruf: node tools/build-assets.js
const fs = require('fs'), path = require('path');
const G = require('../../generator/assetgen.js');
const S = require('../../generator/soundgen.js');

const CONFIG = require('./config.js');
const BIOMES = ['grass', 'scifi', 'dungeon', 'underwater', 'space', 'desert', 'ice', 'magic'];
const cap = s => s[0].toUpperCase() + s.slice(1);
const flip = frames => frames.map(f => f.flipX());
const empty = new G.Pix(16, 16);

let ts = '// AUTOMATISCH ERZEUGT von tools/build-assets.js – nicht von Hand bearbeiten.\nnamespace gfx {\n';
const refs = { bg: [], tiles: [], walkerR: [], walkerL: [], walkerDead: [], flyerR: [], flyerL: [], flyerDead: [] };

BIOMES.forEach(b => {
    const B = cap(b), seed = CONFIG.seeds[b];
    const bg = G.background(b, seed), t = G.tileset(b, seed);
    ['sky', 'far', 'near'].forEach(k => ts += G.imageToTS('bg' + B + cap(k), bg[k]));
    refs.bg.push(`[bg${B}Sky, bg${B}Far, bg${B}Near]`);
    // Reihenfolge = Tile-Index in levels.ts: 0 leer, 1 Boden oben, 2 Boden, 3 Plattform, 4 Stacheln, 5 Ziel, 6 Deko
    const list = [empty, t.groundTop, t.ground, t.platform, t.spikes, t.goal, t.deco];
    const names = ['Empty', 'GroundTop', 'Ground', 'Platform', 'Spikes', 'Goal', 'Deco'];
    list.forEach((img, i) => ts += G.imageToTS('tile' + B + names[i], img));
    refs.tiles.push('[' + names.map(n => 'tile' + B + n).join(', ') + ']');
    const [walker, flyer] = G.BIOME_ENEMIES[b];
    const w = G.enemy(walker, CONFIG.enemySeed), f = G.enemy(flyer, CONFIG.enemySeed);
    ts += G.framesToTS(walker + 'R', w.walk) + G.framesToTS(walker + 'L', flip(w.walk)) + G.imageToTS(walker + 'Dead', w.dead);
    ts += G.framesToTS(flyer + 'R', f.walk) + G.framesToTS(flyer + 'L', flip(f.walk)) + G.imageToTS(flyer + 'Dead', f.dead);
    refs.walkerR.push(walker + 'R'); refs.walkerL.push(walker + 'L'); refs.walkerDead.push(walker + 'Dead');
    refs.flyerR.push(flyer + 'R'); refs.flyerL.push(flyer + 'L'); refs.flyerDead.push(flyer + 'Dead');
});

const hero = G.character(CONFIG.hero);
for (const k in hero) ts += G.framesToTS('hero' + cap(k) + 'R', hero[k]) + G.framesToTS('hero' + cap(k) + 'L', flip(hero[k]));

const boss = G.boss(CONFIG.bossType, CONFIG.bossSeed);
ts += G.framesToTS('bossWalkR', boss.walk) + G.framesToTS('bossWalkL', flip(boss.walk));
ts += G.imageToTS('bossAttackR', boss.attack) + G.imageToTS('bossAttackL', boss.attack.flipX()) + G.imageToTS('bossHurt', boss.hurt);

const it = G.items(CONFIG.itemSeed);
ts += G.framesToTS('coin', it.coin);
['gem', 'heart', 'shot', 'fire', 'chestClosed', 'chestOpen'].forEach(k => ts += G.imageToTS(k, it[k]));
ts += G.imageToTS('slashR', it.slash) + G.imageToTS('slashL', it.slash.flipX());
// Markierungs-Kacheln für Level (Start, Münze, Gegner, ...), Reihenfolge = G.PQ_MARKERS
const mk = G.markers({ style: 'grass', char: CONFIG.hero, itemSeed: CONFIG.itemSeed, enemySeed: CONFIG.enemySeed, bossType: CONFIG.bossType, bossSeed: CONFIG.bossSeed });
mk.forEach((p, i) => ts += G.imageToTS(G.PQ_MARKERS[i], p));
ts += `    export const markers: Image[] = [${G.PQ_MARKERS.join(', ')}]\n`;

ts += `    export const backgrounds: Image[][] = [${refs.bg.join(', ')}]\n`;
ts += `    export const tilesets: Image[][] = [\n        ${refs.tiles.join(',\n        ')}\n    ]\n`;
['walkerR', 'walkerL', 'flyerR', 'flyerL'].forEach(k => ts += `    export const ${k}: Image[][] = [${refs[k].join(', ')}]\n`);
['walkerDead', 'flyerDead'].forEach(k => ts += `    export const ${k}: Image[] = [${refs[k].join(', ')}]\n`);
ts += '}\n';

const out = path.join(__dirname, '../assets.ts');
fs.writeFileSync(out, ts);
console.log('geschrieben:', out, Math.round(ts.length / 1024) + ' KB');

let snd = '// AUTOMATISCH ERZEUGT von tools/build-assets.js – Sounds im CONFIG-Block dort ändern.\nnamespace sounds {\n';
for (const k in CONFIG.sfx) snd += S.sfxToTS(k, S.sfx(CONFIG.sfx[k][0], CONFIG.sfx[k][1]));
for (const k in CONFIG.melodies) snd += S.melodyToTS(k, S.melody(CONFIG.melodies[k][0], CONFIG.melodies[k][1]));
snd += '}\n';
const sndOut = path.join(__dirname, '../sounds.ts');
fs.writeFileSync(sndOut, snd);
console.log('geschrieben:', sndOut);
