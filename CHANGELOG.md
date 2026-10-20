# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Planned

- Dynamic effort counts (support models with 2–6 levels).
- Configurable warp speed/density.
- Aurora fallback when WebGL is unavailable.
- Shortcut to change effort without opening the popover.
- CI job running the Playwright harness.

## [1.0.0] - 2026-10-20

Published to npm as [`dsh-composer-effort-slider`](https://www.npmjs.com/package/dsh-composer-effort-slider).

### Added

- Composer trigger showing the current effort level, with a popover hosting the
  capsule slider.
- Effort levels read from the model's `reasoning.efforts` metadata; the control
  hides when the model declares none.
- Selection written through the shipped `modelDirectories` service, shared with
  the built-in model menu and `/model`.
- Appearance settings behind the gear: fill effect (original / audio / aurora /
  grid / warp), fill style (capsule / full), trail style (6 kinds), persisted in
  `localStorage`.
- Light and dark palettes bound through CSS variables.
- Keyboard support (arrows, Home, End), layered `Esc`, and
  `prefers-reduced-motion` handling.
- Local Playwright harness (`dev/harness.html`, `dev/drive.py`) covering
  selection, settings, keyboard, theme, and degraded cases.

### Known limitations

- Four effort levels only.
- Warp speed is fixed.
- The aurora effect needs WebGL.
