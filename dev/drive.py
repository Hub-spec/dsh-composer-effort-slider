"""Drive the local harness page and report what the embedded component actually renders/does."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
HARNESS = ROOT / "harness.html"


def main() -> int:
    errors: list[str] = []
    console: list[str] = []
    result: dict[str, object] = {}

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 900, "height": 420}, device_scale_factor=2)
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("console", lambda message: console.append(f"{message.type}: {message.text}"))
        page.goto(HARNESS.as_uri())
        page.wait_for_load_state("networkidle")

        trigger = page.locator(".res-trigger")
        trigger.wait_for(timeout=5000)
        result["trigger_text"] = trigger.inner_text()
        result["component_defined"] = page.evaluate(
            "() => Boolean(window.customElements.get('reasoning-effort'))"
        )
        page.screenshot(path=str(ROOT / "shot-1-trigger.png"))

        trigger.click()
        page.locator("reasoning-effort").wait_for(timeout=5000)
        page.wait_for_timeout(500)
        result["card_title"] = page.locator(".res-head-title").inner_text()
        result["bubble"] = page.locator("reasoning-effort .bubble").inner_text()
        result["dots"] = page.locator("reasoning-effort .dots i").count()
        result["shadow_track"] = page.evaluate(
            "() => { const el = document.querySelector('reasoning-effort'); const t = el.shadowRoot.querySelector('.track'); return t ? { w: t.clientWidth, h: t.clientHeight } : null; }"
        )
        result["value_attr"] = page.evaluate("() => document.querySelector('reasoning-effort').getAttribute('value')")
        page.screenshot(path=str(ROOT / "shot-2-popover.png"))

        page.wait_for_timeout(600)
        result["canvas_painted"] = page.evaluate(
            """() => {
              const host = document.querySelector('reasoning-effort');
              const canvas = host && host.shadowRoot.querySelector('canvas');
              if (!canvas) return null;
              const ctx = canvas.getContext('2d');
              const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
              let painted = 0;
              for (let i = 3; i < data.length; i += 4) if (data[i] > 0) painted += 1;
              return { width: canvas.width, height: canvas.height, painted };
            }"""
        )
        page.screenshot(path=str(ROOT / "shot-2b-particles.png"))

        box = page.locator("reasoning-effort .track").bounding_box()
        assert box is not None, "track box missing"
        page.mouse.move(box["x"] + box["width"] * 0.5, box["y"] + box["height"] / 2)
        page.mouse.down()
        page.mouse.move(box["x"] + box["width"] - 10, box["y"] + box["height"] / 2, steps=10)
        page.mouse.up()
        page.wait_for_timeout(500)

        result["selects"] = page.evaluate("() => window.__harness.selects")
        result["snapshot"] = page.evaluate(
            "() => { const s = window.__harness.snapshot(); return { effort: s.current && s.current.reasoningEffort, pending: s.pending }; }"
        )
        result["trigger_after"] = trigger.inner_text()
        result["bubble_after"] = page.locator("reasoning-effort .bubble").inner_text()
        page.screenshot(path=str(ROOT / "shot-3-after-drag.png"))

        page.keyboard.press("Escape")
        page.wait_for_timeout(200)
        result["card_after_escape"] = page.locator(".res-card").count()

        # Light theme.
        page.evaluate("() => document.body.removeAttribute('data-ds-dark-theme')")
        trigger.click()
        page.locator(".res-card").wait_for(timeout=5000)
        page.wait_for_timeout(300)
        page.screenshot(path=str(ROOT / "shot-4-light.png"))
        page.keyboard.press("Escape")
        page.wait_for_timeout(150)

        # Settings panel: gear -> three custom selects -> component attributes.
        page.evaluate("() => document.body.setAttribute('data-ds-dark-theme', '')")
        trigger.click()
        page.locator(".res-card").wait_for(timeout=5000)
        page.locator(".res-settings-btn").click()
        page.locator(".res-settings").wait_for(timeout=5000)
        result["settings_rows"] = page.locator(".res-setting-row").count()
        result["settings_labels"] = page.locator(".res-setting-label").all_inner_texts()
        page.screenshot(path=str(ROOT / "shot-5-settings.png"))

        page.locator("#res-fill").click()
        page.locator(".res-select.open .res-select-option", has_text="通栏").click()
        page.wait_for_timeout(120)
        result["trail_enabled_original"] = not page.locator("#res-trail").is_disabled()

        # A non-original fill effect disables the trail row, exactly like the demo page.
        page.locator("#res-effect").click()
        page.locator(".res-select.open .res-select-option", has_text="音频条").click()
        page.wait_for_timeout(150)
        result["trail_disabled_for_audio"] = page.locator("#res-trail").is_disabled()
        result["trail_menu_blocked"] = page.evaluate(
            "() => { document.getElementById('res-trail').click(); return document.querySelectorAll('.res-select-menu').length; }"
        )

        # Back to the original effect: the trail row becomes usable again.
        page.locator("#res-effect").click()
        page.locator(".res-select.open .res-select-option", has_text="原页面").click()
        page.wait_for_timeout(120)
        result["trail_enabled_after_original"] = not page.locator("#res-trail").is_disabled()

        page.locator("#res-trail").click()
        page.locator(".res-select.open .res-select-option", has_text="雪花").click()
        page.wait_for_timeout(120)
        page.locator("#res-effect").click()
        page.locator(".res-select.open .res-select-option", has_text="音频条").click()
        page.wait_for_timeout(250)
        result["appearance_attrs"] = page.evaluate(
            """() => { const el = document.querySelector('reasoning-effort'); return {
              fill: el.getAttribute('fill-style'),
              trail: el.getAttribute('trail-style'),
              effect: el.getAttribute('effect-style'),
            }; }"""
        )
        result["style_storage"] = page.evaluate(
            """() => { try { return window.localStorage.getItem('dsh.reasoning-effort-slider.style'); } catch (error) { return 'unavailable'; } }"""
        )
        page.screenshot(path=str(ROOT / "shot-6-settings-applied.png"))

        page.keyboard.press("Escape")
        page.wait_for_timeout(120)
        result["settings_after_escape"] = page.locator(".res-settings").count()
        page.keyboard.press("Escape")
        page.wait_for_timeout(120)
        result["card_after_two_escapes"] = page.locator(".res-card").count()

        # A three-level model hides the control (the component is four-level).
        page.evaluate(
            """() => {
              const efforts = [
                { id: 'off', name: 'Off' },
                { id: 'high', name: 'High' },
                { id: 'max', name: 'Max' },
              ];
              window.__harness.emit({
                current: { provider: 'deepseek-official', model: 'deepseek-flash', reasoningEffort: 'high' },
                groups: [{ id: 'deepseek-official', name: 'DeepSeek', models: [{ id: 'deepseek-flash', name: 'deepseek-flash', reasoning: { defaultEffort: 'high', efforts } }] }],
              });
            }"""
        )
        page.wait_for_timeout(150)
        result["trigger_three_levels"] = page.locator(".res-trigger").count()

        # No reasoning metadata at all.
        page.evaluate(
            """() => window.__harness.emit({
              groups: [{ id: 'deepseek-official', name: 'DeepSeek', models: [{ id: 'deepseek-flash', name: 'deepseek-flash' }] }],
            })"""
        )
        page.wait_for_timeout(150)
        result["trigger_without_reasoning"] = page.locator(".res-trigger").count()

        result["errors"] = errors
        result["console"] = [line for line in console if not line.startswith("debug:")]
        browser.close()

    (ROOT / "report.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    summary = {
        key: result.get(key)
        for key in (
            "trigger_text",
            "component_defined",
            "bubble",
            "dots",
            "shadow_track",
            "canvas_painted",
            "selects",
            "trigger_after",
            "bubble_after",
            "card_after_escape",
            "trigger_three_levels",
            "trigger_without_reasoning",
            "errors",
        )
    }
    print(json.dumps(summary, ensure_ascii=True, indent=2))
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
