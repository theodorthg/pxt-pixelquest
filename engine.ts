// =====================================================================
//  PIXEL-QUEST – Jump & Run-Engine als MakeCode-Erweiterung
//  Grafiken: assets.ts, Sounds: sounds.ts, Level: levels.ts (alle generiert,
//  siehe tools/). Blöcke: Kategorie "Pixel-Quest".
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
//% groups='["Start", "Einstellungen", "Ereignisse", "Werte"]'
namespace pixelquest {
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

    // Spawn-Typen (siehe tools/build-levels.js)
    const S_PLAYER = 0, S_COIN = 1, S_GEM = 2, S_HEART = 3, S_CHEST = 4, S_CHEST_HEART = 5
    const S_WALKER = 6, S_FLYER = 7, S_BOSS = 8, S_GATE = 9

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

    let boss: Sprite = null
    let bossBar: StatusBarSprite = null
    let bossActive = false
    let bossFacing = -1
    let bossNextJump = 0
    let bossNextShot = 0
    let bossFlashUntil = 0
    let bossAttackUntil = 0
    let gateCol = -1

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
    function tileset(): Image[] { return gfx.tilesets[biome] }
    function isOnGround(s: Sprite) { return s.isHittingTile(CollisionDirection.Bottom) }
    function tileIs(col: number, row: number, img: Image) {
        return tiles.tileAtLocationEquals(tiles.getTileLocation(col, row), img)
    }
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
        hero.ay = gravity
        hero.z = 10
        controller.moveSprite(hero, runSpeed, 0)
        scene.cameraFollowSprite(hero)
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
            if (hero.vy < 0) setHeroAnim(r ? "jumpR" : "jumpL", r ? gfx.heroJumpR : gfx.heroJumpL, 200)
            else setHeroAnim(r ? "fallR" : "fallL", r ? gfx.heroFallR : gfx.heroFallL, 200)
        } else if (hero.vx != 0) {
            setHeroAnim(r ? "runR" : "runL", r ? gfx.heroRunR : gfx.heroRunL, 90)
        } else {
            const idle = r ? gfx.heroIdleR : gfx.heroIdleL
            setHeroAnim(r ? "idleR" : "idleL", [idle[0], idle[0], idle[0], idle[0], idle[1]], 250)
        }
    }

    function jump() {
        if (!hero || levelDone) return
        const grounded = isOnGround(hero) || game.runtime() - lastGrounded < 90
        if (grounded) {
            hero.vy = -jumpSpeed
            jumpsLeft = 1
            lastGrounded = 0
            sfx.play(sfx.jump)
        } else if (doubleJumpEnabled && jumpsLeft > 0) {
            jumpsLeft--
            hero.vy = -doubleJumpSpeed
            sfx.play(sfx.doubleJump)
            hero.startEffect(effects.trail, 200)
        }
    }
    controller.A.onEvent(ControllerButtonEvent.Pressed, jump)
    controller.up.onEvent(ControllerButtonEvent.Pressed, jump)
    // kurzer Tastendruck = kleiner Sprung
    controller.A.onEvent(ControllerButtonEvent.Released, function () {
        if (hero && hero.vy < -70) hero.vy = -70
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
        const e = sprites.create(gfx.walkerL[biome][0], SpriteKind.Enemy)
        tiles.placeOnTile(e, tiles.getTileLocation(col, row))
        e.ay = gravity
        e.data["flyer"] = false
        e.data["dir"] = -1
        e.data["dead"] = false
        setEnemyDirection(e, -1)
    }

    function spawnFlyer(col: number, row: number) {
        const e = sprites.create(gfx.flyerL[biome][0], SpriteKind.Enemy)
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
        const speed = (flyer ? FLYER_SPEED[level] : WALKER_SPEED[level]) * enemySpeedPercent / 100
        e.vx = dir * speed
        const frames = flyer ? (dir > 0 ? gfx.flyerR[biome] : gfx.flyerL[biome]) : (dir > 0 ? gfx.walkerR[biome] : gfx.walkerL[biome])
        animation.runImageAnimation(e, frames, flyer ? 100 : 160, true)
    }

    function killEnemy(e: Sprite) {
        if (e.data["dead"]) return
        e.data["dead"] = true
        animation.stopAnimation(animation.AnimationTypes.All, e)
        e.setImage(e.data["flyer"] ? gfx.flyerDead[biome] : gfx.walkerDead[biome])
        e.setFlag(SpriteFlag.GhostThroughWalls, true)
        e.vx = 0
        e.vy = e.data["flyer"] ? 0 : -40
        e.ay = gravity
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
                    if (!isWall(col, row + 1) || isWall(col, row) || tileIs(col, row, tileset()[4])) setEnemyDirection(e, -dir)
                }
            }
        }
    }

    // ---------------------------------------------------------------- Items & Truhen
    function spawnItem(kind: number, x: number, y: number, pop: boolean) {
        let s: Sprite
        if (kind == SpriteKind.Coin) {
            s = sprites.create(gfx.coin[0], kind)
            animation.runImageAnimation(s, gfx.coin, 120, true)
        } else if (kind == SpriteKind.Gem) {
            s = sprites.create(gfx.gem, kind)
        } else {
            s = sprites.create(gfx.heart, kind)
        }
        s.setPosition(x, y)
        s.data["ready"] = game.runtime() + (pop ? 350 : 0)
        if (pop) {
            s.vy = -130
            s.vx = randint(-45, 45)
            s.ay = gravity
            s.fx = 60
        }
        return s
    }

    function spawnChest(col: number, row: number, withHeart: boolean) {
        const c = sprites.create(gfx.chestClosed, SpriteKind.Chest)
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
        chest.setImage(gfx.chestOpen)
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
        if (weapon == W_NONE || !hero || levelDone) return
        const now = game.runtime()
        if (weapon == W_SWORD) {
            if (now - lastAttack < 350) return
            lastAttack = now
            const s = sprites.create(facing > 0 ? gfx.slashR : gfx.slashL, SpriteKind.Slash)
            s.setFlag(SpriteFlag.GhostThroughWalls, true)
            s.data["dir"] = facing
            s.data["hit"] = false
            s.setPosition(hero.x + facing * 12, hero.y)
            s.lifespan = 160
            sfx.play(sfx.sword)
        } else {
            if (now - lastAttack < 280) return
            lastAttack = now
            const img = gfx.shot.clone()
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
        boss = sprites.create(gfx.bossWalkL[0], SpriteKind.Boss)
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
            for (let r = 1; r <= 7; r++) {
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
                const f = sprites.create(gfx.fire, SpriteKind.EnemyShot)
                f.setPosition(boss.x + bossFacing * 14, boss.y - 2)
                f.vx = bossFacing * 90
                f.vy = vy
                f.setFlag(SpriteFlag.DestroyOnWall, true)
                f.setFlag(SpriteFlag.AutoDestroy, true)
            }
            sfx.play(sfx.enemyShot)
        }
        // Bild wählen: Treffer-Blitz > Angriff > Laufen
        if (now < bossFlashUntil) boss.setImage(gfx.bossHurt)
        else if (now < bossAttackUntil) boss.setImage(bossFacing > 0 ? gfx.bossAttackR : gfx.bossAttackL)
        else {
            const frames = bossFacing > 0 ? gfx.bossWalkR : gfx.bossWalkL
            boss.setImage(frames[Math.floor(now / 250) % 2])
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
        pendingLevel = 99 // Sieg
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
    for (let b = 0; b < 3; b++) {
        scene.onOverlapTile(SpriteKind.Player, gfx.tilesets[b][4], function (p, loc) {
            if (p.bottom > loc.y - 2) hurtHero()
        })
        scene.onOverlapTile(SpriteKind.Player, gfx.tilesets[b][5], function (p, loc) {
            if (levelDone) return
            levelDone = true
            pendingLevel = level + 1
        })
    }

    // ---------------------------------------------------------------- Level laden
    function loadLevel(i: number) {
        level = i
        biome = levels.biomes[i]
        levelDone = false
        clearLevelSprites()
        tiles.setCurrentTilemap(levels.tilemap(i))
        bgLayers = gfx.backgrounds[biome]
        scene.setBackgroundColor(biome == 0 ? 9 : 15)

        const sp = levels.spawns[i]
        for (let k = 0; k < sp.length; k += 3) {
            const t = sp[k], col = sp[k + 1], row = sp[k + 2]
            const loc = tiles.getTileLocation(col, row)
            if (t == S_PLAYER) {
                tiles.placeOnTile(hero, loc)
                checkpointX = hero.x
                checkpointY = hero.y
            }
            else if (t == S_COIN) spawnItem(SpriteKind.Coin, loc.x, loc.y, false)
            else if (t == S_GEM) spawnItem(SpriteKind.Gem, loc.x, loc.y, false)
            else if (t == S_HEART) spawnItem(SpriteKind.Heart, loc.x, loc.y, false)
            else if (t == S_CHEST) spawnChest(col, row, false)
            else if (t == S_CHEST_HEART) spawnChest(col, row, true)
            else if (t == S_WALKER) spawnWalker(col, row)
            else if (t == S_FLYER) spawnFlyer(col, row)
            else if (t == S_BOSS) spawnBoss(col, row)
            else if (t == S_GATE) gateCol = col
        }
        hero.vx = 0
        hero.vy = 0
        heroAnim = ""
        facing = 1
        invincibleUntil = 0

        controller.moveSprite(hero, 0, 0)
        game.splash("Welt " + (i + 1) + ": " + levels.names[i], i == 0 && doubleJumpEnabled ? "2x A = Doppelsprung" : "")
        if (i == levels.count - 1) chooseWeapon()
        controller.moveSprite(hero, runSpeed, 0)
        if (worldHandler) worldHandler(i + 1)
    }

    // Levelwechsel, Sieg und Niederlage laufen in einer eigenen Schleife,
    // damit Melodien bis zum Ende spielen dürfen.
    forever(function () {
        if (pendingLevel < 0) return
        const next = pendingLevel
        pendingLevel = -1
        controller.moveSprite(hero, 0, 0)
        hero.vx = 0
        if (next >= levels.count) {
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
        controller.moveSprite(hero, 0, 0)
        hero.vx = 0
        pause(500)
        game.setGameOverMessage(false, "Game Over")
        game.over(false)
    })

    // ---------------------------------------------------------------- Spielschleife
    game.onUpdate(function () {
        if (!hero) return
        const now = game.runtime()
        if (isOnGround(hero)) {
            lastGrounded = now
            jumpsLeft = 1
            // Kontrollpunkt merken (nur auf sicherem Boden)
            const col = Math.floor(hero.x / 16), row = Math.floor((hero.bottom - 1) / 16)
            if (now > invincibleUntil && !tileIs(col, row, tileset()[4]) && isWall(col, row + 1)
                && isWall(Math.floor((hero.left + 1) / 16), row + 1) && isWall(Math.floor((hero.right - 1) / 16), row + 1)) {
                checkpointX = hero.x
                checkpointY = hero.y
            }
        }
        // In den Abgrund gefallen
        if (hero.top > game.currentScene().tileMap.areaHeight() && !levelDone) {
            invincibleUntil = 0
            hurtHero()
            if (info.life() > 0) respawnHero()
        }
        // Blinken während Unverwundbarkeit
        hero.setFlag(SpriteFlag.Invisible, now < invincibleUntil && Math.floor(now / 80) % 2 == 0)
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
        if (hero) return
        game.setGameOverPlayable(true, sfx.winTune, false)
        game.setGameOverPlayable(false, sfx.endTune, false)
        info.setScore(0)
        info.setLife(startLives)
        createHero()
        biome = 0
        bgLayers = gfx.backgrounds[0]
        tiles.setCurrentTilemap(levels.tilemap(0))
        sfx.play(sfx.startTune)
        game.splash(title, "3 Welten - druecke A")
        loadLevel(startWorld)
    }

    //% blockId=pq_title block="setze Titel auf $text"
    //% text.defl="PIXEL-QUEST"
    //% group="Start" weight=90
    export function setTitle(text: string) { title = text }

    //% blockId=pq_start_world block="beginne in Welt $world"
    //% world.min=1 world.max=3 world.defl=1
    //% group="Start" weight=80
    export function setStartWorld(world: number) { startWorld = Math.clamp(0, levels.count - 1, world - 1) }

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
}
