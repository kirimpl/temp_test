# VAYRHEX / Visual Asset Register — 0.10

## Asset provenance

| Files | Source | Rights |
| --- | --- | --- |
| `assets/ui/panel-frame.png`, `panel-tab.png`, `button-primary.png`, `button-secondary.png`, `target.png`, `rail.png` | **Kenney UI Pack – Sci-fi**, files mirrored at [shorepine/kenney](https://github.com/shorepine/kenney/tree/main/ui/UI%20Pack%20-%20Sci-fi), published by Kenney on [kenney.nl](https://kenney.nl/assets/ui-pack-sci-fi) | **CC0 1.0**. Commercial use permitted, no attribution required. Source mirror retains Kenney attribution. |
| `assets/art/hero-scene.svg` | Original SVG illustration created expressly for VAYRHEX during this project | No third-party source asset; keep editable SVG |
| `assets/art/tower-{pulse,ember,frost,arc,rail}.svg` | Original SVG mechanical turret drawings created expressly for VAYRHEX | No third-party source asset; keep editable SVG |
| `visual-v10.js`, `ui-v10.css` | Original renderer and UI styling built on these assets | Maintain game code separately from graphical files |

Official CC0 license: https://creativecommons.org/publicdomain/zero/1.0/

**Kenney and its logo are not part of the VAYRHEX brand.** We credit the source here for traceability.

## Release notes
- UI v0.10 uses the PNG assets in CSS as static skins for buttons and defensive panels.
- Original illustrated main-menu scene, designed to match the updated top-down battlefield.
- Original turret SVG drawings appear in tower selection and are rendered as browser `Image` objects by `visual-v10.js`.
- Sprite loading is asynchronous with safe vector fallback in the battlefield.
- Research data, waves, economy, settings, advertisements demo, progression and localStorage keys remain unchanged.
- `visual-v10.js` deliberately replaces `VayrhexArt.draw` without changing the underlying combat simulation.
- PNG backgrounds are decorative; gameplay controls must remain usable if images fail to load.

## Not yet included
- Full character animation sheets, varied environments and designed music. These require dedicated asset-production passes.
- Final brand trademark clearance, privacy policy, or production Yandex Games SDK.

Keep CC0 license records for every additional asset used in subsequent passes.
