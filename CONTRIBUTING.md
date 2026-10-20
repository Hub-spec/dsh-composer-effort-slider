# Contributing

Thanks for taking a look. This is a small plugin, so the workflow is intentionally
light.

## Setup

- Node.js 20+ for the build script.
- Python 3 with Playwright for the local harness:

```bash
npm install --prefix dev react@18.2.0 react-dom@18.2.0
python -m playwright install chromium
```

## Build and test

```bash
node dev/build.mjs     # src/wrapper.js + src/reasoning-effort.js -> client.js
python dev/drive.py    # renders client.js against a fake model directory
```

`dev/drive.py` asserts selection write-back, the four level dots, appearance
settings, the trail-disabled rule, layered `Esc`, and the 3-level / no-reasoning
degradations. It also writes `dev/report.json` and screenshots, both gitignored.

## Ground rules

- **`client.js` is generated.** Edit `src/*.js` and rebuild; do not hand-edit the
  bundle.
- **`src/reasoning-effort.js` is the component.** Keep its behaviour identical to
  the standalone demo unless the change is the point of the PR; the wrapper must
  not reach into its internals.
- **Selection writes are coalesced.** The component emits a `change` per level
  crossing; the wrapper debounces and ignores writes while one is in flight.
  Keep that invariant.
- **No new Host logic** unless justified: the Host half is an empty `apply()` on
  purpose.
- **Accessibility is part of the feature.** If you add a control, wire its
  `aria-*`, focus behaviour, and `Esc` order.

## Pull requests

1. Update `CHANGELOG.md` under `[Unreleased]`.
2. Run the build and the harness; paste the result in the PR.
3. Describe the user-visible change and any compatibility risk with the DSH
   client services this plugin depends on.

## Compatibility notes

The plugin uses `modelDirectories`, `sessions`, `slots`, and `locale` from the
shipped client packages. These are internal contracts rather than a public plugin
API; when a Harness upgrade changes the model-directory snapshot shape, the
wrapper needs a follow-up. Please mention the tested Harness version in the PR.
