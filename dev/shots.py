"""Capture one screenshot per fill effect for the README gallery."""

from __future__ import annotations

import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
HARNESS = ROOT / "harness.html"
DOCS = ROOT.parent / "docs"
EFFECTS = ["original", "audio", "aurora", "grid", "warp"]


def main() -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=["--enable-unsafe-swiftshader"])
        page = browser.new_page(viewport={"width": 900, "height": 420}, device_scale_factor=2)
        page.goto(HARNESS.as_uri())
        page.wait_for_load_state("networkidle")
        page.locator(".res-trigger").click()
        page.locator("reasoning-effort").wait_for()
        page.evaluate(
            "() => window.__harness.emit({ current: { provider: 'deepseek-official', model: 'deepseek-flash', reasoningEffort: 'max' } })"
        )
        page.wait_for_timeout(600)

        report = {}
        for effect in EFFECTS:
            page.evaluate(
                "(value) => document.querySelector('reasoning-effort').setAttribute('effect-style', value)",
                effect,
            )
            page.wait_for_timeout(900)
            report[effect] = page.evaluate(
                "() => { const el = document.querySelector('reasoning-effort'); return { auroraOk: el._aurora ? el._aurora.ok : null, warp: el._warp.length }; }"
            )
            box = page.locator("reasoning-effort").bounding_box()
            assert box is not None
            page.screenshot(
                path=str(DOCS / f"effect-{effect}.png"),
                clip={
                    "x": box["x"] - 6,
                    "y": box["y"] - 6,
                    "width": box["width"] + 12,
                    "height": box["height"] + 12,
                },
            )
        print(json.dumps(report, indent=2))
        browser.close()


if __name__ == "__main__":
    main()
