// Erzeugt projects/jump-and-run/assets.ts mit dem Arcade Asset Generator.
// Seeds und Figur hier anpassen, dann: node tools/build-assets.js
const fs = require('fs'), path = require('path');
const G = require('../../generator/assetgen.js');
const S = require('../../generator/soundgen.js');

const CONFIG = {
    seeds: { grass: '1', scifi: '7', dungeon: '3' },
    enemySeed: '5',
    bossType: 'knight', bossSeed: '2',
    itemSeed: '1',
    // Sounds: Name im Spiel -> [Vorlage aus dem Generator, Seed]
    sfx: {
        jump: ['jump', '1'], doubleJump: ['doubleJump', '1'], coin: ['coin', '1'], gem: ['coin', '7'],
        chest: ['powerup', '1'], heart: ['powerup', '4'], sword: ['hit', '3'], shoot: ['laser', '1'],
        bossHit: ['hit', '8'], enemyShot: ['laser', '5'],
    },
    melodies: {
        startTune: ['start', '1'], levelTune: ['level', '1'], winTune: ['win', '1'], endTune: ['gameover', '1'],
        heroDeath: ['death', '1'], enemyDeath: ['death', '6'], bossTune: ['boss', '1'],
    },
    hero: { skin: 0xd, hair: 0xe, shirt: 2, pants: 8, boots: 0xe, hat: 'cap', hatColor: 2, hairStyle: 'short', cape: 0 },
};
const BIOMES = ['grass', 'scifi', 'dungeon'];
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
