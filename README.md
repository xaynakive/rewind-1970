# Rewind 1970

> a haunted journal. your memories become VHS tapes hidden around a dark house, and you have to find and rewind them before they decay.

A Kiroween entry (Costume Contest), and a strange room inside [Elsewhere](https://xaynakive.com).

The tape opens on a date that shouldn't exist: **October 31, 1970, 00:00**, years before VHS was invented. Press play and you're inside the house. Write a memory into the VCR and it becomes a tape, hidden somewhere you'll have to go looking for it. Tapes you neglect slowly decay. Rewinding them on the living-room TV brings them back.

Spooky, never gore. Your memories never leave your device.

## Status: milestone 2

Working now:
- Cold open: a found-tape boot screen in a pixel VCR font, with tracking lines, colour bleed and grain.
- The living room in a low-poly PS1 style: wobbling vertices, a 320×240 render, dithering, fog, a flickering CRT and candle-lit pumpkins.
- A storm outside: lightning through the window and synthesized thunder, rain and tape hiss.
- Recording tapes at the VCR. Each tape is stored in IndexedDB and hidden at one of 10 spots, with a quiet hint about where it went.
- **Finding tapes.** Cassettes sit in piles at their hiding spots. Their spine labels yellow and then bleed red as they decay, so you can see which ones need you.
- **Decay.** A neglected tape plays back damaged: colours bleed, static rises, the tracking jitters, and up to 1 in 5 words drift out of place. The memory itself is never changed.
- **Rewinding.** Carry a tape to the TV and hold for 2 seconds (mouse, touch or keyboard). It plays back clean and returns to the top of its pile.
- Settings: reduce flashing, sound, demo time (one minute counts as one day, to watch decay happen), a text-only reader for every tape, export to JSON, erase all.

For now only the living room exists, so only tapes hidden in the TV cabinet can be found. Tapes hidden elsewhere will appear when their rooms are built.

Next: the rest of the house, the pond, and the endings. See `.kiro/specs/*/tasks.md`.

## Run locally

ES modules don't load from `file://`, so serve the folder:

```bash
git clone https://github.com/xaynakive/rewind-1970.git
cd rewind-1970
npm run serve        # python3 -m http.server 8000
# open http://localhost:8000
```

Run the unit tests (Node 20+, nothing to install):

```bash
npm test
```

## Built with

- Plain JavaScript modules: no framework, no build step, no dependencies
- Raw WebGL 1: a PS1 scene pass and a VHS post-processing pass
- A hand-drawn 5×7 bitmap font for the on-screen display
- Web Audio, with every sound synthesized
- IndexedDB, on-device only

## How it was built with Kiro

This project is spec-first. Everything in `.kiro/` is part of the entry:

- **`.kiro/steering/`**: the rules every change follows. `product.md` covers tone ("suggestion over shock", decay never deletes a memory). `art-style.md` covers the PS1 rendering rules, triangle budgets, the 9-colour palette and flashing limits. `tech.md` covers the stack and conventions, including the decision record for raw WebGL. `structure.md` covers the layout.
- **`.kiro/specs/`**: one spec per system (cold open, tapes, decay, house, pond, endings). Each has requirements written as acceptance criteria, a design, and a task list that is ticked off as the code lands.
- Pure logic named in the specs (decay curve, tape placement, lightning timing, boot lines) is covered by unit tests in `tests/`, which check the acceptance criteria directly.

## Accessibility

- **Reduce flashing** replaces lightning flashes and glitches with slow fades no brighter than 50%. It is on by default when the system prefers reduced motion.
- Every object you can select is a real button: it works with a mouse, touch, the keyboard, and screen readers.
- The boot text is announced to screen readers. The text-only reader shows every memory without visual effects.

## License

[MIT](LICENSE) © 2026 xaynakive
