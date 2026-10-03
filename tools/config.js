// Gemeinsame Einstellungen für build-assets.js (eingebaute Grafiken/Sounds der Erweiterung)
// und build-game.js (Projekt-Assets des Spiels). Gleiche Werte = gleiches Aussehen.
module.exports = {
    seeds: { grass: '1', scifi: '7', dungeon: '3', underwater: '1', space: '1' },
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
