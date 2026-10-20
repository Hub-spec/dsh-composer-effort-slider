# Reasoning Effort Slider for DeepSeek Harness

A compact reasoning-effort control in the DeepSeek Harness composer. Click the
effort label in the composer tool row, drag the capsule, and the change applies
to the next request.

![Dark](docs/dark.png)
![Settings](docs/settings.png)

The same popover in the light palette:

![Light](docs/light.png)

The warp (超空间) fill effect:

![Warp](docs/warp.png)

English | [中文](#中文说明)

## Features

- **One-click effort** — the current level (`Off / Low / High / Max`) sits in the composer tool row; the popover hosts the full capsule slider with the level bubble and in-track particles.
- **Reads the real effort list** — levels come from the model's `reasoning.efforts` metadata, not a hardcoded list; a model without reasoning metadata hides the control.
- **Same write path as the shipped model menu** — reads and writes the current Session's `ModelSelection` through `modelDirectories`, so the composer menu, our slider, and `/model` always agree.
- **Appearance settings** — fill effect (original / audio / aurora / grid / warp), fill style (capsule / full), trail style (ripple / snowflake / firefly / spark / petal / bubble). Choices persist in `localStorage`.
- **Theme-adaptive** — the popover uses the Harness palette for both light and dark; the component's colours are bound through CSS variables.
- **Accessible** — dialog + slider semantics, arrow keys / Home / End, `Esc` closes menu → settings → popover in that order, `prefers-reduced-motion` respected.

## Install

The plugin is a DSH bundle. For a local checkout:

```bash
dsh plugin --profile desktop add link:/absolute/path/to/dsh-composer-effort-slider
```

or, from a profile with the plugin manager UI, install this directory (the package root).

Restart the app (or reload the page) after installing.

## Usage

1. In a Session, click the effort label in the composer tool row.
2. Drag or use arrow keys; the selection is written once you stop (it is coalesced over 120 ms).
3. The gear opens appearance settings. Trail style is disabled unless the fill effect is **original**, matching the standalone component.

The change applies to the **next** request; a step already running keeps the effort it started with.

## Compatibility

- Tested against DeepSeek Harness `0.2.1-rc.2` (desktop profile).
- Uses the shipped Client services `modelDirectories`, `sessions`, `slots`, and `locale`. These are internal package contracts, not a public plugin API; a Harness upgrade may require a follow-up change.
- The embedded component is built for DeepSeek's four effort levels. A model advertising a different count hides the control instead of rendering a mismatched slider.

## Development

```text
src/wrapper.js            # React wrapper: trigger, popover, settings, directory glue
src/reasoning-effort.js   # the <reasoning-effort> component (embedded verbatim)
client.js                 # build output: wrapper + component in one client module
index.js                  # empty Host half
cordis.patch.yml          # bundle patch
locale/{en,zh}.json       # display metadata
icon.svg                  # plugin icon
docs/                     # README screenshots
dev/                      # build script + local Playwright harness
```

Build the client module after editing either source:

```bash
node dev/build.mjs
```

`dev/harness.html` + `dev/drive.py` are a local Playwright harness that renders the
plugin against a fake model directory and asserts selection, settings, keyboard,
theme, and degraded cases. Requires Python Playwright and `dev/node_modules/react`
(`npm install --prefix dev react@18.2.0 react-dom@18.2.0`).

`src/reasoning-effort.js` is the component source for this plugin. It started as a copy
of the standalone demo component, with its bubble colours turned into CSS variables and
the `warp` effect reworked. This repository is self-contained: it does not depend on the
demo project.

## Known limitations

- Four effort levels only (component constraint).
- The warp (超空间) effect runs at a fixed speed; it is not user-configurable.
- The aurora effect needs WebGL; without it the track renders empty (the component's own fallback).

## License

MIT. See [LICENSE](LICENSE).

---

## 中文说明

把推理等级做成输入框里的一个滑杆：点开即拖，松手写回当前会话。

- 档位来自模型元数据（`reasoning.efforts`），不是写死的；模型不支持推理等级时隐藏。
- 读写走官方 `modelDirectories`，和自带模型菜单、`/model` 保持同步。
- 齿轮里有填充特效 / 填充样式 / 拖尾效果，选择会记住；拖尾只在「原页面」特效下可选。
- 亮/暗主题都跟随宿主；键盘（←→/Home/End）与 `prefers-reduced-motion` 都有处理。
- 改动对**下一个请求**生效。

安装（本地目录）：

```bash
dsh plugin --profile desktop add link:<本仓库根目录>
```

源码在 `src/`，改完执行 `node dev/build.mjs` 重新生成 `client.js`。

已知限制：只支持四档；超空间速度为固定值；极光特效需要 WebGL。

MIT 协议，见 [LICENSE](LICENSE)。
