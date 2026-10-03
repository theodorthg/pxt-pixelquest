// Wandelt levels/level*.txt in projects/jump-and-run/levels.ts um.
// Aufruf: node tools/build-levels.js
//
// Legende (ein Zeichen = eine 16x16-Kachel):
//   .  leer            #  Boden (oberste Reihe bekommt automatisch Gras/Kante)
//   =  Plattform       ^  Stacheln         G  Ziel        d  Deko
//   P  Spielerstart    c  Münze            g  Edelstein   h  Herz
//   C  Truhe (Münzen)  H  Truhe (Herz)     e  Gegner läuft
//   f  Gegner fliegt   B  Endboss          X  Tor zur Boss-Arena (schließt sich)
// Kopfzeilen: "name: ...", "biome: grass|scifi|dungeon"
const fs = require('fs'), path = require('path');

const TILE = { '.': 0, '#': 2, '=': 3, '^': 4, 'G': 5, 'd': 6 };
const WALL = new Set(['#', '=']);
const MARKER_CHARS = 'PcghCHefBX';   // -> Kachel 7..16 = gfx.markers[0..9] (Reihenfolge wie im Generator)
const BIOMES = ['grass', 'scifi', 'dungeon', 'underwater', 'space', 'desert'];

const dir = path.join(__dirname, '../levels');
const files = fs.readdirSync(dir).filter(f => /^level\d+\.txt$/.test(f)).sort();
const out = { maps: [], biomes: [], names: [] };

files.forEach((file, li) => {
    const lines = fs.readFileSync(path.join(dir, file), 'utf8').split('\n');
    const meta = {}, rows = [];
    lines.forEach(l => {
        const m = l.match(/^(\w+):\s*(.*)$/);
        if (m) meta[m[1]] = m[2].trim(); else if (l.trim()) rows.push(l.replace(/\s+$/, ''));
    });
    const w = Math.max(...rows.map(r => r.length)), h = rows.length;
    const grid = rows.map(r => r.padEnd(w, '.'));
    const bytes = [w & 255, w >> 8, h & 255, h >> 8], walls = [];
    let objects = 0;
    let hasPlayer = false;
    for (let y = 0; y < h; y++) {
        const wr = [];
        for (let x = 0; x < w; x++) {
            const ch = grid[y][x];
            let t = 0;
            if (ch in TILE) t = TILE[ch];
            else if (MARKER_CHARS.indexOf(ch) >= 0) { t = 7 + MARKER_CHARS.indexOf(ch); objects++; if (ch === 'P') hasPlayer = true; }
            else throw new Error(`${file}: unbekanntes Zeichen '${ch}' in Zeile ${y + 1}, Spalte ${x + 1}`);
            if (ch === '#' && (y === 0 || grid[y - 1][x] !== '#')) t = 1; // Oberkante
            bytes.push(t);
            wr.push(WALL.has(ch) ? '2' : '.');
        }
        walls.push('        ' + wr.join(' '));
    }
    if (!hasPlayer) throw new Error(`${file}: kein Spielerstart (P)`);
    const biome = BIOMES.indexOf(meta.biome || 'grass');
    if (biome < 0) throw new Error(`${file}: unbekanntes Biom ${meta.biome}`);
    out.maps.push(`            case ${li}: return tiles.createTilemap(hex\`${Buffer.from(bytes).toString('hex')}\`, img\`\n${walls.join('\n')}\n            \`, gfx.tilesets[${biome}].concat(gfx.markers), TileScale.Sixteen)`);
    out.biomes.push(biome);
    out.names.push(JSON.stringify(meta.name || 'Level ' + (li + 1)));
    console.log(`${file}: ${w}x${h}, Biom ${BIOMES[biome]}, ${objects} Objekte`);
});

const ts = `// AUTOMATISCH ERZEUGT von tools/build-levels.js – Level in levels/*.txt bearbeiten.
namespace levels {
    export const count = ${files.length}
    export const names: string[] = [${out.names.join(', ')}]
    export const biomes: number[] = [${out.biomes.join(', ')}]
    // Spielobjekte stecken als Markierungs-Kacheln (gfx.markers) in den Tilemaps.
    export function tilemap(i: number): tiles.TileMapData {
        switch (i) {
${out.maps.join('\n')}
        }
        return null
    }
}
`;
fs.writeFileSync(path.join(__dirname, '../levels.ts'), ts);
