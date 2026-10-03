// =====================================================================
//  PIXEL-QUEST – Jump & Run-Engine als MakeCode-Erweiterung
//  Grafiken: assets.ts, Sounds: sounds.ts, Level: levels.ts (alle generiert,
//  siehe tools/). Blöcke: Kategorie "Pixel-Quest".
//
//  Ab v0.2 nimmt die Engine Grafiken und Level bevorzugt aus dem PROJEKT:
//  Assets mit festen Namen (heroRun, grassSky, grassSpikes, ...) ersetzen die
//  eingebauten Grafiken, Welten kommen aus Tilemaps (Block "Welt ... Karte ...").
//  Spielobjekte werden in Tilemaps mit Markierungs-Kacheln (pqStart, pqCoin, ...)
//  gesetzt. Fehlt etwas im Projekt, greift der eingebaute Fallback.
// =====================================================================

namespace SpriteKind {
    export const Coin = SpriteKind.create()
    export const Gem = SpriteKind.create()
    export const Heart = SpriteKind.create()
    export const Chest = SpriteKind.create()
    export const Boss = SpriteKind.create()
    export const EnemyShot = SpriteKind.create()
    export const PlayerShot = SpriteKind.create()
    export const Slash = SpriteKind.create()
}

// ---------------------------------------------------------------- Sounds
namespace sfx {
    // Alle Sounds kommen aus sounds.ts (generiert mit dem Sound-Generator)
    export const startTune: music.Playable = sounds.startTune
    export const levelTune: music.Playable = sounds.levelTune
    export const winTune: music.Playable = sounds.winTune
    export const endTune: music.Playable = sounds.endTune
    export const heroDeath: music.Playable = sounds.heroDeath
    export const enemyDeath: music.Playable = sounds.enemyDeath
    export const bossTune: music.Playable = sounds.bossTune
    export const jump: music.Playable = sounds.jump
    export const doubleJump: music.Playable = sounds.doubleJump
    export const coin: music.Playable = sounds.coin
    export const gem: music.Playable = sounds.gem
    export const chest: music.Playable = sounds.chest
    export const heart: music.Playable = sounds.heart
    export const sword: music.Playable = sounds.sword
    export const shoot: music.Playable = sounds.shoot
    export const bossHit: music.Playable = sounds.bossHit
    export const enemyShot: music.Playable = sounds.enemyShot

    export function play(p: music.Playable) {
        music.play(p, music.PlaybackMode.InBackground)
    }
}

//% color="#1b7f86" weight=100 icon="\uf11b" block="Pixel-Quest"
//% groups='["Start", "Welten", "Einstellungen", "Ereignisse", "Werte"]'
namespace pixelquest {
    /** Grafik-Stil einer Welt: bestimmt Hintergrund, Kacheln und Gegner */
    export enum Style {
        //% block="Gras"
        Grass = 0,
        //% block="SciFi"
        SciFi = 1,
        //% block="Dungeon"
        Dungeon = 2,
        //% block="Unter Wasser"
        Underwater = 3,
        //% block="Weltall"
        Space = 4,
        //% block="Wüste"
        Desert = 5,
        //% block="Eis"
        Ice = 6,
        //% block="Magie"
        Magic = 7
    }
    const STYLE_NAMES = ["grass", "scifi", "dungeon", "underwater", "space", "desert", "ice", "magic"]
    const STYLE_TITLES = ["Gruene Wiesen", "Neon-Station", "Verlies", "Korallenriff", "Mondkrater", "Glutwueste", "Polarnacht", "Zauberwald"]
    const STYLE_BG_COLOR = [9, 15, 15, 8, 15, 9, 15, 12]
    // Physik je Stil in Prozent: Schwerkraft und Sprungkraft (Weltall: schwebende, weite Sprünge)
    const STYLE_GRAVITY = [100, 100, 100, 40, 45, 100, 100, 100]
    const STYLE_JUMP = [100, 100, 100, 100, 72, 100, 100, 100]
    // Eis: Figur beschleunigt und bremst langsam (Anteil pro Frame in Prozent, Boden / Luft)
    const ICE_GRIP = 4
    // Biom-Paletten (palettes.ts): beim Laden jeder Welt wird die Palette ihres Stils gesetzt
    let biomePalettes = true
    function applyPalette(style: number) {
        if (biomePalettes && style >= 0 && style < pqPalettes.biome.length) image.setPalette(pqPalettes.biome[style])
    }
    const ICE_AIR_GRIP = 8
    const WALKER_TYPES = ["slime", "robot", "skeleton", "crab", "alien", "scorpion", "penguin", "shroom"]
    const FLYER_TYPES = ["bird", "drone", "bat", "fish", "ufo", "vulture", "owl", "wisp"]
    const MARKER_NAMES = ["pqStart", "pqCoin", "pqGem", "pqHeart", "pqChest", "pqChestHeart", "pqWalker", "pqFlyer", "pqBoss", "pqGate"]
    const MAX_WORLDS = 9

    // ---------------------------------------------------------------- Einstellungen (per Block änderbar)
    let startWorld = 0
    let gravity = 400
    let runSpeed = 80
    let jumpSpeed = 175
    let doubleJumpSpeed = 160
    let doubleJumpEnabled = true
    let enemySpeedPercent = 100
    let bossHp = 20
    let startLives = 3
    let maxLives = 5
    let title = "PIXEL-QUEST"
    const WALKER_SPEED = [20, 28, 36]
    const FLYER_SPEED = [18, 24, 30]

    // Ereignis-Handler aus den Blöcken
    let coinHandler: () => void = null
    let enemyHandler: () => void = null
    let bossHandler: () => void = null
    let worldHandler: (world: number) => void = null

    // Markierungs-Kacheln (Reihenfolge wie MARKER_NAMES / gfx.markers)
    const M_START = 0, M_COIN = 1, M_GEM = 2, M_HEART = 3, M_CHEST = 4, M_CHEST_HEART = 5
    const M_WALKER = 6, M_FLYER = 7, M_BOSS = 8, M_GATE = 9

    // Waffen
    const W_NONE = 0, W_SWORD = 1, W_SHOTS = 2


    // ---------------------------------------------------------------- Zustand
    let hero: Sprite = null
    let level = 0
    let biome = 0
    let facing = 1
    let jumpsLeft = 1
    let lastGrounded = 0
    let invincibleUntil = 0
    let heroAnim = ""
    let checkpointX = 0
    let checkpointY = 0
    let levelDone = false
    let pendingLevel = -1
    let weapon = W_NONE
    let lastAttack = 0
    let bgLayers: Image[] = null
    // Unter Wasser: weniger Schwerkraft, langsames Sinken, mit A beliebig oft schwimmen
    let swimming = false
    let worldGravity = 400
    let worldJump = 100
    let slippery = false
    let controlsOn = false
    let lastStroke = 0
    const WATER_MAX_SINK = 60
    const WATER_STROKE = 95

    let boss: Sprite = null
    let bossBar: StatusBarSprite = null
    let bossActive = false
    let bossFacing = -1
    let bossNextJump = 0
    let bossNextShot = 0
    let bossFlashUntil = 0
    let bossAttackUntil = 0
    let gateCol = -1
    let started = false
    let running = false
    let worldCount = 3
    let bossWorld = false
    const worldMaps: tiles.TileMapData[] = [null, null, null, null, null, null, null, null, null]
    const worldStyles: number[] = [-1, -1, -1, -1, -1, -1, -1, -1, -1]
    let spikeIdx: number[] = []
    let goalIdx: number[] = []

    // ---------------------------------------------------------------- Assets: Projekt zuerst, sonst eingebaut
    let heroIdleR: Image[] = null, heroIdleL: Image[] = null, heroRunR: Image[] = null, heroRunL: Image[] = null
    let heroJumpR: Image[] = null, heroJumpL: Image[] = null, heroFallR: Image[] = null, heroFallL: Image[] = null
    let bossWalkR: Image[] = null, bossWalkL: Image[] = null
    let bossAttackR: Image = null, bossAttackL: Image = null, bossHurtImg: Image = null
    let coinFrames: Image[] = null
    let gemImg: Image = null, heartImg: Image = null, shotImg: Image = null, fireImg: Image = null
    let slashR: Image = null, slashL: Image = null, chestClosedImg: Image = null, chestOpenImg: Image = null
    const styleBg: Image[][] = []
    const styleTiles: Image[][] = []
    const walkerR: Image[][] = [], walkerL: Image[][] = [], flyerR: Image[][] = [], flyerL: Image[][] = []
    const walkerDead: Image[] = [], flyerDead: Image[] = []
    const markerImgs: Image[] = []

    function projImg(name: string, fallback: Image): Image {
        const a = helpers.getImageByName(name)
        return a ? a : fallback
    }
    function projAnim(name: string, fallback: Image[]): Image[] {
        const a: Image[] = helpers.getAnimationByName(name)
        return a && a.length > 0 ? a : fallback
    }
    function projTile(name: string, fallback: Image): Image {
        const a = helpers.getTileByName(name)
        return a ? a : fallback
    }
    function flipped(frames: Image[]): Image[] {
        return frames.map(function (f: Image) {
            const c = f.clone()
            c.flipX()
            return c
        })
    }

    function resolveAssets() {
        const idle = gfx.heroIdleR
        heroIdleR = projAnim("heroIdle", [idle[0], idle[0], idle[0], idle[0], idle[1]])
        heroIdleL = flipped(heroIdleR)
        heroRunR = projAnim("heroRun", gfx.heroRunR)
        heroRunL = flipped(heroRunR)
        heroJumpR = [projImg("heroJump", gfx.heroJumpR[0])]
        heroJumpL = flipped(heroJumpR)
        heroFallR = [projImg("heroFall", gfx.heroFallR[0])]
        heroFallL = flipped(heroFallR)
        bossWalkR = projAnim("bossWalk", gfx.bossWalkR)
        bossWalkL = flipped(bossWalkR)
        bossAttackR = projImg("bossAttack", gfx.bossAttackR)
        bossAttackL = flipped([bossAttackR])[0]
        bossHurtImg = projImg("bossHurt", gfx.bossHurt)
        coinFrames = projAnim("coinSpin", gfx.coin)
        gemImg = projImg("gem", gfx.gem)
        heartImg = projImg("heart", gfx.heart)
        shotImg = projImg("shot", gfx.shot)
        fireImg = projImg("fire", gfx.fire)
        slashR = projImg("slash", gfx.slashR)
        slashL = flipped([slashR])[0]
        chestClosedImg = projImg("chestClosed", gfx.chestClosed)
        chestOpenImg = projImg("chestOpen", gfx.chestOpen)
        for (let s = 0; s < STYLE_NAMES.length; s++) {
            const S = STYLE_NAMES[s]
            const bg = gfx.backgrounds[s]
            styleBg[s] = [projImg(S + "Sky", bg[0]), projImg(S + "Far", bg[1]), projImg(S + "Near", bg[2])]
            const t = gfx.tilesets[s]
            styleTiles[s] = [t[0], projTile(S + "GroundTop", t[1]), projTile(S + "Ground", t[2]), projTile(S + "Platform", t[3]),
                projTile(S + "Spikes", t[4]), projTile(S + "Goal", t[5]), projTile(S + "Deco", t[6])]
            walkerR[s] = projAnim(WALKER_TYPES[s] + "Walk", gfx.walkerR[s])
            walkerL[s] = flipped(walkerR[s])
            walkerDead[s] = projImg(WALKER_TYPES[s] + "Dead", gfx.walkerDead[s])
            flyerR[s] = projAnim(FLYER_TYPES[s] + "Fly", gfx.flyerR[s])
            flyerL[s] = flipped(flyerR[s])
            flyerDead[s] = projImg(FLYER_TYPES[s] + "Dead", gfx.flyerDead[s])
        }
        for (let m = 0; m < MARKER_NAMES.length; m++) markerImgs[m] = projTile(MARKER_NAMES[m], gfx.markers[m])
    }

    // ---------------------------------------------------------------- Welten: Block > Tilemap "weltN" > eingebaut
    function worldMap(i: number): tiles.TileMapData {
        if (i < 0 || i >= MAX_WORLDS) return null
        if (worldMaps[i]) return worldMaps[i]
        const named = helpers.getTilemapByName("welt" + (i + 1))
        if (named) return named
        if (i < levels.count) return levels.tilemap(i)
        return null
    }
    function worldStyle(i: number): number {
        if (worldStyles[i] >= 0) return worldStyles[i]
        if (i < levels.count) return levels.biomes[i]
        return i % 3
    }
    function worldName(i: number): string {
        const custom = worldMaps[i] || helpers.getTilemapByName("welt" + (i + 1))
        if (!custom && i < levels.count) return levels.names[i]
        return STYLE_TITLES[worldStyle(i)]
    }
    function countWorlds(): number {
        let n = 0
        while (n < MAX_WORLDS && worldMap(n)) n++
        return n
    }

    // ---------------------------------------------------------------- Parallax-Hintergrund
    // Drei Ebenen, die sich unterschiedlich schnell mit der Kamera bewegen.
    const PARALLAX = [0.05, 0.25, 0.55]
    scene.createRenderable(-10, function (target: Image, camera: scene.Camera) {
        if (!bgLayers) return
        for (let i = 0; i < 3; i++) {
            let off = -Math.floor(camera.drawOffsetX * PARALLAX[i]) % 160
            if (off > 0) off -= 160
            const y = -Math.floor(camera.drawOffsetY * PARALLAX[i] * 0.5)
            target.drawTransparentImage(bgLayers[i], off, y)
            target.drawTransparentImage(bgLayers[i], off + 160, y)
        }
    })

    // ---------------------------------------------------------------- Hilfen
    function tileset(): Image[] { return styleTiles[biome] }
    function isOnGround(s: Sprite) { return s.isHittingTile(CollisionDirection.Bottom) }
    function tileIndexAt(col: number, row: number): number {
        const tm = game.currentScene().tileMap
        if (!tm || tm.data.isOutsideMap(col, row)) return -1
        return tm.data.getTile(col, row)
    }
    function isSpikeAt(col: number, row: number) { return spikeIdx.indexOf(tileIndexAt(col, row)) >= 0 }
    function isGoalAt(col: number, row: number) { return goalIdx.indexOf(tileIndexAt(col, row)) >= 0 }
    function isWall(col: number, row: number) {
        return tiles.tileAtLocationIsWall(tiles.getTileLocation(col, row))
    }
    function clearLevelSprites() {
        const kinds = [SpriteKind.Enemy, SpriteKind.Coin, SpriteKind.Gem, SpriteKind.Heart, SpriteKind.Chest,
            SpriteKind.Boss, SpriteKind.EnemyShot, SpriteKind.PlayerShot, SpriteKind.Slash, SpriteKind.Projectile]
        for (const k of kinds) sprites.destroyAllSpritesOfKind(k)
        if (bossBar) { bossBar.destroy(); bossBar = null }
        boss = null
        bossActive = false
        gateCol = -1
    }

    // ---------------------------------------------------------------- Spielfigur
    function createHero() {
        hero = sprites.create(gfx.heroIdleR[0], SpriteKind.Player)
        hero.setFlag(SpriteFlag.Invisible, true)
        hero.ay = gravity
        hero.z = 10
        scene.cameraFollowSprite(hero)
    }

    // Steuerung an/aus; auf Eis übernimmt die Spielschleife die Bewegung mit Trägheit
    function setControls(on: boolean) {
        controlsOn = on
        controller.moveSprite(hero, on && !slippery ? runSpeed : 0, 0)
    }

    function updateIceMovement() {
        if (!slippery || !controlsOn) return
        let dir = 0
        if (controller.left.isPressed()) dir--
        if (controller.right.isPressed()) dir++
        const grip = isOnGround(hero) ? ICE_GRIP : ICE_AIR_GRIP
        hero.vx += (dir * runSpeed - hero.vx) * grip / 100
        if (dir == 0 && Math.abs(hero.vx) < 3) hero.vx = 0
    }

    function setHeroAnim(name: string, frames: Image[], interval: number) {
        if (heroAnim == name) return
        heroAnim = name
        animation.runImageAnimation(hero, frames, interval, true)
    }

    function updateHeroAnimation() {
        if (controller.left.isPressed()) facing = -1
        else if (controller.right.isPressed()) facing = 1
        const r = facing > 0
        if (!isOnGround(hero)) {
            if (hero.vy < 0) setHeroAnim(r ? "jumpR" : "jumpL", r ? heroJumpR : heroJumpL, 200)
            else setHeroAnim(r ? "fallR" : "fallL", r ? heroFallR : heroFallL, 200)
        } else if (Math.abs(hero.vx) > 4) {
            setHeroAnim(r ? "runR" : "runL", r ? heroRunR : heroRunL, 90)
        } else {
            setHeroAnim(r ? "idleR" : "idleL", r ? heroIdleR : heroIdleL, 250)
        }
    }

    function jump() {
        if (!hero || levelDone || !running) return
        if (swimming) {
            if (game.runtime() - lastStroke < 160) return
            lastStroke = game.runtime()
            hero.vy = -WATER_STROKE
            sfx.play(sfx.jump)
            hero.startEffect(effects.bubbles, 250)
            return
        }
        const grounded = isOnGround(hero) || game.runtime() - lastGrounded < 90
        if (grounded) {
            hero.vy = -jumpSpeed * worldJump / 100
            jumpsLeft = 1
            lastGrounded = 0
            sfx.play(sfx.jump)
        } else if (doubleJumpEnabled && jumpsLeft > 0) {
            jumpsLeft--
            hero.vy = -doubleJumpSpeed * worldJump / 100
            sfx.play(sfx.doubleJump)
            hero.startEffect(effects.trail, 200)
        }
    }
    controller.A.onEvent(ControllerButtonEvent.Pressed, jump)
    controller.up.onEvent(ControllerButtonEvent.Pressed, jump)
    // kurzer Tastendruck = kleiner Sprung
    controller.A.onEvent(ControllerButtonEvent.Released, function () {
        const cut = 70 * worldJump / 100
        if (hero && !swimming && hero.vy < -cut) hero.vy = -cut
    })

    function hurtHero() {
        if (game.runtime() < invincibleUntil || levelDone) return
        invincibleUntil = game.runtime() + 1500
        sfx.play(sfx.heroDeath)
        scene.cameraShake(3, 300)
        hero.vy = -120
        info.changeLifeBy(-1)
    }

    function respawnHero() {
        hero.setPosition(checkpointX, checkpointY)
        hero.vx = 0
        hero.vy = 0
    }

    // ---------------------------------------------------------------- Gegner
    function spawnWalker(col: number, row: number) {
        const e = sprites.create(walkerL[biome][0], SpriteKind.Enemy)
        tiles.placeOnTile(e, tiles.getTileLocation(col, row))
        e.ay = worldGravity
        e.data["flyer"] = false
        e.data["dir"] = -1
        e.data["dead"] = false
        setEnemyDirection(e, -1)
    }

    function spawnFlyer(col: number, row: number) {
        const e = sprites.create(flyerL[biome][0], SpriteKind.Enemy)
        tiles.placeOnTile(e, tiles.getTileLocation(col, row))
        e.setFlag(SpriteFlag.GhostThroughWalls, true)
        e.data["flyer"] = true
        e.data["baseY"] = e.y
        e.data["minX"] = e.x - 40
        e.data["maxX"] = e.x + 40
        e.data["phase"] = randint(0, 60) / 10
        e.data["dead"] = false
        setEnemyDirection(e, -1)
    }

    function setEnemyDirection(e: Sprite, dir: number) {
        e.data["dir"] = dir
        const flyer = e.data["flyer"]
        const d = Math.min(level, 2)
        const speed = (flyer ? FLYER_SPEED[d] : WALKER_SPEED[d]) * enemySpeedPercent / 100
        e.vx = dir * speed
        const frames = flyer ? (dir > 0 ? flyerR[biome] : flyerL[biome]) : (dir > 0 ? walkerR[biome] : walkerL[biome])
        animation.runImageAnimation(e, frames, flyer ? 100 : 160, true)
    }

    function killEnemy(e: Sprite) {
        if (e.data["dead"]) return
        e.data["dead"] = true
        animation.stopAnimation(animation.AnimationTypes.All, e)
        e.setImage(e.data["flyer"] ? flyerDead[biome] : walkerDead[biome])
        e.setFlag(SpriteFlag.GhostThroughWalls, true)
        e.vx = 0
        e.vy = e.data["flyer"] ? 0 : -40
        e.ay = worldGravity
        e.lifespan = 600
        info.changeScoreBy(20)
        sfx.play(sfx.enemyDeath)
        if (enemyHandler) enemyHandler()
    }

    function updateEnemies() {
        const t = game.runtime() / 350
        for (const e of sprites.allOfKind(SpriteKind.Enemy)) {
            if (e.data["dead"]) continue
            const dir: number = e.data["dir"]
            if (e.data["flyer"]) {
                e.y = e.data["baseY"] + Math.sin(t + e.data["phase"]) * 10
                if ((dir < 0 && e.x < e.data["minX"]) || (dir > 0 && e.x > e.data["maxX"])) setEnemyDirection(e, -dir)
            } else {
                if (e.vx == 0 && isOnGround(e)) { setEnemyDirection(e, -dir); continue }
                if (isOnGround(e)) {
                    const aheadX = dir < 0 ? e.left - 1 : e.right + 1
                    const col = Math.floor(aheadX / 16)
                    const row = Math.floor((e.bottom - 1) / 16)
                    // an Abgründen, Wänden und Stacheln umdrehen
                    if (!isWall(col, row + 1) || isWall(col, row) || isSpikeAt(col, row)) setEnemyDirection(e, -dir)
                }
            }
        }
    }

    // ---------------------------------------------------------------- Items & Truhen
    function spawnItem(kind: number, x: number, y: number, pop: boolean) {
        let s: Sprite
        if (kind == SpriteKind.Coin) {
            s = sprites.create(coinFrames[0], kind)
            animation.runImageAnimation(s, coinFrames, 120, true)
        } else if (kind == SpriteKind.Gem) {
            s = sprites.create(gemImg, kind)
        } else {
            s = sprites.create(heartImg, kind)
        }
        s.setPosition(x, y)
        s.data["ready"] = game.runtime() + (pop ? 350 : 0)
        if (pop) {
            s.vy = -130
            s.vx = randint(-45, 45)
            s.ay = worldGravity
            s.fx = 60
        }
        return s
    }

    function spawnChest(col: number, row: number, withHeart: boolean) {
        const c = sprites.create(chestClosedImg, SpriteKind.Chest)
        tiles.placeOnTile(c, tiles.getTileLocation(col, row))
        c.data["heart"] = withHeart
        c.data["open"] = false
    }

    function collectable(item: Sprite) {
        return game.runtime() >= item.data["ready"]
    }

    sprites.onOverlap(SpriteKind.Player, SpriteKind.Coin, function (p, item) {
        if (!collectable(item)) return
        item.destroy()
        info.changeScoreBy(10)
        sfx.play(sfx.coin)
        if (coinHandler) coinHandler()
    })
    sprites.onOverlap(SpriteKind.Player, SpriteKind.Gem, function (p, item) {
        if (!collectable(item)) return
        item.destroy(effects.confetti, 200)
        info.changeScoreBy(50)
        sfx.play(sfx.gem)
    })
    sprites.onOverlap(SpriteKind.Player, SpriteKind.Heart, function (p, item) {
        if (!collectable(item)) return
        item.destroy()
        if (info.life() < maxLives) info.changeLifeBy(1)
        else info.changeScoreBy(100)
        sfx.play(sfx.heart)
    })
    sprites.onOverlap(SpriteKind.Player, SpriteKind.Chest, function (p, chest) {
        if (chest.data["open"]) return
        chest.data["open"] = true
        chest.setImage(chestOpenImg)
        sfx.play(sfx.chest)
        if (chest.data["heart"]) {
            spawnItem(SpriteKind.Heart, chest.x, chest.y - 6, true)
            spawnItem(SpriteKind.Coin, chest.x, chest.y - 6, true)
        } else {
            for (let i = 0; i < 3; i++) spawnItem(SpriteKind.Coin, chest.x, chest.y - 6, true)
            spawnItem(SpriteKind.Gem, chest.x, chest.y - 6, true)
        }
    })

    // ---------------------------------------------------------------- Kampf
    sprites.onOverlap(SpriteKind.Player, SpriteKind.Enemy, function (p, e) {
        if (e.data["dead"]) return
        if (p.vy > 0 && p.bottom < e.y + 3) {
            // Sprung auf den Gegner
            killEnemy(e)
            p.vy = -150
            jumpsLeft = 1
        } else {
            hurtHero()
        }
    })

    function attack() {
        if (weapon == W_NONE || !hero || levelDone || !running) return
        const now = game.runtime()
        if (weapon == W_SWORD) {
            if (now - lastAttack < 350) return
            lastAttack = now
            const s = sprites.create(facing > 0 ? slashR : slashL, SpriteKind.Slash)
            s.setFlag(SpriteFlag.GhostThroughWalls, true)
            s.data["dir"] = facing
            s.data["hit"] = false
            s.setPosition(hero.x + facing * 12, hero.y)
            s.lifespan = 160
            sfx.play(sfx.sword)
        } else {
            if (now - lastAttack < 280) return
            lastAttack = now
            const img = shotImg.clone()
            if (facing < 0) img.flipX()
            const b = sprites.create(img, SpriteKind.PlayerShot)
            b.setPosition(hero.x + facing * 6, hero.y)
            b.vx = facing * 160
            b.setFlag(SpriteFlag.DestroyOnWall, true)
            b.setFlag(SpriteFlag.AutoDestroy, true)
            sfx.play(sfx.shoot)
        }
    }
    controller.B.onEvent(ControllerButtonEvent.Pressed, attack)

    sprites.onOverlap(SpriteKind.Slash, SpriteKind.Enemy, function (s, e) { killEnemy(e) })
    sprites.onOverlap(SpriteKind.PlayerShot, SpriteKind.Enemy, function (b, e) {
        if (e.data["dead"]) return
        b.destroy()
        killEnemy(e)
    })
    sprites.onOverlap(SpriteKind.Slash, SpriteKind.Boss, function (s, b) {
        if (s.data["hit"]) return
        s.data["hit"] = true
        damageBoss(2)
    })
    sprites.onOverlap(SpriteKind.PlayerShot, SpriteKind.Boss, function (shot, b) {
        shot.destroy()
        damageBoss(1)
    })
    sprites.onOverlap(SpriteKind.Player, SpriteKind.EnemyShot, function (p, shot) {
        shot.destroy(effects.fire, 100)
        hurtHero()
    })

    function chooseWeapon() {
        const sword = game.ask("Waehle deine Waffe!", "A = Schwert  B = Blaster")
        weapon = sword ? W_SWORD : W_SHOTS
        game.showLongText(sword
            ? "Schwert: stark (2 Schaden), aber kurze Reichweite. Angriff mit B."
            : "Blaster: sicher aus der Ferne (1 Schaden). Schiessen mit B.", DialogLayout.Bottom)
    }

    // ---------------------------------------------------------------- Endboss
    function spawnBoss(col: number, row: number) {
        boss = sprites.create(bossWalkL[0], SpriteKind.Boss)
        tiles.placeOnTile(boss, tiles.getTileLocation(col, row))
        boss.ay = gravity
        bossActive = false
        bossFacing = -1
    }

    function activateBoss() {
        bossActive = true
        bossBar = statusbars.create(40, 4, StatusBarKind.EnemyHealth)
        bossBar.max = bossHp
        bossBar.value = bossHp
        bossBar.setColor(2, 15)
        bossBar.setBarBorder(1, 1)
        bossBar.attachToSprite(boss, 3, 0)
        // Tor hinter dem Spieler schliessen
        if (gateCol >= 0) {
            const rows = game.currentScene().tileMap.data.height
            for (let r = 1; r <= rows - 3; r++) {
                const loc = tiles.getTileLocation(gateCol, r)
                tiles.setTileAt(loc, tileset()[2])
                tiles.setWallAt(loc, true)
            }
        }
        scene.cameraShake(4, 500)
        sfx.play(sfx.bossTune)
        boss.sayText("Du kommst hier nicht raus!", 1500, false)
        bossNextJump = game.runtime() + 2500
        bossNextShot = game.runtime() + 1500
    }

    function updateBoss() {
        if (!boss) return
        const now = game.runtime()
        if (!bossActive) {
            if (hero.x > boss.x - 90) activateBoss()
            return
        }
        const angry = bossBar.value <= bossHp / 2
        bossFacing = hero.x < boss.x ? -1 : 1
        boss.vx = bossFacing * (angry ? 45 : 30)
        if (now > bossNextJump && isOnGround(boss)) {
            boss.vy = angry ? -220 : -180
            bossNextJump = now + randint(1800, 3000)
        }
        if (now > bossNextShot) {
            bossNextShot = now + (angry ? 1100 : 1700)
            bossAttackUntil = now + 300
            const speeds = angry ? [-40, 0, 40] : [0]
            for (const vy of speeds) {
                const f = sprites.create(fireImg, SpriteKind.EnemyShot)
                f.setPosition(boss.x + bossFacing * 14, boss.y - 2)
                f.vx = bossFacing * 90
                f.vy = vy
                f.setFlag(SpriteFlag.DestroyOnWall, true)
                f.setFlag(SpriteFlag.AutoDestroy, true)
            }
            sfx.play(sfx.enemyShot)
        }
        // Bild wählen: Treffer-Blitz > Angriff > Laufen
        if (now < bossFlashUntil) boss.setImage(bossHurtImg)
        else if (now < bossAttackUntil) boss.setImage(bossFacing > 0 ? bossAttackR : bossAttackL)
        else {
            const frames = bossFacing > 0 ? bossWalkR : bossWalkL
            boss.setImage(frames[Math.floor(now / 250) % frames.length])
        }
    }

    function damageBoss(amount: number) {
        if (!bossActive || !boss) return
        bossBar.value -= amount
        bossFlashUntil = game.runtime() + 120
        sfx.play(sfx.bossHit)
        boss.vx = -bossFacing * 60
        if (bossBar.value <= 0) defeatBoss()
    }

    function defeatBoss() {
        bossActive = false
        levelDone = true
        info.changeScoreBy(500)
        bossBar.destroy()
        bossBar = null
        boss.destroy(effects.fire, 800)
        boss = null
        sprites.destroyAllSpritesOfKind(SpriteKind.EnemyShot)
        sfx.play(sfx.enemyDeath)
        pendingLevel = level + 1 // nächste Welt oder Sieg
        if (bossHandler) bossHandler()
    }

    sprites.onOverlap(SpriteKind.Player, SpriteKind.Boss, function (p, b) {
        if (!bossActive) return
        if (p.vy > 0 && p.bottom < b.top + 8) {
            p.vy = -190 // Rüstung zu hart – abprallen
            jumpsLeft = 1
        } else {
            hurtHero()
            p.vx = (p.x < b.x ? -1 : 1) * 100
        }
    })

    // ---------------------------------------------------------------- Kacheln: Stacheln & Ziel
    // Eigene Prüfung statt scene.onOverlapTile: der MakeCode-Compiler erlaubt dort
    // nur feste Kachelbilder, die Engine wählt die Kacheln aber je nach Welt.
    function checkHeroTiles() {
        const c0 = Math.floor((hero.left + 2) / 16), c1 = Math.floor((hero.right - 2) / 16)
        const r0 = Math.floor((hero.top + 2) / 16), r1 = Math.floor((hero.bottom - 1) / 16)
        for (let c = c0; c <= c1; c++) {
            for (let r = r0; r <= r1; r++) {
                if (isSpikeAt(c, r) && hero.bottom > r * 16 + 6) hurtHero()
                if (isGoalAt(c, r) && !levelDone) {
                    levelDone = true
                    pendingLevel = level + 1
                }
            }
        }
    }

    // ---------------------------------------------------------------- Level laden
    function loadLevel(i: number) {
        level = i
        biome = worldStyle(i)
        levelDone = false
        clearLevelSprites()
        tiles.setCurrentTilemap(worldMap(i))
        bgLayers = styleBg[biome]
        scene.setBackgroundColor(STYLE_BG_COLOR[biome])
        applyPalette(biome)
        swimming = biome == Style.Underwater
        worldGravity = Math.round(gravity * STYLE_GRAVITY[biome] / 100)
        worldJump = STYLE_JUMP[biome]
        slippery = biome == Style.Ice
        hero.ay = worldGravity

        // Kachelsatz der Karte einordnen: Markierungen, Stacheln, Ziel (Vergleich über den Bildinhalt)
        const data = game.currentScene().tileMap.data
        const ts = data.getTileset()
        const markerOf: number[] = []
        spikeIdx = []
        goalIdx = []
        for (let k = 0; k < ts.length; k++) {
            let m = -1
            for (let j = 0; j < markerImgs.length; j++) if (ts[k].equals(markerImgs[j]) || ts[k].equals(gfx.markers[j])) { m = j; break }
            markerOf.push(m)
            for (let s = 0; s < STYLE_NAMES.length; s++) {
                if (ts[k].equals(styleTiles[s][4]) || ts[k].equals(gfx.tilesets[s][4])) spikeIdx.push(k)
                if (ts[k].equals(styleTiles[s][5]) || ts[k].equals(gfx.tilesets[s][5])) goalIdx.push(k)
            }
        }
        // Markierungen durch Spielobjekte ersetzen
        bossWorld = false
        let startFound = false
        for (let r = 0; r < data.height; r++) {
            for (let c = 0; c < data.width; c++) {
                const m = markerOf[data.getTile(c, r)]
                if (m === undefined || m < 0) continue
                data.setTile(c, r, 0)
                data.setWall(c, r, false)
                const loc = tiles.getTileLocation(c, r)
                if (m == M_START) {
                    tiles.placeOnTile(hero, loc)
                    checkpointX = hero.x
                    checkpointY = hero.y
                    startFound = true
                }
                else if (m == M_COIN) spawnItem(SpriteKind.Coin, loc.x, loc.y, false)
                else if (m == M_GEM) spawnItem(SpriteKind.Gem, loc.x, loc.y, false)
                else if (m == M_HEART) spawnItem(SpriteKind.Heart, loc.x, loc.y, false)
                else if (m == M_CHEST) spawnChest(c, r, false)
                else if (m == M_CHEST_HEART) spawnChest(c, r, true)
                else if (m == M_WALKER) spawnWalker(c, r)
                else if (m == M_FLYER) spawnFlyer(c, r)
                else if (m == M_BOSS) { spawnBoss(c, r); bossWorld = true }
                else if (m == M_GATE) gateCol = c
            }
        }
        if (!startFound) {
            // ohne Startkachel: links oben über dem Boden beginnen
            tiles.placeOnTile(hero, tiles.getTileLocation(1, 1))
            checkpointX = hero.x
            checkpointY = hero.y
        }
        hero.setFlag(SpriteFlag.Invisible, false)
        hero.vx = 0
        hero.vy = 0
        heroAnim = ""
        facing = 1
        invincibleUntil = 0

        setControls(false)
        game.splash("Welt " + (i + 1) + ": " + worldName(i), swimming ? "A = schwimmen" : biome == Style.Space ? "Wenig Schwerkraft!" : slippery ? "Vorsicht, glatt!" : (i == 0 && doubleJumpEnabled ? "2x A = Doppelsprung" : ""))
        if (bossWorld && weapon == W_NONE) chooseWeapon()
        setControls(true)
        if (worldHandler) worldHandler(i + 1)
    }

    // Levelwechsel, Sieg und Niederlage laufen in einer eigenen Schleife,
    // damit Melodien bis zum Ende spielen dürfen.
    forever(function () {
        if (pendingLevel < 0) return
        const next = pendingLevel
        pendingLevel = -1
        setControls(false)
        hero.vx = 0
        if (next >= worldCount) {
            pause(800)
            game.setGameOverMessage(true, "Du hast gewonnen!")
            game.over(true)
        } else {
            music.play(sfx.levelTune, music.PlaybackMode.UntilDone)
            loadLevel(next)
        }
    })

    info.onLifeZero(function () {
        levelDone = true
        setControls(false)
        hero.vx = 0
        pause(500)
        game.setGameOverMessage(false, "Game Over")
        game.over(false)
    })

    // ---------------------------------------------------------------- Spielschleife
    game.onUpdate(function () {
        if (!hero || !running) return
        const now = game.runtime()
        // In den Abgrund gefallen: der Kartenrand wirkt in MakeCode wie eine Wand,
        // deshalb zählt schon das Erreichen des unteren Rands als Absturz.
        const mapBottom = game.currentScene().tileMap.areaHeight()
        if (hero.bottom >= mapBottom - 2 && !levelDone) {
            invincibleUntil = 0
            hurtHero()
            if (info.life() > 0) respawnHero()
        } else if (isOnGround(hero)) {
            lastGrounded = now
            jumpsLeft = 1
            // Kontrollpunkt merken (nur auf sicherem Boden, nie auf dem unteren Kartenrand)
            const col = Math.floor(hero.x / 16), row = Math.floor((hero.bottom - 1) / 16)
            if (now > invincibleUntil && hero.bottom < mapBottom - 16 && !isSpikeAt(col, row) && isWall(col, row + 1)
                && isWall(Math.floor((hero.left + 1) / 16), row + 1) && isWall(Math.floor((hero.right - 1) / 16), row + 1)) {
                checkpointX = hero.x
                checkpointY = hero.y
            }
        }
        if (swimming && hero.vy > WATER_MAX_SINK) hero.vy = WATER_MAX_SINK
        // Blinken während Unverwundbarkeit
        hero.setFlag(SpriteFlag.Invisible, now < invincibleUntil && Math.floor(now / 80) % 2 == 0)
        updateIceMovement()
        checkHeroTiles()
        updateHeroAnimation()
        updateEnemies()
        updateBoss()
        // Schwerthieb folgt der Figur
        for (const s of sprites.allOfKind(SpriteKind.Slash)) s.setPosition(hero.x + s.data["dir"] * 12, hero.y)
    })

    // ================================================================ Blöcke

    /**
     * Startet das Spiel mit Titelbild. Einstellungen vorher setzen.
     */
    //% blockId=pq_start block="starte Pixel-Quest"
    //% group="Start" weight=100
    export function startGame() {
        if (started) return
        started = true
        createHero()
        // Erst nach dem restlichen Startcode weitermachen: dann sind die Projekt-Assets
        // registriert und alle Einstellungs-Blöcke ausgeführt.
        control.runInParallel(runGame)
    }

    function runGame() {
        resolveAssets()
        worldCount = countWorlds()
        game.setGameOverPlayable(true, sfx.winTune, false)
        game.setGameOverPlayable(false, sfx.endTune, false)
        info.setScore(0)
        info.setLife(startLives)
        biome = worldStyle(0)
        bgLayers = styleBg[biome]
        scene.setBackgroundColor(STYLE_BG_COLOR[biome])
        applyPalette(biome)
        sfx.play(sfx.startTune)
        game.splash(title, worldCount + " Welten - druecke A")
        running = true
        loadLevel(Math.min(startWorld, worldCount - 1))
    }

    //% blockId=pq_title block="setze Titel auf $text"
    //% text.defl="PIXEL-QUEST"
    //% group="Start" weight=90
    export function setTitle(text: string) { title = text }

    //% blockId=pq_start_world block="beginne in Welt $world"
    //% world.min=1 world.max=9 world.defl=1
    //% group="Start" weight=80
    export function setStartWorld(world: number) { startWorld = Math.clamp(0, MAX_WORLDS - 1, world - 1) }

    /**
     * Legt Karte und Stil einer Welt fest. Die Karte im Tilemap-Editor malen; Spielobjekte
     * mit den Markierungs-Kacheln pqStart, pqCoin, pqWalker ... setzen. Ohne diesen Block gilt:
     * Tilemap "weltN" aus dem Projekt, sonst die eingebaute Welt.
     */
    //% blockId=pq_set_world block="Welt $world Karte $map Stil $style"
    //% world.min=1 world.max=9 world.defl=1
    //% map.shadow=tiles_tilemap_editor
    //% inlineInputMode=inline
    //% group="Welten" weight=100
    export function setWorld(world: number, map: tiles.TileMapData, style: Style) {
        const i = Math.clamp(1, MAX_WORLDS, world) - 1
        worldMaps[i] = map
        worldStyles[i] = style
    }

    /**
     * Ändert nur den Stil einer Welt (Hintergrund, Kacheln, Gegner), die Karte bleibt.
     */
    //% blockId=pq_set_world_style block="Welt $world Stil $style"
    //% world.min=1 world.max=9 world.defl=1
    //% group="Welten" weight=90
    export function setWorldStyle(world: number, style: Style) {
        worldStyles[Math.clamp(1, MAX_WORLDS, world) - 1] = style
    }

    //% blockId=pq_lives block="setze Leben auf $lives"
    //% lives.min=1 lives.max=9 lives.defl=3
    //% group="Einstellungen" weight=100
    export function setLives(lives: number) { startLives = lives }

    //% blockId=pq_max_lives block="setze maximale Leben auf $lives"
    //% lives.min=1 lives.max=9 lives.defl=5
    //% group="Einstellungen" weight=95
    export function setMaxLives(lives: number) { maxLives = lives }

    //% blockId=pq_run_speed block="setze Laufgeschwindigkeit auf $speed"
    //% speed.min=30 speed.max=200 speed.defl=80
    //% group="Einstellungen" weight=90
    export function setRunSpeed(speed: number) { runSpeed = speed }

    //% blockId=pq_jump block="setze Sprungkraft auf $power"
    //% power.min=80 power.max=320 power.defl=175
    //% group="Einstellungen" weight=85
    export function setJumpPower(power: number) { jumpSpeed = power }

    /**
     * Jede Welt bekommt die Farbpalette ihres Biom-Stils (z. B. mehr Blautöne unter Wasser, Sandtöne in der Wüste).
     * Aus: das Spiel nutzt die Palette des Projekts.
     */
    //% blockId=pq_biome_palettes block="Biom-Paletten $on"
    //% on.shadow=toggleOnOff on.defl=true
    //% group="Einstellungen" weight=79
    export function useBiomePalettes(on: boolean) { biomePalettes = on }

    //% blockId=pq_double_jump block="Doppelsprung $on"
    //% on.shadow=toggleOnOff on.defl=true
    //% group="Einstellungen" weight=80
    export function setDoubleJump(on: boolean) { doubleJumpEnabled = on }

    //% blockId=pq_double_jump_power block="setze Doppelsprung-Kraft auf $power"
    //% power.min=60 power.max=320 power.defl=160
    //% group="Einstellungen" weight=75
    export function setDoubleJumpPower(power: number) { doubleJumpSpeed = power }

    //% blockId=pq_gravity block="setze Schwerkraft auf $value"
    //% value.min=100 value.max=1000 value.defl=400
    //% group="Einstellungen" weight=70
    export function setGravity(value: number) { gravity = value }

    //% blockId=pq_enemy_speed block="setze Gegner-Tempo auf $percent Prozent"
    //% percent.min=25 percent.max=300 percent.defl=100
    //% group="Einstellungen" weight=65
    export function setEnemySpeed(percent: number) { enemySpeedPercent = percent }

    //% blockId=pq_boss_hp block="setze Boss-Energie auf $hp"
    //% hp.min=1 hp.max=100 hp.defl=20
    //% group="Einstellungen" weight=60
    export function setBossEnergy(hp: number) { bossHp = hp }

    //% blockId=pq_on_coin block="wenn Münze gesammelt"
    //% group="Ereignisse" weight=100
    export function onCoinCollected(handler: () => void) { coinHandler = handler }

    //% blockId=pq_on_enemy block="wenn Gegner besiegt"
    //% group="Ereignisse" weight=90
    export function onEnemyDefeated(handler: () => void) { enemyHandler = handler }

    //% blockId=pq_on_world block="wenn Welt $world beginnt"
    //% draggableParameters="reporter"
    //% group="Ereignisse" weight=80
    export function onWorldStart(handler: (world: number) => void) { worldHandler = handler }

    //% blockId=pq_on_boss block="wenn Boss besiegt"
    //% group="Ereignisse" weight=70
    export function onBossDefeated(handler: () => void) { bossHandler = handler }

    //% blockId=pq_hero block="Held"
    //% group="Werte" weight=100
    export function heroSprite(): Sprite { return hero }

    //% blockId=pq_world block="aktuelle Welt"
    //% group="Werte" weight=90
    export function currentWorld(): number { return level + 1 }

    //% blockId=pq_world_count block="Anzahl Welten"
    //% group="Werte" weight=80
    export function worldTotal(): number { return worldCount }
}
