window.__ModuleLoader__.load({
  id: 'dsh-composer-effort-slider',
  factory(require) {
    'use strict';

    const React = require('react');
    const ReactDOM = require('react-dom');
    const h = React.createElement;
    const { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } = React;

    const NS = 'reasoning-effort';
    const POP_WIDTH = 332;
    const MARGIN = 10;
    /** The component emits one change per level crossing while dragging; coalesce them. */
    const COMMIT_DELAY = 120;
    const STYLE_KEY = 'dsh.reasoning-effort-slider.style';

    const ZH = {
      title: '推理等级',
      busy: '切换中…',
      error: '切换失败：{message}',
      settings: '设置',
      'setting.effect': '填充特效',
      'setting.fill': '填充样式',
      'setting.trail': '拖尾效果',
      'fill.capsule': '胶囊',
      'fill.full': '通栏',
      'trail.ripple': '涟漪',
      'trail.snowflake': '雪花',
      'trail.firefly': '萤火',
      'trail.spark': '火星',
      'trail.petal': '樱花',
      'trail.bubble': '气泡',
      'effect.original': '原页面',
      'effect.audio': '音频条',
      'effect.aurora': '极光',
      'effect.grid': '格子',
      'effect.warp': '超空间',
    };

    const EN = {
      title: 'Reasoning effort',
      busy: 'Switching…',
      error: 'Could not switch effort: {message}',
      settings: 'Settings',
      'setting.effect': 'Fill effect',
      'setting.fill': 'Fill style',
      'setting.trail': 'Trail',
      'fill.capsule': 'Capsule',
      'fill.full': 'Full',
      'trail.ripple': 'Ripple',
      'trail.snowflake': 'Snowflake',
      'trail.firefly': 'Firefly',
      'trail.spark': 'Spark',
      'trail.petal': 'Petal',
      'trail.bubble': 'Bubble',
      'effect.original': 'Original',
      'effect.audio': 'Audio',
      'effect.aurora': 'Aurora',
      'effect.grid': 'Grid',
      'effect.warp': 'Warp',
    };

    /** Option tables mirror the demo page: badge letter plus a locale key for the label. */
    const OPTIONS = {
      fill: [
        { value: 'capsule', badge: 'A', key: 'fill.capsule' },
        { value: 'full', badge: 'B', key: 'fill.full' },
      ],
      trail: [
        { value: 'ripple', badge: 'A', key: 'trail.ripple' },
        { value: 'snowflake', badge: 'B', key: 'trail.snowflake' },
        { value: 'firefly', badge: 'C', key: 'trail.firefly' },
        { value: 'spark', badge: 'D', key: 'trail.spark' },
        { value: 'petal', badge: 'E', key: 'trail.petal' },
        { value: 'bubble', badge: 'F', key: 'trail.bubble' },
      ],
      effect: [
        { value: 'original', badge: '原', key: 'effect.original' },
        { value: 'audio', badge: 'A', key: 'effect.audio' },
        { value: 'aurora', badge: 'B', key: 'effect.aurora' },
        { value: 'grid', badge: 'C', key: 'effect.grid' },
        { value: 'warp', badge: 'D', key: 'effect.warp' },
      ],
    };

    /** Max-level warp speed in px/s: the tuned "standard" value, fixed rather than user-configurable. */
    const WARP_SPEED = 150;

    const DEFAULT_STYLE = { fill: 'capsule', trail: 'ripple', effect: 'original' };

    /**
     * Read the persisted appearance choices.
     * @returns validated fill, trail, and effect ids.
     */
    function loadStyle() {
      try {
        const raw = window.localStorage.getItem(STYLE_KEY);
        if (raw === null) return { ...DEFAULT_STYLE };
        const parsed = JSON.parse(raw);
        const pick = (group, value) => (OPTIONS[group].some((option) => option.value === value) ? value : DEFAULT_STYLE[group]);
        return {
          fill: pick('fill', parsed.fill),
          trail: pick('trail', parsed.trail),
          effect: pick('effect', parsed.effect),
        };
      } catch (error) {
        void error;
        return { ...DEFAULT_STYLE };
      }
    }

    function saveStyle(style) {
      try {
        window.localStorage.setItem(STYLE_KEY, JSON.stringify(style));
      } catch (error) {
        void error;
      }
    }

    /*
     * The standalone <reasoning-effort> component is embedded verbatim below
     * (built from src/reasoning-effort.js). Its geometry is measured at runtime,
     * so it behaves the same here as on the demo page.
     */
//__COMPONENT__

    const CSS = `
.res-trigger{display:inline-flex;align-items:center;gap:3px;height:26px;padding:0 6px;margin:0;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary,#8b8b8b);font:inherit;font-size:12px;line-height:1;cursor:pointer;white-space:nowrap;}
.res-trigger:hover,.res-trigger[aria-expanded="true"]{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14));color:var(--dsw-alias-label-primary,#ededed);}
.res-trigger:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#4176e6);outline-offset:1px;}
.res-caret{font-size:8px;line-height:1;opacity:.6;}
.res-card{--res-surface:#ffffff;--res-surface-2:#f4f5f7;--res-surface-3:#eceef3;--res-text:#1b1b1f;--res-muted:#6b7076;--res-border:rgba(0,0,0,.10);position:fixed;z-index:2147483000;width:332px;max-width:calc(100vw - 20px);box-sizing:border-box;padding:10px 12px 8px;border-radius:16px;border:1px solid var(--res-border);background:var(--res-surface);color:var(--res-text);font:inherit;font-size:12px;box-shadow:var(--dsw-shadow-lv3,0 12px 32px rgba(0,0,0,.14));}
body[data-ds-dark-theme] .res-card{--res-surface:#232324;--res-surface-2:#2c2c2e;--res-surface-3:#35363a;--res-text:#f9fafb;--res-muted:#979da6;--res-border:rgba(255,255,255,.12);}
.res-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 2px 1px;min-height:26px;}
.res-head-title{font-weight:600;letter-spacing:.01em;}
.res-head-state{font-size:11px;color:var(--res-muted);margin-left:auto;}
.res-settings-btn{width:26px;height:26px;display:grid;place-items:center;border:0;border-radius:7px;background:transparent;color:var(--res-muted);cursor:pointer;padding:0;}
.res-settings-btn:hover,.res-settings-btn[aria-expanded="true"]{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14));color:var(--res-text);}
.res-settings-btn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#4176e6);outline-offset:1px;}
.res-panel{display:block;margin:0 -2px;}
.res-panel reasoning-effort{--effort-track:#e8ebf0;--effort-blue:#4176e6;--effort-blue-deep:#3560cc;--effort-blue-light:#7aaaff;--effort-bubble:#ffffff;--effort-bubble-border:rgba(0,0,0,.10);--effort-bubble-text:#1b1b1f;}
body[data-ds-dark-theme] .res-panel reasoning-effort{--effort-track:#353638;--effort-blue:#7aaaff;--effort-blue-deep:#5b83e0;--effort-blue-light:#9fc0ff;--effort-bubble:#2c2c2e;--effort-bubble-border:rgba(255,255,255,.12);--effort-bubble-text:#f9fafb;}
.res-settings{display:grid;gap:8px;margin-top:8px;padding:9px;border-radius:12px;background:var(--res-surface-2);border:1px solid var(--res-border);}
.res-setting-row{display:flex;align-items:center;justify-content:space-between;gap:10px;}
.res-setting-label{font-size:11.5px;color:var(--res-muted);white-space:nowrap;}
.res-select{position:relative;flex:1;min-width:0;max-width:180px;}
.res-select-trigger{width:100%;height:28px;display:flex;align-items:center;gap:8px;padding:0 8px;border:1px solid var(--res-border);border-radius:8px;background:var(--res-surface);color:var(--res-text);font:500 11px/1 inherit;cursor:pointer;text-align:left;}
.res-select-trigger:hover,.res-select.open .res-select-trigger{border-color:var(--dsw-alias-state-business-primary,#4176e6);}
.res-select-trigger:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#4176e6);outline-offset:1px;}
.res-select.disabled{pointer-events:none;}
.res-select.disabled .res-select-trigger{opacity:.45;cursor:not-allowed;}
.res-select-badge{flex:none;width:18px;height:18px;display:grid;place-items:center;border-radius:5px;background:var(--res-surface-3);border:1px solid var(--res-border);font:600 9px/1 inherit;}
.res-select-value{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.res-select-chevron{flex:none;font-size:8px;color:var(--res-muted);transition:transform .16s ease;}
.res-select.open .res-select-chevron{transform:rotate(180deg);}
.res-select-menu{position:absolute;left:0;right:0;bottom:calc(100% + 6px);z-index:30;padding:4px;border-radius:10px;background:var(--res-surface);border:1px solid var(--res-border);box-shadow:0 14px 34px rgba(0,0,0,.28);max-height:178px;overflow:auto;display:grid;gap:1px;}
.res-select-option{display:flex;align-items:center;gap:8px;height:28px;padding:0 7px;border:0;border-radius:6px;background:transparent;color:var(--res-text);font:500 11px/1 inherit;cursor:pointer;text-align:left;}
.res-select-option:hover,.res-select-option:focus-visible{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14));outline:none;}
.res-select-option.selected{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.10));}
.res-select-option-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.res-select-check{flex:none;font-size:10px;color:var(--dsw-alias-state-business-primary,#4176e6);}
.res-error{margin:6px 2px 0;font-size:11px;line-height:1.35;color:var(--dsw-alias-state-error-primary,#f25a5a);word-break:break-word;}
`;

    /**
     * Read the current model entry and its effort vocabulary from one directory snapshot.
     * @param state - `modelDirectories` store snapshot.
     * @returns the matched catalog entry, its efforts, and the effective effort id.
     */
    function readEfforts(state) {
      const current = state && state.current ? state.current : null;
      if (current === null) return { efforts: [], effective: undefined };
      let entry = null;
      for (const group of state.groups || []) {
        if (group.id !== current.provider) continue;
        for (const model of group.models || []) {
          if (model.id === current.model) {
            entry = model;
            break;
          }
        }
      }
      const reasoning = entry && entry.reasoning ? entry.reasoning : undefined;
      const efforts = reasoning && Array.isArray(reasoning.efforts) ? reasoning.efforts : [];
      const effective = current.reasoningEffort !== undefined
        ? current.reasoningEffort
        : reasoning
          ? reasoning.defaultEffort
          : undefined;
      return { efforts, effective };
    }

    /**
     * Host the embedded custom element and translate its `change` events into commits.
     * @param props - selected index, appearance attributes, sync version, and commit callback.
     */
    function Panel({ index, version, fillStyle, trailStyle, effectStyle, warpSpeed, ariaLabel, onChange }) {
      const ref = useRef(null);
      const commitRef = useRef(onChange);
      commitRef.current = onChange;

      useEffect(() => {
        const el = ref.current;
        if (el === null) return undefined;
        let pendingValue = null;
        let timer = 0;
        const flush = () => {
          timer = 0;
          const value = pendingValue;
          pendingValue = null;
          if (value !== null) commitRef.current(value);
        };
        const listener = (event) => {
          pendingValue = event.detail.value;
          if (timer !== 0) clearTimeout(timer);
          timer = setTimeout(flush, COMMIT_DELAY);
        };
        el.addEventListener('change', listener);
        return () => {
          el.removeEventListener('change', listener);
          if (timer !== 0) clearTimeout(timer);
          if (pendingValue !== null) commitRef.current(pendingValue);
        };
      }, []);

      useEffect(() => {
        const el = ref.current;
        if (el !== null && el.value !== index) el.setAttribute('value', String(index));
      }, [index, version]);

      return h('reasoning-effort', {
        ref,
        value: String(index),
        'fill-style': fillStyle,
        'trail-style': trailStyle,
        'effect-style': effectStyle,
        'warp-speed': String(warpSpeed),
        'aria-label': ariaLabel,
      });
    }

    /**
     * One custom select row: trigger plus an upward menu, mirroring the demo page.
     * @param props - label, current value, option table, open flag, and callbacks.
     */
    function Select({ id, label, value, options, open, disabled, onToggle, onPick, t }) {
      const current = options.find((option) => option.value === value) || options[0];
      return h('div', { className: `res-select${open ? ' open' : ''}${disabled ? ' disabled' : ''}` },
        h('button', {
          type: 'button',
          id,
          className: 'res-select-trigger',
          'aria-haspopup': 'listbox',
          'aria-expanded': open ? 'true' : 'false',
          'aria-label': label,
          'aria-disabled': disabled ? 'true' : undefined,
          disabled: disabled ? true : undefined,
          onClick: onToggle,
        },
          h('span', { className: 'res-select-badge', 'aria-hidden': 'true' }, current.badge),
          h('span', { className: 'res-select-value' }, t(current.key)),
          h('span', { className: 'res-select-chevron', 'aria-hidden': 'true' }, '\u25BE'),
        ),
        open ? h('div', { className: 'res-select-menu', role: 'listbox', 'aria-label': label },
          options.map((option) => h('button', {
            key: option.value,
            type: 'button',
            role: 'option',
            'aria-selected': option.value === value ? 'true' : 'false',
            className: `res-select-option${option.value === value ? ' selected' : ''}`,
            onClick: () => onPick(option.value),
          },
            h('span', { className: 'res-select-badge', 'aria-hidden': 'true' }, option.badge),
            h('span', { className: 'res-select-option-label' }, t(option.key)),
            h('span', { className: 'res-select-check', 'aria-hidden': 'true' }, option.value === value ? '\u2713' : ''),
          )),
        ) : null,
      );
    }

    /**
     * The settings panel behind the gear: effect, fill, and trail rows.
     * @param props - current style, open menu key, and setters.
     */
    function Settings({ style, openMenu, onMenu, onStyle, t }) {
      const rows = [
        { key: 'effect', label: t('setting.effect'), options: OPTIONS.effect, value: style.effect, id: 'res-effect' },
        { key: 'fill', label: t('setting.fill'), options: OPTIONS.fill, value: style.fill, id: 'res-fill' },
        {
          key: 'trail',
          label: t('setting.trail'),
          options: OPTIONS.trail,
          value: style.trail,
          id: 'res-trail',
          // The demo disables trail selection unless the fill effect is the original one.
          disabled: style.effect !== 'original',
        },
      ];
      return h('div', { className: 'res-settings', id: 'res-settings-panel' }, rows.map((row) => h('div', {
        key: row.key,
        className: 'res-setting-row',
      },
        h('span', { className: 'res-setting-label' }, row.label),
        h(Select, {
          id: row.id,
          label: row.label,
          value: row.value,
          options: row.options,
          open: openMenu === row.key,
          disabled: row.disabled === true,
          onToggle: () => onMenu(openMenu === row.key ? null : row.key),
          onPick: (value) => onStyle(row.key, value),
          t,
        }),
      )));
    }

    /**
     * Composer trigger plus the popover that hosts the component and its settings.
     * @param props - injected face (`store`, `load`, `select`, `available`), `sessionId`, translator.
     */
    function EffortControl(props) {
      const { available, store, load, select, t } = props;
      const subscribe = useCallback((onChange) => store.subscribe(onChange), [store]);
      const snapshot = useCallback(() => store.getSnapshot(), [store]);
      const state = useSyncExternalStore(subscribe, snapshot) || {};

      const [open, setOpen] = useState(false);
      const [settingsOpen, setSettingsOpen] = useState(false);
      const [openMenu, setOpenMenu] = useState(null);
      const [style, setStyle] = useState(loadStyle);
      const [failure, setFailure] = useState(null);
      const [syncVersion, setSyncVersion] = useState(0);
      const [position, setPosition] = useState(null);
      const triggerRef = useRef(null);
      const cardRef = useRef(null);

      const { efforts, effective } = useMemo(() => readEfforts(state), [state]);
      const index = Math.max(0, efforts.findIndex((effort) => effort.id === effective));
      const pending = state.pending || null;
      const pendingRef = useRef(null);
      pendingRef.current = pending;
      const pendingId = pending && pending.provider === state.current?.provider && pending.model === state.current?.model
        ? pending.reasoningEffort
        : undefined;
      const shownId = pendingId !== undefined ? pendingId : effective;
      const shownIndex = Math.max(0, efforts.findIndex((effort) => effort.id === shownId));
      const label = efforts[shownIndex] ? efforts[shownIndex].name : '';

      useEffect(() => {
        if (!available) return;
        try {
          load();
        } catch (error) {
          void error;
        }
      }, [available, load]);

      useEffect(() => {
        if (!open) return undefined;
        const onResize = () => setOpen(false);
        const onDown = (event) => {
          if (cardRef.current !== null && cardRef.current.contains(event.target)) return;
          if (triggerRef.current !== null && triggerRef.current.contains(event.target)) return;
          setOpen(false);
          setSettingsOpen(false);
          setOpenMenu(null);
          setFailure(null);
        };
        const onKey = (event) => {
          if (event.key !== 'Escape') return;
          if (openMenu !== null) {
            setOpenMenu(null);
            return;
          }
          if (settingsOpen) {
            setSettingsOpen(false);
            return;
          }
          setOpen(false);
          if (triggerRef.current !== null) triggerRef.current.focus();
        };
        document.addEventListener('mousedown', onDown, true);
        document.addEventListener('keydown', onKey);
        window.addEventListener('resize', onResize);
        return () => {
          document.removeEventListener('mousedown', onDown, true);
          document.removeEventListener('keydown', onKey);
          window.removeEventListener('resize', onResize);
        };
      }, [open, openMenu, settingsOpen]);

      useEffect(() => {
        if (openMenu === null) return undefined;
        const onDown = (event) => {
          const card = cardRef.current;
          if (card === null) return;
          if (card.querySelector('#res-settings-panel')?.contains(event.target)) return;
          setOpenMenu(null);
        };
        document.addEventListener('mousedown', onDown, true);
        return () => document.removeEventListener('mousedown', onDown, true);
      }, [openMenu]);

      const toggle = useCallback(() => {
        if (!available) return;
        if (open) {
          setOpen(false);
          setOpenMenu(null);
          return;
        }
        const rect = triggerRef.current === null ? null : triggerRef.current.getBoundingClientRect();
        if (rect === null) return;
        const centred = rect.left + rect.width / 2 - POP_WIDTH / 2;
        const left = Math.min(Math.max(MARGIN, centred), Math.max(MARGIN, window.innerWidth - POP_WIDTH - MARGIN));
        setPosition({ left, bottom: Math.max(MARGIN, window.innerHeight - rect.top + 8) });
        setFailure(null);
        setOpen(true);
        load();
      }, [available, load, open]);

      const applyStyle = useCallback((group, value) => {
        setStyle((previous) => {
          const next = { ...previous, [group]: value };
          saveStyle(next);
          return next;
        });
        setOpenMenu(null);
      }, []);

      const commit = useCallback((nextIndex) => {
        // One write at a time: ignore new picks while the previous selection is still in flight.
        if (pendingRef.current !== null) return;
        if (typeof select !== 'function') return;
        const effort = efforts[nextIndex];
        const current = store.getSnapshot().current;
        if (effort === undefined || !current) return;
        setFailure(null);
        Promise.resolve(select({ provider: current.provider, model: current.model, reasoningEffort: effort.id }))
          .then((result) => {
            if (result && result.ok === false) {
              const error = result.error || {};
              setFailure(t('error', { message: `${error.code || 'error'}: ${error.message || ''}` }));
              setSyncVersion((value) => value + 1);
            }
          })
          .catch((error) => {
            setFailure(t('error', { message: String((error && error.message) || error) }));
            setSyncVersion((value) => value + 1);
          });
      }, [efforts, select, store, t]);

      if (!available) return null;
      // The embedded component is built for the four DeepSeek levels; hide it elsewhere.
      if (efforts.length !== 4) return null;

      return h(React.Fragment, null,
        h('button', {
          ref: triggerRef,
          type: 'button',
          className: 'res-trigger',
          'aria-haspopup': 'dialog',
          'aria-expanded': open ? 'true' : 'false',
          'aria-label': `${t('title')}: ${label}`,
          title: `${t('title')} · ${label}`,
          onClick: toggle,
        },
          h('span', null, label),
          h('span', { className: 'res-caret', 'aria-hidden': 'true' }, '\u25BE'),
        ),
        open && position !== null ? ReactDOM.createPortal(
          h('div', {
            ref: cardRef,
            className: 'res-card',
            role: 'dialog',
            'aria-label': t('title'),
            style: { left: `${position.left}px`, bottom: `${position.bottom}px` },
          },
            h('div', { className: 'res-head' },
              h('span', { className: 'res-head-title' }, t('title')),
              pending !== null ? h('span', { className: 'res-head-state' }, t('busy')) : null,
              h('button', {
                type: 'button',
                className: 'res-settings-btn',
                'aria-label': t('settings'),
                'aria-expanded': settingsOpen ? 'true' : 'false',
                'aria-controls': 'res-settings-panel',
                onClick: () => {
                  setSettingsOpen((value) => !value);
                  setOpenMenu(null);
                },
              },
                h('svg', { width: 14, height: 14, viewBox: '0 0 20 20', fill: 'none', 'aria-hidden': 'true' },
                  h('path', { d: 'M10 6.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z', stroke: 'currentColor', strokeWidth: '1.3' }),
                  h('path', { d: 'M16.2 11.2a6.7 6.7 0 0 0 0-2.4l1.6-1.2-1.6-2.8-1.9.8a6.7 6.7 0 0 0-2.1-1.2L11.8 2h-3.6l-.4 2.4a6.7 6.7 0 0 0-2.1 1.2l-1.9-.8-1.6 2.8 1.6 1.2a6.7 6.7 0 0 0 0 2.4l-1.6 1.2 1.6 2.8 1.9-.8a6.7 6.7 0 0 0 2.1 1.2l.4 2.4h3.6l.4-2.4a6.7 6.7 0 0 0 2.1-1.2l1.9.8 1.6-2.8-1.6-1.2Z', stroke: 'currentColor', strokeWidth: '1.2', strokeLinejoin: 'round' }),
                ),
              ),
            ),
            h('div', { className: 'res-panel' }, h(Panel, {
              index: shownIndex,
              version: syncVersion,
              fillStyle: style.fill,
              trailStyle: style.trail,
              effectStyle: style.effect,
              warpSpeed: WARP_SPEED,
              ariaLabel: t('title'),
              onChange: commit,
            })),
            settingsOpen ? h(Settings, {
              style,
              openMenu,
              onMenu: setOpenMenu,
              onStyle: applyStyle,
              t,
            }) : null,
            failure === null ? null : h('div', { className: 'res-error' }, failure),
          ),
          document.body,
        ) : null,
      );
    }

    /** Required Client services: the slot registry plus the shipped model-directory and session faces. */
    const inject = ['slots', 'modelDirectories', 'sessions', 'locale'];

    /**
     * Client plugin body: register dictionaries and styles, then contribute the
     * control to the composer tool row with a per-Session model-directory face.
     * @param ctx - Client root context.
     */
    function apply(ctx) {
      ctx.effect(() => {
        const style = document.createElement('style');
        style.setAttribute('data-plugin', 'reasoning-effort-slider');
        style.textContent = CSS;
        document.head.appendChild(style);
        return () => style.remove();
      }, 'reasoning-effort-slider: styles');

      ctx.effect(() => ctx.locale.register(NS, { zh: ZH, en: EN }), 'reasoning-effort-slider: dictionaries');
      const t = ctx.locale.bind(NS);

      ctx.inject(['slots', 'modelDirectories', 'sessions'], (scope) => {
        const directories = scope.modelDirectories;
        const sessions = scope.sessions;
        const translate = (key, vars) => t(key, vars);
        const addressed = (sessionId) => {
          try {
            return typeof sessions.subagentAddress === 'function' && sessions.subagentAddress(sessionId) !== undefined;
          } catch (error) {
            void error;
            return false;
          }
        };

        function HostedControl(props) {
          const sessionId = props.sessionId;
          const injected = props.store !== undefined;
          const directory = useMemo(() => {
            if (sessionId === undefined) return null;
            try {
              return directories.directoryFor(sessionId);
            } catch (error) {
              void error;
              return null;
            }
          }, [sessionId]);
          if (injected) {
            return h(EffortControl, {
              available: props.available,
              store: props.store,
              load: props.load || (() => {}),
              select: props.select,
              t: props.t || translate,
            });
          }
          if (directory === null) return null;
          return h(EffortControl, {
            available: !addressed(sessionId),
            store: directory.store,
            load: () => {
              try {
                directory.load().catch(() => {});
              } catch (error) {
                void error;
              }
            },
            select: (selection) => directory.select(selection),
            t: translate,
          });
        }

        scope.slots.inject('conversation.input.left', () => scope.slots.register({
          name: 'conversation.input.left',
          id: 'reasoning-effort-slider',
          order: 30,
          inject: (sessionId) => {
            const directory = directories.directoryFor(sessionId);
            return {
              available: !addressed(sessionId),
              store: directory.store,
              load: () => {
                directory.load().catch(() => {});
              },
              select: (selection) => directory.select(selection),
              t: translate,
            };
          },
        }, HostedControl));
      });
    }

    return { inject, apply };
  },
});
