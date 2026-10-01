# Pixel-Quest

> In MakeCode Arcade nutzen: **Erweiterungen** → `https://github.com/theodorthg/pxt-pixelquest` einfügen.

Jump & Run-Engine für MakeCode Arcade: 3 Welten (Gras, SciFi, Dungeon), animierte Figuren und Gegner,
Doppelsprung, Truhen, Endboss mit Statusleiste und wählbarer Waffe. Alle Grafiken und Sounds sind mit dem
Arcade Asset Generator prozedural erzeugt.

## Blöcke (Kategorie „Pixel-Quest“)

```blocks
pixelquest.setWorld(1, tilemap`welt1`, pixelquest.Style.Grass)
pixelquest.setLives(3)
pixelquest.setDoubleJump(true)
pixelquest.onCoinCollected(function () {
})
pixelquest.startGame()
```

- **Start:** `starte Pixel-Quest`, `setze Titel auf …`, `beginne in Welt …`
- **Welten:** `Welt … Karte [Tilemap] Stil [Gras/SciFi/Dungeon]`, `Welt … Stil …` (bis zu 9 Welten)
- **Einstellungen:** Leben, maximale Leben, Laufgeschwindigkeit, Sprungkraft, Doppelsprung an/aus und Kraft,
  Schwerkraft, Gegner-Tempo, Boss-Energie
- **Ereignisse:** wenn Münze gesammelt, wenn Gegner besiegt, wenn Welt … beginnt, wenn Boss besiegt
- **Werte:** Held (Sprite), aktuelle Welt, Anzahl Welten

## Eigene Grafiken und Level (ab v0.2)

Die Engine sucht zuerst im **Projekt** (Assets-Tab) nach Grafiken mit den folgenden Namen. Fehlt ein Name,
nimmt sie ihre eingebaute Grafik. Am einfachsten startet man mit einem Pixel-Quest-Export des
[Arcade Asset Generators](https://theodorthg.github.io/arcade-asset-generator/) – dort heißen alle Assets schon richtig.

| Bereich | Typ | Namen |
|---|---|---|
| Held (schaut nach rechts) | Animation | `heroIdle`, `heroRun` |
| | Bild | `heroJump`, `heroFall` |
| Boss | Animation / Bild | `bossWalk` / `bossAttack`, `bossHurt` |
| Items & Waffen | Animation / Bild | `coinSpin` / `gem`, `heart`, `shot`, `fire`, `slash`, `chestClosed`, `chestOpen` |
| Hintergrund je Stil | Bild 160×120 | `grassSky`, `grassFar`, `grassNear` (ebenso `scifi…`, `dungeon…`) |
| Kacheln je Stil | Kachel | `grassGroundTop`, `grassGround`, `grassPlatform`, `grassSpikes`, `grassGoal`, `grassDeco` (ebenso `scifi…`, `dungeon…`) |
| Gegner Gras | Animation / Bild | `slimeWalk`, `birdFly` / `slimeDead`, `birdDead` |
| Gegner SciFi | Animation / Bild | `robotWalk`, `droneFly` / `robotDead`, `droneDead` |
| Gegner Dungeon | Animation / Bild | `skeletonWalk`, `batFly` / `skeletonDead`, `batDead` |

Gespiegelte Bilder (nach links) erzeugt die Engine selbst.

**Welten:** Eine Welt ist eine Tilemap. Reihenfolge: Block `Welt n Karte …` → Tilemap namens `weltN` →
eingebaute Welt (1–3). Wände malt man mit dem Wand-Werkzeug des Tilemap-Editors. Stacheln (`…Spikes`) verletzen,
das Ziel (`…Goal`) beendet die Welt. Der untere Kartenrand ist ein Abgrund.

**Spielobjekte** setzt man mit Markierungs-Kacheln; sie werden beim Laden durch die Objekte ersetzt:

| Kachel | Objekt | Kachel | Objekt |
|---|---|---|---|
| `pqStart` | Startpunkt des Helden | `pqChest` | Truhe (Münzen + Edelstein) |
| `pqCoin` | Münze | `pqChestHeart` | Truhe (Herz) |
| `pqGem` | Edelstein | `pqWalker` | laufender Gegner |
| `pqHeart` | Herz | `pqFlyer` | fliegender Gegner |
| `pqBoss` | Endboss (mit Waffenwahl) | `pqGate` | Spalte, die sich beim Bosskampf schließt |

## Steuerung

Pfeiltasten laufen, A springt (in der Luft nochmal = Doppelsprung), B greift an (Welt 3).

## Entwicklung

- `tools/build-assets.js` erzeugt `assets.ts` und `sounds.ts` (Seeds und Sounds im CONFIG-Block)
- `tools/build-levels.js` erzeugt `levels.ts` aus `levels/level*.txt` (Legende im Skript)
- `tools/build-game.js` erzeugt das offene Spielprojekt (alle Grafiken als Projekt-Assets, Welten als Tilemaps)
- `tools/config.js` enthält Seeds, Held und Sounds für alle Skripte
- Beide benötigen den [Arcade Asset Generator](https://github.com/theodorthg/arcade-asset-generator),
  ausgecheckt als Nachbarordner `../generator/`.

## Lizenz

MIT

> Diese Seite wird auch von MakeCode angezeigt, wenn die Erweiterung geladen ist.
