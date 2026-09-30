# Pixel-Quest

Jump & Run-Engine für MakeCode Arcade: 3 Welten (Gras, SciFi, Dungeon), animierte Figuren und Gegner,
Doppelsprung, Truhen, Endboss mit Statusleiste und wählbarer Waffe. Alle Grafiken und Sounds sind mit dem
Arcade Asset Generator prozedural erzeugt.

## Blöcke (Kategorie „Pixel-Quest“)

```blocks
pixelquest.setLives(3)
pixelquest.setJumpPower(175)
pixelquest.setDoubleJump(true)
pixelquest.onCoinCollected(function () {
})
pixelquest.startGame()
```

- **Start:** `starte Pixel-Quest`, `setze Titel auf …`, `beginne in Welt …`
- **Einstellungen:** Leben, maximale Leben, Laufgeschwindigkeit, Sprungkraft, Doppelsprung an/aus und Kraft,
  Schwerkraft, Gegner-Tempo, Boss-Energie
- **Ereignisse:** wenn Münze gesammelt, wenn Gegner besiegt, wenn Welt … beginnt, wenn Boss besiegt
- **Werte:** Held (Sprite), aktuelle Welt

Einstellungs-Blöcke vor `starte Pixel-Quest` setzen.

## Steuerung

Pfeiltasten laufen, A springt (in der Luft nochmal = Doppelsprung), B greift an (Welt 3).

## Entwicklung

- `tools/build-assets.js` erzeugt `assets.ts` und `sounds.ts` (Seeds und Sounds im CONFIG-Block)
- `tools/build-levels.js` erzeugt `levels.ts` aus `levels/level*.txt` (Legende im Skript)
- Beide benötigen den Generator unter `../generator/`.

> Diese Seite wird auch von MakeCode angezeigt, wenn die Erweiterung geladen ist.
