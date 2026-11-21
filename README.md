# Rewind 1970

> a haunted journal. your memories become VHS tapes hidden around a dark house, and you have to find and rewind them before they decay.

**▶ [Play it in your browser](https://xaynakive.github.io/rewind-1970/)**: no install, works on desktop and phone. Turn the sound on.

A Kiroween entry (Costume Contest), and a strange room inside [Elsewhere](https://xaynakive.com). How it was built with Kiro: [docs/writeup.md](docs/writeup.md).

The tape opens on a date that shouldn't exist: **October 31, 1970, 00:00**, years before VHS was invented. Press play and you're inside the house. Write a memory into the VCR and it becomes a tape, hidden somewhere you'll have to go looking for it. Tapes you neglect slowly decay. Rewinding them on the living-room TV brings them back.

Spooky, never gore. Your memories never leave your device.

## Status

Working now:
- Cold open: a found-tape boot screen in a pixel VCR font, with tracking lines, colour bleed and grain.
- **The whole house**, in a low-poly PS1 style (wobbling vertices, a low-res 288-line picture, dithering, fog), filling the whole tab with glow, colour grading and scanlines:
  - the front yard in the rain: the gate, a mailbox with its flag up, three graves, a dead tree, the pond and a blood moon
  - the hallway, with an attic hatch hanging open and stairs going up
  - the living room, with the TV, the VCR and a flickering CRT glow
  - the messy room, with a heap of candle-lit pumpkins and a chair turned to face the corner
  - the bedroom upstairs, with dark space under the bed and a wardrobe hanging open
- **Moving around.** Exit arrows (or W/A/S/D and the arrow keys) move you between viewpoints. Inside a room the camera glides; between rooms the tape skips.
- A storm outside: falling rain, lightning, and synthesized thunder, rain and tape hiss. The rain gets quieter when you go inside.
- Recording tapes at the VCR. Each tape is stored in IndexedDB and hidden at one of 10 spots, with a quiet hint about where it went.
- **Finding tapes.** Cassettes sit in piles at their hiding spots. Their spine labels yellow and then bleed red as they decay, so you can see which ones need you.
- **Decay.** A neglected tape plays back damaged: colours bleed, static rises, the tracking jitters, and up to 1 in 5 words drift out of place. The memory itself is never changed.
- **Rewinding.** Carry a tape to the TV and hold for 2 seconds (mouse, touch or keyboard). It plays back clean and returns to the top of its pile.
- Settings: reduce flashing, sound, demo time (one minute counts as one day, to watch decay happen), a text-only reader for every tape, export to JSON, erase all.

All 10 hiding spots can be reached. Carry a tape from anywhere in the house to the living-room TV to rewind it.

- **The pond.** Touch the still water and ripples spread through the moon's reflection. Tapes hidden in the pond float up while you watch. And sometimes, when lightning strikes or the ripples settle, you see what's lying beneath the surface.

- **The endings.** Once you have at least 5 tapes and have found every one, something appears in the VCR, at first only when the sky lights up. Play it. It's a tape you never recorded, made from your own memories, and which of four endings it becomes depends on how well you kept them.

- **Whose house is this?** Someone lived here before you. Five of her tapes, dated Oct 31 1970, are hidden around the house. The first waits in the mailbox; the others show up when you watch the lightning, notice what's in the pond, rewind your own memories, and find the rest. Rewind each one to hear the end of it, then answer the house at the TV (or from settings). Solve it with your own tapes in fair shape and the final tape becomes a fifth ending.

- **Step inside her tapes.** Rewind the mailbox tape and you can step through the TV into Edith's memory of **the night market**, Oct 30 1970: a covered hall of tiny stalls, tables in the aisle, paper lanterns. Walk it in first person, open drawers, tins and cabinets, pick things up and turn them over in a showroom-style close-up, and read the notes she left herself. Her twin sister June walks ahead of you. After a while something else walks the aisles too. Hide behind a curtain, in the photo booth or under a table; if it reaches you, the tape just skips back. **Story mode** turns the chase off.
- **The school at night.** Rewind the grave tape and step into March 14 1962: a corridor of lockers with lightning in the windows, the twins' classroom, the music room and the girls' bathroom. Find the notes in their desks, the class register and the piano, take the caretaker's keys from June's locker, and open the chained door to the stairs where June is waiting. Someone with a lamp walks the corridor; hide in a locker and watch through the vents, or in a bathroom stall.
  - Desktop: click to look, W A S D or arrows to walk, E to use, L for the flashlight, Shift to sneak, Tab for notes, Esc to pause. Touch: drag left to walk, drag right to look, tap **use**.

## Haewol (in progress)

**▶ [Play Haewol](https://xaynakive.github.io/rewind-1970/haewol/)**: a second game in this repo, from a new design. You are an urban explorer who finds a camcorder and a tape labelled 10·31·1970 in a ruined house. Press play and you are in the village of Haewol on the night of the typhoon, from 23:58 to midnight, and the night keeps repeating. If the Caller catches you, or midnight comes, the tape rewinds and you start again in the entry house. Everything you've found stays with you.

Working now (milestone 1 of 8):
- The cold open, the entry house (always safe), and the courtyard with its well, family shrine and red festival lanterns in the typhoon rain.
- The water rises with the clock. Late in the night you cross on stepping stones; walking in the water is slow and loud.
- The camcorder: hold C or the right mouse button (the lens button on touch). The viewfinder shows Sae's wet footprints on the safe stones, writing on the shrine, and Sae herself. It drains a battery, and the red tally light lets the Caller see you from farther away. The candle (L) has the same cost.
- The Caller: a figure in red with wet hair over her face. When she's close the rain goes quiet and a cassette rewinds. Story mode turns the chase off.
- The house calls you Sae. Answer or stay quiet. She finds you faster if you keep answering.
- The first of seven memories, a paper boat, which plays a flashback of the real night. The TV in the entry house shows one more line of the tape each loop.

Plan: `.kiro/specs/haewol/tasks.md`.

Next for the house game: polish (sound, small things that change when you're not looking) and the write-up. See `.kiro/specs/*/tasks.md`.

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
- **`.kiro/specs/`**: one spec per system (cold open, tapes, decay, house, pond, endings, mystery, memories). Each has requirements written as acceptance criteria, a design, and a task list that is ticked off as the code lands.
- Pure logic named in the specs (decay curve, tape placement, lightning timing, boot lines, the case) is covered by unit tests in `tests/`, which check the acceptance criteria directly. `tests/properties.test.js` adds property-based tests: the spec rules (decay never passes 0.85, drift never changes a word, the boot screen always fits) checked over hundreds of generated inputs, with a small seeded helper instead of a library.
- **`.kiro/hooks/`**: agent hooks. Tests run when the agent saves a source file, a spec-sync check runs when a system changes, and the agent can't finish a turn while a module fails to parse or a test fails.
- The full story of how Kiro was used is in [docs/writeup.md](docs/writeup.md).

## Accessibility

- **Brightness** slider and **clear picture** in settings, for low vision. The default picture is bright, and both turn up automatically when the system asks for more contrast.
- **Full screen** button, or press F.

- **Reduce flashing** replaces lightning flashes and glitches with slow fades no brighter than 50%. It is on by default when the system prefers reduced motion.
- Every object you can select is a real button: it works with a mouse, touch, the keyboard, and screen readers.
- The boot text is announced to screen readers. The text-only reader shows every memory without visual effects.

## License

[MIT](LICENSE) © 2026 xaynakive
