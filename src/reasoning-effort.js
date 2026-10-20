/* ============================================================================
 * <reasoning-effort> — GPT 风格的紧凑推理档位滑杆（DeepSeek 四档）
 *
 * 用法：
 *   <reasoning-effort value="2"></reasoning-effort>
 *
 * 属性：value（0–3，默认 2）
 *       fill-style（capsule | full，默认 capsule）
 *       trail-style（ripple | snowflake | firefly | spark | petal | bubble，默认 ripple）
 *       effect-style（original | audio | aurora | grid | warp，默认 original）
 *       warp-speed（超空间 Max 档速度，px/s，默认 1200）
 * 事件：change → detail { value, level, levels, label }
 * 键盘：← → ↑ ↓ / Home / End
 * 扩展：气泡颜色可用 --effort-bubble / --effort-bubble-border / --effort-bubble-text 覆盖
 *
 * 视觉参考：ChatGPT 2026-08 的 Reasoning Effort Slider
 * 形态：胶囊轨道 + 左侧蓝色填充 + 4 个档位点 + 白色圆形滑块
 * 粒子：仅存在于轨道内部，细密微光，密度随档位上升
 * ==========================================================================*/
(() => {
  'use strict';
  if (window.customElements.get('reasoning-effort')) return;

  const LEVELS = [
    { label: 'Off',  desc: '直接回答' },
    { label: 'Low',  desc: '轻量推理' },
    { label: 'High', desc: '深入推理' },
    { label: 'Max',  desc: '最大推理' },
  ];
  const N = LEVELS.length;

  const WAKE_SCALE = 1.7;

  const TRAIL_STYLES = [
    { id: 'ripple', label: 'Ripple', cn: '涟漪', shape: 'glow', colors: ['#dff5ff', '#a5e8ff', '#7dd3fc', '#ffffff'], ring: '#bae6fd', ringScale: 1, count: [8, 11], speed: [26, 60], gravity: 30, drag: 1.4, life: [.22, .38], size: [1.2, 2.0], spin: [-80, 80], grow: [1.15, .55], squashX: 1.35, squashY: .45, rise: 0 },
    { id: 'snowflake', label: 'Snowflake', cn: '雪花', shape: 'snow', colors: ['#e0f2fe', '#ffffff', '#bae6fd', '#cffafe'], ring: null, ringScale: 1, count: [7, 10], speed: [14, 32], gravity: 14, drag: .9, life: [.4, .62], size: [1.0, 1.7], spin: [-180, 180], grow: [1.0, .8], squashX: 1, squashY: 1, rise: 0 },
    { id: 'firefly', label: 'Firefly', cn: '萤火', shape: 'orb', colors: ['#fff4b8', '#ffe066', '#ffd166', '#fffae0'], ring: null, ringScale: 1, count: [6, 9], speed: [10, 24], gravity: -8, drag: 1.6, life: [.3, .5], size: [1.1, 1.9], spin: [-60, 60], grow: [.8, 1.15], squashX: 1, squashY: 1, rise: .2 },
    { id: 'spark', label: 'Spark', cn: '火星', shape: 'flare', colors: ['#ff8c42', '#ffb56b', '#ffd29a', '#ff6f1f'], ring: '#ffd29a', ringScale: .55, count: [8, 11], speed: [30, 65], gravity: -20, drag: 1.1, life: [.18, .32], size: [1.0, 1.7], spin: [-180, 180], grow: [1.25, .5], squashX: 1, squashY: 1, rise: .05 },
    { id: 'petal', label: 'Petal', cn: '樱花', shape: 'petal', colors: ['#ffb3d1', '#ffd9e8', '#ff8ab8', '#fff0f6'], ring: null, ringScale: 1, count: [6, 9], speed: [14, 32], gravity: 12, drag: 1.4, life: [.38, .6], size: [1.0, 1.7], spin: [-220, 220], grow: [1.0, .8], squashX: 1, squashY: 1, rise: 0 },
    { id: 'bubble', label: 'Bubble', cn: '气泡', shape: 'bubble', colors: ['#5eead4', '#99f6e4', '#2dd4bf', '#a7f3d0'], ring: null, ringScale: 1, count: [5, 8], speed: [8, 20], gravity: -6, drag: 1.7, life: [.45, .7], size: [1.0, 1.7], spin: [-30, 30], grow: [.75, 1.2], squashX: 1, squashY: 1, rise: .1 },
  ];

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  const EFFECTS = ['original', 'audio', 'aurora', 'grid', 'warp'];
  const normalizeEffect = (v) => (EFFECTS.includes(v) ? v : 'original');

  const hash3 = (a, b, c) => {
    let h = a * 374761393 + b * 668265263 + c * 2147483647;
    h = (h ^ (h >>> 13)) * 1274126177;
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967295;
  };

  const AURORA_VERT = `
    attribute vec2 a_pos;
    void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
  `;

  const AURORA_COMMON = `
    precision highp float;
    uniform vec2 u_res;
    uniform float u_time;
    uniform float u_level;
    uniform float u_thumb;
    uniform float u_reveal;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p *= 2.03;
        a *= 0.5;
      }
      return v;
    }
    float sdRound(vec2 p, vec2 b, float r) {
      vec2 q = abs(p) - b + r;
      return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
    }
  `;

  const AURORA_FRAG = AURORA_COMMON + `
    void main() {
      vec2 p = gl_FragCoord.xy;
      vec2 res = u_res;
      float h = res.y;
      float r = (h - 4.0) * 0.5;
      vec2 center = res * 0.5;
      float d = sdRound(p - center, res * 0.5 - vec2(2.0), r);
      float inTrack = 1.0 - smoothstep(0.0, 1.2, d);
      float border = smoothstep(1.5, 0.0, abs(d) - 0.7);
      float thumbX = u_thumb;
      float levelOn = step(0.5, u_level);
      float fillMask = (1.0 - smoothstep(thumbX - 1.0, thumbX + 1.0, p.x)) * step(2.0, p.x) * inTrack * levelOn;
      float t = u_time;
      float isMax = step(2.5, u_level);
      float rv = clamp(u_reveal, 0.0, 1.0);
      float scanX = mix(thumbX, 1.0, rv);
      float revealMask = smoothstep(scanX - 1.5, scanX + 1.5, p.x);

      vec3 bg = mix(vec3(0.085, 0.095, 0.11), vec3(0.255, 0.255, 0.267), levelOn);
      vec3 col = bg;

      if (fillMask > 0.001) {
        vec3 deep = vec3(0.002, 0.035, 0.13);
        vec3 blue = vec3(0.01, 0.3, 0.9);
        vec3 cyan = vec3(0.45, 0.9, 1.0);
        vec2 q = p / res;
        float warp = fbm(q * vec2(3.0, 8.0) + vec2(t * 0.04, -t * 0.03));
        float warp2 = fbm(q * vec2(6.0, 16.0) - vec2(t * 0.05, t * 0.02));
        float ribbonCount = u_level < 1.5 ? 1.0 : (u_level < 2.5 ? 3.0 : 5.0);
        float ribbons = 0.0;
        for (int i = 0; i < 5; i++) {
          float fi = float(i);
          float on = step(fi, ribbonCount - 0.5);
          float y = q.y + (warp - 0.5) * 0.24 + (warp2 - 0.5) * 0.1 + fi * 0.17;
          float wave = sin((y * 5.0 + q.x * 1.4 + t * 0.35 + warp * 2.0) * 3.1415);
          float band = pow(max(0.0, wave), 6.0);
          ribbons += band * on * (0.45 + 0.2 * sin(t * 0.6 + fi));
        }
        float glow = smoothstep(0.0, 1.1, ribbons);
        vec3 body = mix(deep, blue, 0.25 + 0.5 * glow);
        body = mix(body, cyan, glow * 0.4);
        float core = pow(smoothstep(0.2, 1.0, ribbons), 3.0);
        body += core * 0.25 * vec3(0.4, 0.85, 1.0);
        float shine = pow(max(0.0, 1.0 - abs(q.y - 0.5) * 3.0), 3.0) * 0.06;
        body += shine * vec3(0.3, 0.7, 1.0);
        float hot = isMax * revealMask;
        body = mix(body, vec3(0.72, 0.90, 1.0), hot * 0.30);
        body = mix(body, vec3(0.65, 0.55, 1.0), hot * 0.12);
        body += smoothstep(0.55, 0.0, abs(p.y - h * 0.5)) * hot * 0.24 * vec3(0.85, 0.96, 1.0);
        body += smoothstep(2.5, 0.0, abs(p.y - (h - 5.0))) * hot * 0.16 * vec3(0.90, 0.98, 1.0);
        body += smoothstep(2.0, 0.0, abs(p.y - 5.0)) * hot * 0.10 * vec3(0.90, 0.98, 1.0);

        float streak = 0.0;
        for (int i = 0; i < 4; i++) {
          float fi = float(i);
          float sy = h * (0.20 + fi * 0.18) + sin(t * 0.8 + fi * 1.7) * 3.0;
          float sx = thumbX - 20.0 - fi * 18.0;
          float len = 22.0 + 18.0 * sin(t * 0.8 + fi * 2.1);
          streak += smoothstep(1.4, 0.0, abs(p.y - sy)) * smoothstep(sx - len, sx, p.x) * step(p.x, sx);
        }
        body += streak * hot * 0.50 * vec3(0.8, 0.95, 1.0);

        vec2 sc = floor(p / 11.0);
        vec2 sp = (sc + 0.5) * 11.0;
        float hs = hash(sc);
        float star = step(0.94, hs) * smoothstep(2.2, 0.0, length(p - sp)) * (0.6 + 0.4 * sin(t * 3.0 + hs * 9.0));
        float starVis = smoothstep(1.5, 2.0, u_level);
        float starMask = isMax > 0.5 ? revealMask : 1.0;
        body += star * starVis * starMask * (isMax > 0.5 ? 1.0 : 0.65) * vec3(0.85, 0.97, 1.0);

        float beamVis = isMax * revealMask;
        float beams = 0.0;
        vec2 src = vec2(thumbX, h * 0.5);
        for (int i = 0; i < 9; i++) {
          float fi = float(i);
          float u = clamp((thumbX - p.x) / max(thumbX, 1.0), 0.0, 1.0);
          float env = smoothstep(0.0, 1.0, u);
          float amp = h * (0.06 + 0.55 * env);
          float phase = fi * 0.698 + t * 0.8;
          float lineY = h * 0.5 + amp * sin(u * 6.0 + phase + u * 2.0);
          float dd = abs(p.y - lineY);
          float beamCore = smoothstep(1.2, 0.0, dd);
          float beamBloom = smoothstep(7.0, 0.0, dd);
          beams += beamCore * 0.60 + beamBloom * 0.16;
        }
        body += beams * beamVis * vec3(0.45, 0.85, 1.0);
        body = mix(body, vec3(0.65, 0.85, 1.0), clamp(beams * beamVis * 0.25, 0.0, 0.30));
        body += beamVis * smoothstep(22.0, 0.0, length(p - src)) * 0.10 * vec3(0.5, 0.85, 1.0);

        col = mix(bg, body, fillMask);
      }

      col = mix(col, vec3(0.12, 0.13, 0.15), border * 0.8);
      gl_FragColor = vec4(col, inTrack);
    }
  `;

  class AuroraField {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = canvas.getContext('webgl', {
        alpha: true,
        premultipliedAlpha: false,
        antialias: true,
        preserveDrawingBuffer: true,
      });
      this.ok = false;
      if (!this.gl) return;
      const gl = this.gl;
      const vs = this.compile(gl.VERTEX_SHADER, AURORA_VERT);
      const fs = this.compile(gl.FRAGMENT_SHADER, AURORA_FRAG);
      if (!vs || !fs) return;
      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
      this.program = prog;
      this.uRes = gl.getUniformLocation(prog, 'u_res');
      this.uTime = gl.getUniformLocation(prog, 'u_time');
      this.uLevel = gl.getUniformLocation(prog, 'u_level');
      this.uThumb = gl.getUniformLocation(prog, 'u_thumb');
      this.uReveal = gl.getUniformLocation(prog, 'u_reveal');
      this.buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.useProgram(prog);
      const a = gl.getAttribLocation(prog, 'a_pos');
      gl.enableVertexAttribArray(a);
      gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      this.ok = true;
    }
    compile(type, src) {
      const gl = this.gl;
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return null;
      return sh;
    }
    resize(w, h, dpr) {
      if (!this.ok) return;
      const W = Math.max(1, Math.round(w * dpr));
      const H = Math.max(1, Math.round(h * dpr));
      if (this.canvas.width !== W || this.canvas.height !== H) {
        this.canvas.width = W;
        this.canvas.height = H;
      }
      this.gl.viewport(0, 0, W, H);
    }
    draw(thumbX, level, time, dpr, reveal = 1) {
      if (!this.ok) return;
      const gl = this.gl;
      const W = this.canvas.width;
      const H = this.canvas.height;
      gl.useProgram(this.program);
      gl.uniform2f(this.uRes, W, H);
      gl.uniform1f(this.uTime, time);
      gl.uniform1f(this.uLevel, level);
      gl.uniform1f(this.uThumb, thumbX * dpr);
      gl.uniform1f(this.uReveal, reveal);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }

  const hexToRgb = (hex) => {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const n = Number.parseInt(full, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };

  function makeGlowSprite(tint = '#6ebeff') {
    const size = 48;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const g = cv.getContext('2d');
    const r = size / 2;
    const c = hexToRgb(tint);
    const grad = g.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.22, `rgba(${c.r}, ${c.g}, ${c.b}, 0.55)`);
    grad.addColorStop(0.55, `rgba(${c.r}, ${c.g}, ${c.b}, 0.18)`);
    grad.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return cv;
  }

  function makeWakeSprite(shape, tint) {
    const size = 64;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const g = cv.getContext('2d');
    const c = hexToRgb(tint);
    const r = size / 2;

    const glow = g.createRadialGradient(r, r, 0, r, r, r);
    glow.addColorStop(0, 'rgba(255,255,255,0.95)');
    glow.addColorStop(0.18, `rgba(${c.r}, ${c.g}, ${c.b}, 0.65)`);
    glow.addColorStop(0.58, `rgba(${c.r}, ${c.g}, ${c.b}, 0.14)`);
    glow.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);
    g.fillStyle = glow;
    g.fillRect(0, 0, size, size);

    g.save();
    g.translate(r, r);
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';

    if (shape === 'flare') {
      g.fillStyle = 'rgba(255,255,255,0.95)';
      g.beginPath();
      g.moveTo(0, -30);
      g.quadraticCurveTo(3, -5, 30, 0);
      g.quadraticCurveTo(3, 5, 0, 30);
      g.quadraticCurveTo(-3, 5, -30, 0);
      g.quadraticCurveTo(-3, -5, 0, -30);
      g.fill();
      g.globalAlpha = 0.7;
      g.strokeStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
      g.lineWidth = 3;
      for (const a of [Math.PI / 4, -Math.PI / 4]) {
        g.save();
        g.rotate(a);
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(0, -19);
        g.stroke();
        g.restore();
      }
    } else if (shape === 'snow') {
      g.strokeStyle = 'rgba(255,255,255,0.94)';
      g.lineWidth = 3.2;
      for (let i = 0; i < 6; i++) {
        g.save();
        g.rotate((i * Math.PI) / 3);
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(0, -25);
        g.stroke();
        for (const y of [-10, -17]) {
          g.beginPath();
          g.moveTo(0, y);
          g.lineTo(-5, y - 5);
          g.moveTo(0, y);
          g.lineTo(5, y - 5);
          g.stroke();
        }
        g.restore();
      }
      g.fillStyle = 'rgba(255,255,255,0.95)';
      g.beginPath();
      g.arc(0, 0, 3, 0, Math.PI * 2);
      g.fill();
    } else if (shape === 'petal') {
      g.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.85)`;
      g.beginPath();
      g.moveTo(0, -18);
      g.bezierCurveTo(13, -10, 13, 10, 0, 18);
      g.bezierCurveTo(-13, 10, -13, -10, 0, -18);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.5)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(0, -14);
      g.lineTo(0, 14);
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.beginPath();
      g.ellipse(-3.5, -4, 2, 5, -0.35, 0, Math.PI * 2);
      g.fill();
    } else if (shape === 'bubble') {
      g.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.95)`;
      g.lineWidth = 6;
      g.beginPath();
      g.arc(0, 0, 18, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.85)';
      g.lineWidth = 2.4;
      g.beginPath();
      g.arc(0, 0, 18, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.beginPath();
      g.arc(-6, -7, 3.5, 0, Math.PI * 2);
      g.fill();
    } else if (shape === 'orb') {
      g.fillStyle = 'rgba(255,255,255,0.92)';
      g.beginPath();
      g.arc(0, 0, 6.5, 0, Math.PI * 2);
      g.fill();
    } else {
      g.fillStyle = 'rgba(255,255,255,0.92)';
      g.beginPath();
      g.arc(0, 0, 6.5, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.6)`;
      g.lineWidth = 3.5;
      g.beginPath();
      g.arc(0, 0, 10.5, 0, Math.PI * 2);
      g.stroke();
    }

    g.restore();
    return cv;
  }

  const CSS = `
    :host {
      --effort-blue: #0a84ff;
      --effort-blue-deep: #0066e6;
      --effort-blue-light: #5cb8ff;
      --effort-track: #414144;
      --energy: 0;
      display: block;
      position: relative;
      height: 66px;
      font-family: "Segoe UI Variable", "Segoe UI", "Noto Sans SC", "Microsoft YaHei", sans-serif;
      -webkit-font-smoothing: antialiased;
      user-select: none;
      -webkit-user-select: none;
    }
    *, *::before, *::after { box-sizing: border-box; }

    .track {
      position: absolute;
      left: 0; right: 0; bottom: 0;
      width: auto;
      height: 34px;
      border-radius: 17px;
      background: var(--effort-track);
      cursor: grab;
      outline: none;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, .07);
      transition: box-shadow .12s ease;
      touch-action: none;
    }
    .track.drag {
      cursor: grabbing;
      box-shadow:
        inset 0 0 0 1px rgba(120, 190, 255, .18),
        inset 0 1px 0 rgba(255, 255, 255, .10);
    }
    .track:focus-visible {
      outline: 2px solid rgba(120, 190, 255, .85);
      outline-offset: 3px;
    }
    .track.drag:focus-visible { outline: none; }

    .clip {
      position: absolute;
      inset: 0;
      border-radius: inherit;
      overflow: hidden;
    }
    .fill {
      position: absolute;
      left: 2px; top: 2px; bottom: 2px;
      width: 0;
      overflow: hidden;
      border-radius: 15px;
      background: linear-gradient(90deg,
        var(--effort-blue-deep) 0%,
        var(--effort-blue) 55%,
        var(--effort-blue-light) 100%);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, .16);
      transition: top .22s ease, bottom .22s ease, left .22s ease, border-radius .22s ease;
      will-change: width;
    }
    .fill::after {
      content: "";
      position: absolute;
      top: -30%; bottom: -30%;
      left: -45%;
      width: 38%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .55), transparent);
      filter: blur(2px);
      opacity: calc(.22 * var(--energy));
      animation: sheen 3.6s cubic-bezier(.4, 0, .2, 1) infinite;
      pointer-events: none;
    }
    :host([fill-style="full"]) .fill {
      left: 0; top: 0; bottom: 0;
      border-radius: 17px;
    }
    @keyframes sheen {
      0%   { transform: translateX(0); }
      100% { transform: translateX(360%); }
    }
    canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
      pointer-events: none;
    }
    canvas.gl-canvas {
      display: none;
      z-index: 2;
    }
    .track[data-effect="aurora"] canvas.gl-canvas { display: block; }
    .track[data-effect="aurora"] canvas:not(.gl-canvas) { display: none; }

    .dots {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .dots i {
      position: absolute;
      top: 50%;
      width: 5px; height: 5px;
      border-radius: 50%;
      background: rgba(255, 255, 255, .24);
      transform: translate(-50%, -50%);
      transition: background .2s ease;
    }
    .dots i.lit {
      background: rgba(255, 255, 255, .72);
      box-shadow: 0 0 calc(2px + 5px * var(--energy)) rgba(120, 205, 255, .5);
    }

    .bubble {
      position: absolute;
      left: 0;
      bottom: calc(100% + 6px);
      z-index: 4;
      padding: 5px 9px;
      border-radius: 8px;
      background: var(--effort-bubble, #1b1b1f);
      border: 1px solid var(--effort-bubble-border, rgba(255, 255, 255, .12));
      color: var(--effort-bubble-text, #f2f5f9);
      font: 600 11px/1.2 "Segoe UI", "Noto Sans SC", "Microsoft YaHei", sans-serif;
      letter-spacing: .01em;
      white-space: nowrap;
      box-shadow: 0 6px 18px rgba(0, 0, 0, .4);
      transform: translateX(-50%) scale(.98);
      transform-origin: 50% 100%;
      transition: transform .16s cubic-bezier(.22, 1, .3, 1), box-shadow .16s ease, border-color .16s ease;
      pointer-events: none;
    }
    .bubble::after {
      content: "";
      position: absolute;
      left: 50%;
      bottom: -5px;
      width: 8px; height: 8px;
      background: var(--effort-bubble, #1b1b1f);
      border-right: 1px solid var(--effort-bubble-border, rgba(255, 255, 255, .12));
      border-bottom: 1px solid var(--effort-bubble-border, rgba(255, 255, 255, .12));
      transform: translateX(-50%) rotate(45deg);
    }
    .track.drag .bubble {
      transform: translateX(-50%) scale(1.05);
      border-color: rgba(92, 184, 255, .4);
      box-shadow: 0 7px 22px rgba(0, 0, 0, .45), 0 0 14px rgba(10, 132, 255, .18);
    }

    .thumb {
      position: absolute;
      top: 50%; left: 0;
      width: 30px; height: 30px;
      border-radius: 50%;
      background: #fff;
      transform: translate3d(0, -50%, 0) translateX(-50%);
      box-shadow:
        0 1px 3px rgba(0, 0, 0, .45),
        0 0 0 .5px rgba(0, 0, 0, .12);
      transition: box-shadow .12s ease;
      pointer-events: none;
      z-index: 3;
      will-change: transform;
    }
    .track.drag .thumb {
      box-shadow:
        0 2px 7px rgba(0, 0, 0, .55),
        0 0 0 .5px rgba(0, 0, 0, .14);
    }
    .track.drag .thumb::after {
      box-shadow: 0 0 calc(12px + 30px * var(--energy)) rgba(90, 190, 255, .75);
    }
    .thumb::after {
      content: "";
      position: absolute;
      inset: -1px;
      border-radius: 50%;
      box-shadow: 0 0 calc(8px + 26px * var(--energy)) rgba(10, 132, 255, .55);
      opacity: calc(.12 + .5 * var(--energy));
      transition: opacity .2s ease;
      pointer-events: none;
    }
    :host([data-level="3"]) .thumb::after {
      animation: aura 2.8s ease-in-out infinite;
    }
    @keyframes aura {
      0%, 100% { transform: scale(1); opacity: .6; }
      50%      { transform: scale(1.16); opacity: .32; }
    }
    @media (prefers-reduced-motion: reduce) {
      .dots i, .thumb, .thumb::after, .bubble { transition: none; }
      .fill { transition: none; }
      .fill::after, .thumb::after { animation: none; }
      .fill::after { opacity: 0; }
    }
  `;

  const TPL = document.createElement('template');
  TPL.innerHTML = `
    <style>${CSS}</style>
    <div class="track" role="slider" tabindex="0"
         aria-label="Reasoning effort" aria-valuemin="0" aria-valuemax="3"
         aria-valuenow="2" aria-valuetext="High" aria-orientation="horizontal">
      <div class="bubble" aria-hidden="true">High</div>
      <div class="clip">
        <div class="fill"></div>
        <canvas aria-hidden="true"></canvas>
        <canvas class="gl-canvas" aria-hidden="true"></canvas>
        <div class="dots">${LEVELS.map(() => '<i></i>').join('')}</div>
      </div>
      <div class="thumb"></div>
    </div>
  `;

  class ReasoningEffort extends HTMLElement {
    static get observedAttributes() { return ['value', 'fill-style', 'trail-style', 'effect-style', 'warp-speed']; }

    constructor() {
      super();
      this._value = 2;
      this._fillStyle = 'capsule';
      this._trailStyle = TRAIL_STYLES[0];
      this._effectStyle = 'original';
      this._warpSpeed = 1200;
      this._effectFillW = 0;
      this._audioTime = 0;
      this._warp = [];
      this._lastEffectTime = 0;
      this._auroraReveal = 0;
      this._wakeSprites = [];
      this._p = 2 / 3;
      this._targetP = this._p;
      this._vel = 0;
      this._built = false;
      this._dragging = false;
      this._pointerId = null;
      this._dragVel = 0;
      this._lastMoveTime = 0;
      this._overPx = 0;
      this._overVel = 0;
      this._grabOffsetPx = 0;
      this._samples = [];
      this._pulse = 0;
      this._w = 0;
      this._h = 34;
      this._dpr = 1;
      this._inset = 17;
      this._travel = 0;
      this._particles = [];
      this._wake = [];
      this._rings = [];
      this._wakeAcc = 0;
      this._wakeLastX = null;
      this._emitAcc = 0;
      this._raf = 0;
      this._last = 0;
      this._time = 0;
      this._pendingValue = null;
      this._sprite = null;
      this._mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      this._onVis = () => (document.hidden ? this._stop() : this._ensureLoop());
      this._onMq = () => {
        if (this._reduced) {
          this._stop();
          this._particles.length = 0;
          this._p = this._targetP;
          this._layout();
          this._clear();
        } else {
          this._ensureLoop();
        }
      };
      this._frame = this._frame.bind(this);
      this._onDown = this._onDown.bind(this);
      this._onMove = this._onMove.bind(this);
      this._onUp = this._onUp.bind(this);
    }

    get value() { return this._value; }
    set value(v) {
      if (!this._built) { this._pendingValue = v; return; }
      this._setValue(v, { retarget: true });
    }
    get label() { return LEVELS[this._value].label; }
    get labels() { return LEVELS.map((l) => l.label); }
    get fillStyle() { return this._fillStyle; }
    set fillStyle(v) {
      this.setAttribute('fill-style', v === 'full' ? 'full' : 'capsule');
    }
    get trailStyle() { return this._trailStyle.id; }
    get effectStyle() { return this._effectStyle; }
    set effectStyle(v) {
      this.setAttribute('effect-style', normalizeEffect(v));
    }
    set trailStyle(v) {
      const st = TRAIL_STYLES.find((s) => s.id === v) || TRAIL_STYLES[0];
      this.setAttribute('trail-style', st.id);
    }
    get _reduced() { return this._mq.matches; }

    attributeChangedCallback(name, oldV, newV) {
      if (name === 'warp-speed') {
        const parsed = Number.parseInt(newV, 10);
        this._warpSpeed = Number.isFinite(parsed) ? clamp(parsed, 100, 12000) : 1200;
        return;
      }
      if (name === 'trail-style') {
        const st = TRAIL_STYLES.find((s) => s.id === newV) || TRAIL_STYLES[0];
        this._trailStyle = st;
        if (this._built) {
          this._wakeSprites = st.colors.map((c) => makeWakeSprite(st.shape, c));
          this._wake.length = 0;
          this._rings.length = 0;
          this._wakeAcc = 0;
          this._wakeLastX = null;
        }
        return;
      }
      if (name === 'effect-style') {
        this._effectStyle = normalizeEffect(newV);
        if (this._built) {
          this._particles.length = 0;
          this._wake.length = 0;
          this._rings.length = 0;
          this._wakeAcc = 0;
          this._wakeLastX = null;
          this._warp.length = 0;
          this._lastEffectTime = 0;
          this._auroraReveal = 0;
          this._track.dataset.effect = this._effectStyle;
          this._layout();
          this._clear();
          if (this._effectStyle === 'aurora') this._aurora?.resize(this._w, this._h, this._dpr);
        }
        return;
      }
      if (name === 'fill-style') {
        this._fillStyle = newV === 'full' ? 'full' : 'capsule';
        if (this._built) this._layout();
        return;
      }
      if (name !== 'value' || oldV === newV) return;
      const v = Number.parseInt(newV, 10);
      if (!Number.isFinite(v)) return;
      if (!this._built) { this._pendingValue = v; return; }
      this._setValue(v, { retarget: true, emit: false });
    }

    connectedCallback() {
      if (this._built) {
        if (this._ro) this._ro.observe(this._track);
        this._measure();
        this._layout();
        this._ensureLoop();
        return;
      }
      this._built = true;
      this.attachShadow({ mode: 'open' }).appendChild(TPL.content.cloneNode(true));

      this._track = this.shadowRoot.querySelector('.track');
      this._fill = this.shadowRoot.querySelector('.fill');
      this._canvas = this.shadowRoot.querySelector('canvas');
      this._ctx = this._canvas.getContext('2d');
      this._glCanvas = this.shadowRoot.querySelector('canvas.gl-canvas');
      this._aurora = new AuroraField(this._glCanvas);
      this._thumb = this.shadowRoot.querySelector('.thumb');
      this._bubble = this.shadowRoot.querySelector('.bubble');
      this._dots = Array.from(this.shadowRoot.querySelectorAll('.dots i'));
      this._sprite = makeGlowSprite();
      this._fillStyle = this.getAttribute('fill-style') === 'full' ? 'full' : 'capsule';
      this._trailStyle = TRAIL_STYLES.find((s) => s.id === this.getAttribute('trail-style')) || TRAIL_STYLES[0];
      this._effectStyle = normalizeEffect(this.getAttribute('effect-style'));
      this._track.dataset.effect = this._effectStyle;
      this._wakeSprites = this._trailStyle.colors.map((c) => makeWakeSprite(this._trailStyle.shape, c));

      const raw = this._pendingValue !== null ? this._pendingValue : this.getAttribute('value');
      const v = Number.parseInt(raw, 10);
      this._value = Number.isFinite(v) ? clamp(Math.round(v), 0, N - 1) : 2;
      this._p = this._targetP = this._value / (N - 1);
      this._syncUI();

      this._bind();
      this._measure();
      this._layout();

      this._ro = new ResizeObserver(() => {
        this._measure();
        this._layout();
      });
      this._ro.observe(this._track);

      document.addEventListener('visibilitychange', this._onVis);
      this._mq.addEventListener('change', this._onMq);

      requestAnimationFrame(() => {
        this._measure();
        this._layout();
        if (this._reduced) this._clear();
      });
      this._ensureLoop();
    }

    disconnectedCallback() {
      this._stop();
      if (this._ro) this._ro.disconnect();
      document.removeEventListener('visibilitychange', this._onVis);
      this._mq.removeEventListener('change', this._onMq);
    }

    _bind() {
      this._track.addEventListener('pointerdown', this._onDown);
      this._track.addEventListener('pointermove', this._onMove);
      this._track.addEventListener('pointerup', this._onUp);
      this._track.addEventListener('pointercancel', this._onUp);
      this._track.addEventListener('lostpointercapture', () => {
        if (this._dragging) this._onUp();
      });
      this._track.addEventListener('keydown', (e) => this._onKey(e));
    }

    _onKey(e) {
      const k = e.key;
      let next = this._value;
      if (k === 'ArrowRight' || k === 'ArrowUp') next++;
      else if (k === 'ArrowLeft' || k === 'ArrowDown') next--;
      else if (k === 'Home') next = 0;
      else if (k === 'End') next = N - 1;
      else return;
      e.preventDefault();
      this._setValue(clamp(next, 0, N - 1), { retarget: true });
      this._ensureLoop();
    }

    _pFromX(clientX) {
      const r = this._track.getBoundingClientRect();
      const usable = r.width - this._inset * 2;
      if (usable <= 0) return 0;
      return clamp((clientX - r.left - this._inset - this._grabOffsetPx) / usable, 0, 1);
    }

    _rawPFromX(clientX) {
      const r = this._track.getBoundingClientRect();
      const usable = r.width - this._inset * 2;
      if (usable <= 0) return 0;
      return (clientX - r.left - this._inset - this._grabOffsetPx) / usable;
    }

    _magnetize(p) {
      const step = 1 / (N - 1);
      const nearest = Math.round(p / step) * step;
      const gapPx = (nearest - p) * this._travel;
      const dist = Math.abs(gapPx);
      const radius = 18;
      if (dist >= radius || dist === 0) return p;
      const t = 1 - dist / radius;
      const pullPx = Math.sign(gapPx) * Math.min(dist, 5 * t * t);
      return clamp(p + pullPx / this._travel, 0, 1);
    }

    _releaseVelocity(e) {
      const now = e && Number.isFinite(e.timeStamp) ? e.timeStamp : performance.now();
      const samples = this._samples.filter((s) => now - s.t <= 120);
      if (samples.length >= 2) {
        const a = samples[0];
        const b = samples[samples.length - 1];
        const dt = (b.t - a.t) / 1000;
        if (dt > 0.008) return (b.x - a.x) / dt;
      }
      return 0;
    }

    _onDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      this._track.focus({ preventScroll: true });
      this._dragging = true;
      this._pointerId = e.pointerId;
      this._track.classList.add('drag');
      try { this._track.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }

      const r = this._track.getBoundingClientRect();
      const pointerX = e.clientX - r.left;
      const thumbX = this._xForP(this._p) + this._overPx;
      const onThumb = Math.abs(pointerX - thumbX) <= 18;
      this._grabOffsetPx = onThumb ? pointerX - thumbX : 0;

      let p = onThumb ? this._p : this._pFromX(e.clientX);
      if (!onThumb && !this._reduced) p = this._magnetize(p);
      this._p = p;
      this._targetP = p;
      this._vel = 0;
      this._lastMoveTime = e.timeStamp;
      this._dragVel = 0;
      this._samples = [{ x: e.clientX, t: e.timeStamp }];
      this._overPx = 0;
      this._overVel = 0;
      this._setValue(Math.round(this._p * (N - 1)), { retarget: false });
      this._layout();
      if (!this._reduced) {
        const wx = this._xForP(this._p) + this._overPx;
        this._wakeLastX = wx;
        this._wakeAcc = 0;
        this._emitWake(wx, 10);
        this._addRing(wx);
      }
      this._ensureLoop();
    }

    _onMove(e) {
      if (!this._dragging || e.pointerId !== this._pointerId) return;

      const raw = this._rawPFromX(e.clientX);
      let p;
      let over = 0;
      if (raw < 0 || raw > 1) {
        const base = raw < 0 ? 0 : 1;
        const pastPx = Math.abs(raw - base) * this._travel;
        if (!this._reduced) {
          const damped = (pastPx * this._travel * 0.12) / (this._travel + 0.12 * pastPx);
          over = Math.sign(raw - base) * Math.min(12, damped);
        }
        p = base;
      } else {
        p = this._reduced ? raw : this._magnetize(raw);
      }
      this._overPx = over;
      this._overVel = 0;

      const dt = Math.max((e.timeStamp - this._lastMoveTime) / 1000, 0.008);
      const deltaPx = (p - this._p) * this._travel;
      this._dragVel = deltaPx / dt;

      this._samples.push({ x: e.clientX, t: e.timeStamp });
      const cutoff = e.timeStamp - 120;
      while (this._samples.length && this._samples[0].t < cutoff) this._samples.shift();
      if (this._samples.length > 8) this._samples.splice(0, this._samples.length - 8);

      this._p = p;
      this._targetP = p;
      this._lastMoveTime = e.timeStamp;
      const prevValue = this._value;
      this._setValue(Math.round(p * (N - 1)), { retarget: false });
      this._layout();

      if (this._reduced || !this._w) return;

      const wx = this._xForP(this._p) + this._overPx;
      if (this._wakeLastX === null) this._wakeLastX = wx;
      this._wakeAcc += Math.abs(wx - this._wakeLastX);
      let guard = 0;
      while (this._wakeAcc >= 12 && guard++ < 4) {
        this._wakeAcc -= 12;
        this._emitWake(wx, 8);
      }
      if (this._wakeAcc >= 12) this._wakeAcc = 0;
      this._wakeLastX = wx;
      if (this._value !== prevValue) this._addRing(wx);
    }

    _onUp(e) {
      if (!this._dragging) return;
      if (e && e.pointerId !== undefined && e.pointerId !== this._pointerId) return;
      this._dragging = false;
      this._track.classList.remove('drag');
      if (this._pointerId !== null) {
        try { this._track.releasePointerCapture(this._pointerId); } catch (_) { /* noop */ }
      }
      this._pointerId = null;

      const releaseV = this._reduced ? 0 : this._releaseVelocity(e);
      this._dragVel = 0;
      const projectedP = this._reduced
        ? this._p
        : clamp(this._p + (releaseV * 0.12) / Math.max(1, this._travel), 0, 1);
      const targetIndex = this._reduced
        ? clamp(Math.round(this._p * (N - 1)), 0, N - 1)
        : clamp(Math.round(projectedP * (N - 1)), 0, N - 1);

      const prevValue = this._value;
      if (targetIndex !== this._value) {
        this._setValue(targetIndex, { retarget: false });
      }
      const targetP = targetIndex / (N - 1);
      this._targetP = targetP;

      if (this._reduced) {
        this._p = targetP;
        this._overPx = 0;
        this._overVel = 0;
        this._vel = 0;
      } else {
        const vP = clamp(releaseV / Math.max(1, this._travel), -3, 3);
        this._vel = clamp(vP * 0.55 + (targetP - this._p) * 2.2, -3.2, 3.2);
        this._overVel = 0;
      }

      this._samples = [];
      this._grabOffsetPx = 0;
      this._wakeAcc = 0;
      this._wakeLastX = null;
      if (!this._reduced && this._value !== prevValue) {
        this._addRing(this._xForP(this._p) + this._overPx);
      }
      if (!this._reduced) this._pulse = Math.max(this._pulse, 0.03);
      if (this.getAttribute('value') !== String(this._value)) {
        this.setAttribute('value', String(this._value));
      }
      this._layout();
      this._flash();
      this._ensureLoop();
    }

    _setValue(v, opt = {}) {
      v = clamp(Math.round(v), 0, N - 1);
      const changed = v !== this._value;
      this._value = v;

      if (opt.retarget) {
        this._targetP = v / (N - 1);
        if (this._reduced) {
          this._p = this._targetP;
          this._vel = 0;
          this._layout();
        }
      }
      if (!changed) return;
      if (v === 3 && this._effectStyle === 'aurora') this._auroraReveal = 0;
      if (!this._reduced) this._pulse = 0.04;

      this._syncUI();
      if (!this._dragging && this.getAttribute('value') !== String(v)) {
        this.setAttribute('value', String(v));
      }
      this._flash();
      if (opt.emit !== false) {
        const lv = LEVELS[v];
        this.dispatchEvent(new CustomEvent('change', {
          detail: { value: v, level: v + 1, levels: N, label: lv.label },
          bubbles: true,
          composed: true,
        }));
      }
    }

    _syncUI() {
      const v = this._value;
      const lv = LEVELS[v];
      this.dataset.level = String(v);
      this._track.setAttribute('aria-valuenow', String(v));
      this._track.setAttribute('aria-valuetext', lv.label);
      this._bubble.textContent = lv.label;
      this._dots.forEach((d, i) => d.classList.toggle('lit', i < v));
    }

    _flash() {
      if (this._reduced || this._dragging || !this._fill.animate) return;
      this._fill.getAnimations().forEach((a) => a.cancel());
      this._fill.animate(
        [{ filter: 'brightness(1.32)' }, { filter: 'brightness(1)' }],
        { duration: 420, easing: 'cubic-bezier(.22, 1, .3, 1)' }
      );
    }

    _measure() {
      const w = this._track.clientWidth;
      const h = this._track.clientHeight;
      if (w < 2) return;
      this._w = w;
      this._h = h;
      this._dpr = Math.min(window.devicePixelRatio || 1, 2);
      this._canvas.width = Math.round(this._w * this._dpr);
      this._canvas.height = Math.round(this._h * this._dpr);
      this._ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
      this._inset = this._h / 2;
      this._travel = this._w - this._inset * 2;
      this._aurora?.resize(this._w, this._h, this._dpr);
      this._dots.forEach((d, i) => {
        d.style.left = (this._inset + this._travel * (i / (N - 1))) + 'px';
      });
    }

    _xForP(p) { return this._inset + this._travel * p; }

    _layout() {
      if (!this._w) return;
      const baseX = this._xForP(this._p);
      const x = baseX + (this._reduced ? 0 : this._overPx);
      const pad = this._fillStyle === 'full' ? 17 : 13;
      this._track.style.setProperty('--energy', this._p.toFixed(3));
      const speedPx = this._dragging ? this._dragVel : this._vel * this._travel;
      const stretch = this._reduced ? 0 : Math.min(.06, Math.abs(speedPx) / 3400);
      const press = this._dragging && !this._reduced ? 1.07 : 1;
      const pulse = this._reduced ? 0 : this._pulse;
      const sx = press * (1 + stretch + pulse);
      const sy = press * (1 - stretch * .45 + pulse);
      this._thumb.style.transform =
        `translate3d(${x}px, -50%, 0) translateX(-50%) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
      this._bubble.style.left = x + 'px';
      this._effectFillW = Math.max(0, baseX + pad);
      this._fill.style.width = this._effectFillW + 'px';
      this._fill.style.opacity = this._effectStyle === 'original' ? '' : '0';
      if (this._track.dataset.effect !== this._effectStyle) {
        this._track.dataset.effect = this._effectStyle;
      }
    }

    _clear() {
      if (this._ctx) this._ctx.clearRect(0, 0, this._w, this._h);
    }

    _addParticle(x, y, o = {}) {
      if (!this._ctx || this._particles.length >= 180) return;
      this._particles.push({
        x, y,
        vx: o.vx || 0,
        vy: o.vy || 0,
        age: 0,
        life: o.life || 1.6,
        size: o.size || 0.8,
        alpha: o.alpha === undefined ? 0.5 : o.alpha,
        seed: Math.random() * 10,
      });
    }

    _simulate(dt) {
      const p = this._p;
      if (p < 0.005) {
        if (this._particles.length) {
          this._particles.length = 0;
          this._clear();
        }
        return;
      }
      const thumbX = this._xForP(p);
      const rate = this._dragging
        ? 0
        : 3 + Math.pow(p, 1.15) * 72;
      this._emitAcc += rate * dt;
      let guard = 0;
      while (this._emitAcc >= 1 && guard++ < 12) {
        this._emitAcc -= 1;
        const x = 6 + Math.random() * Math.max(4, thumbX - 8);
        const y = 5 + Math.random() * Math.max(4, this._h - 10);
        const speed = 1 + p * 0.55;
        const big = Math.random() < p * p * 0.10;
        this._addParticle(x, y, {
          vx: (6 + Math.random() * 12) * speed,
          vy: (Math.random() - 0.5) * 4,
          life: 1.4 + Math.random() * 1.0 + p * 0.6,
          size: 0.28 + Math.random() * 0.55 + (big ? 0.45 : 0),
          alpha: 0.2 + Math.random() * 0.3,
        });
      }

      const ps = this._particles;
      for (let i = ps.length - 1; i >= 0; i--) {
        const q = ps[i];
        q.age += dt;
        if (q.age >= q.life || q.x > thumbX + 10) { ps.splice(i, 1); continue; }
        q.vx += Math.sin(this._time * 1.6 + q.seed * 5.3 + q.y * 0.3) * 5 * dt;
        q.vy += Math.cos(this._time * 1.2 + q.seed * 3.7 + q.x * 0.05) * 4 * dt;
        q.vy += Math.sin(q.x * 0.1 - this._time * 2.4) * (1 + 5 * p) * dt;
        q.vx *= 1 - 0.5 * dt;
        q.vy *= 1 - 0.5 * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        if (q.y < 3 || q.y > this._h - 3) q.vy *= -0.6;
      }
    }

    _draw() {
      const ctx = this._ctx;
      if (!ctx || !this._w) return;
      ctx.clearRect(0, 0, this._w, this._h);
      if (this._effectStyle !== 'original') {
        this._drawEffect(ctx);
        return;
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      this._drawRings(ctx);
      const ps = this._particles;
      const p = this._p;
      for (let i = 0; i < ps.length; i++) {
        const q = ps[i];
        const k = q.age / q.life;
        const a = q.alpha * Math.min(1, k / 0.2) * Math.pow(1 - k, 1.2);
        if (a <= 0.01) continue;

        if (p > 0.4 && q.size > 0.55) {
          const tail = 0.012 + p * 0.028;
          ctx.globalAlpha = a * 0.4;
          ctx.strokeStyle = 'rgba(190, 235, 255, 1)';
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(q.x - q.vx * tail, q.y - q.vy * tail);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }

        const s = 2.4 + q.size * 3.2;
        ctx.globalAlpha = a;
        ctx.drawImage(this._sprite, q.x - s / 2, q.y - s / 2, s, s);
        ctx.globalAlpha = Math.min(1, a * 1.1);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(q.x - 0.5, q.y - 0.5, 1, 1);
      }
      this._drawWake(ctx);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    _clipFill(ctx, fw, h) {
      const inset = 2;
      const x = inset;
      const y = inset;
      const w = Math.max(1, fw - inset);
      const hh = Math.max(1, h - inset * 2);
      const r = Math.min(hh / 2, w / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + hh - r);
      ctx.arcTo(x + w, y + hh, x + w - r, y + hh, r);
      ctx.lineTo(x + r, y + hh);
      ctx.arcTo(x, y + hh, x, y + hh - r, r);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
      ctx.clip();
    }

    _drawEffect(ctx) {
      if (this._effectStyle === 'aurora') {
        this._aurora?.resize(this._w, this._h, this._dpr);
        this._aurora?.draw(this._xForP(this._p), this._value, this._time, this._dpr, this._auroraReveal);
        return;
      }
      if (this._p < 0.005) return;
      if (this._effectStyle === 'audio') this._drawAudio(ctx);
      else if (this._effectStyle === 'grid') this._drawGrid(ctx);
      else if (this._effectStyle === 'warp') this._drawWarp(ctx);
    }

    _drawAudio(ctx) {
      const fw = this._effectFillW;
      const h = this._h;
      if (fw < 4) return;
      const lv = this._value;
      ctx.save();
      this._clipFill(ctx, fw, h);
      const g = ctx.createLinearGradient(0, 0, fw, 0);
      g.addColorStop(0, '#180a33');
      g.addColorStop(.55, '#2b0b55');
      g.addColorStop(1, '#3b0a6b');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, fw, h);

      const bw = 4, gap = 2, pad = 4;
      const count = Math.min(46, Math.floor((fw - pad * 2 + gap) / (bw + gap)));
      if (count < 1) { ctx.restore(); return; }
      const base = [0, 16, 24, 30][lv];
      const amp = [0, 40, 60, 76][lv];
      const speed = [0, .06, .09, .12][lv];
      this._audioTime += speed;
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#e9d5ff');
      grad.addColorStop(.35, '#c084fc');
      grad.addColorStop(.7, '#a855f7');
      grad.addColorStop(1, '#22d3ee');
      ctx.fillStyle = grad;
      const mid = h / 2;
      for (let i = 0; i < count; i++) {
        const x = pad + i * (bw + gap);
        const v = base + Math.abs(Math.sin(this._audioTime + i * .45)) * amp;
        const bh = Math.max(2, (v / 100) * h);
        ctx.beginPath();
        ctx.roundRect(x, mid - bh / 2, bw, bh, 2);
        ctx.fill();
      }
      ctx.restore();
    }

    _drawGrid(ctx) {
      const fw = this._effectFillW;
      const h = this._h;
      if (fw < 4) return;
      ctx.save();
      this._clipFill(ctx, fw, h);
      const t = clamp((this._p - 1 / 3) / (2 / 3), 0, 1);
      const g = ctx.createLinearGradient(0, 0, Math.max(60, fw), 0);
      g.addColorStop(0, '#02060d');
      g.addColorStop(.45, `rgb(${Math.round(8 + 3 * t)},${Math.round(47 + 27 * t)},${Math.round(107 + 57 * t)})`);
      g.addColorStop(1, `rgb(${Math.round(11 + 9 * t)},${Math.round(95 + 89 * t)},${Math.round(165 + 19 * t)})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, fw, h);

      const rows = 8, padX = 4, padY = 2, gapX = 1, gapY = 1;
      const ch = (h - 2 * padY - (rows - 1) * gapY) / rows;
      const cw = ch;
      const cols = Math.max(1, Math.floor((fw - 2 * padX + gapX) / (cw + gapX)));
      const density = [0, .38, .72, 1][this._value];
      const tierAlpha = [.28, .60, .95];
      const tierColor = ['30,64,175', '56,189,248', '224,242,254'];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = padX + c * (cw + gapX);
          const y = padY + r * (ch + gapY);
          if (x > fw - 2) continue;
          ctx.fillStyle = 'rgba(56,189,248,.14)';
          ctx.fillRect(x, y, cw, ch);
          const phase = (this._time * .55 + hash3(c + 41, r + 13, 3) * .88 + (1 - c / cols) * .10) % 1;
          if (phase < .16) {
            const lit = hash3(c, r, 11);
            if (lit <= density) {
              const roll = hash3(c + 101, r + 37, 3);
              const tier = roll < .55 ? 0 : roll < .85 ? 1 : 2;
              const a = Math.sin((phase / .16) * Math.PI) * tierAlpha[tier];
              if (a > .04) {
                ctx.fillStyle = `rgba(${tierColor[tier]},${a})`;
                ctx.fillRect(x, y, cw, ch);
              }
            }
          }
        }
      }
      ctx.restore();
    }

    _newWarp(x, h) {
      const z = Math.random();
      return {
        x,
        y: Math.random() * h,
        z,
        // One fixed size and one fixed opacity for every square: no big/small or dim/bright alternation.
        size: 3,
        alpha: .9,
      };
    }

    _drawWarp(ctx) {
      const fw = this._effectFillW;
      const h = this._h;
      if (fw < 4) return;
      ctx.save();
      this._clipFill(ctx, fw, h);
      const stops = [0, .3, .6, .82, 1];
      const low = [[1, 2, 7], [4, 16, 50], [6, 24, 63], [8, 50, 135], [10, 95, 216]];
      const high = [[2, 4, 10], [5, 18, 55], [6, 26, 74], [8, 55, 145], [10, 132, 255]];
      const max = [[10, 36, 114], [11, 63, 168], [59, 43, 181], [109, 40, 217], [139, 92, 246]];
      const highT = clamp((this._p - 1 / 3) / (1 / 3), 0, 1);
      const maxT = clamp((this._p - 2 / 3) / (1 / 3), 0, 1);
      const g = ctx.createLinearGradient(0, 0, Math.max(60, fw), 0);
      for (let i = 0; i < stops.length; i++) {
        const c = low[i].map((v, j) => Math.round(v + (high[i][j] - v) * highT + (max[i][j] - low[i][j] - (high[i][j] - low[i][j]) * highT) * maxT));
        g.addColorStop(stops[i], `rgb(${c[0]},${c[1]},${c[2]})`);
      }
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, fw, h);
      const sheen = ctx.createLinearGradient(0, 0, 0, h);
      sheen.addColorStop(0, 'rgba(255,255,255,.06)');
      sheen.addColorStop(.45, 'rgba(255,255,255,0)');
      sheen.addColorStop(1, 'rgba(0,0,0,.12)');
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, fw, h);

      const now = this._time;
      const dt = this._lastEffectTime ? Math.min(.05, now - this._lastEffectTime) : 0;
      this._lastEffectTime = now;
      const p = this._p;
      // Sparse enough that squares read individually; still covers the fill without empty bands.
      const count = Math.max(12, Math.round(fw * (0.2 + 0.28 * p)));
      if (this._warp.length > count) this._warp.length = count;
      while (this._warp.length < count) {
        const at = this._warp.length;
        const x = ((at + 0.5) / count) * fw;
        this._warp.push(this._newWarp(x, h));
      }
      // `warp-speed` is the Max-level speed in px/s; lower levels scale down from it.
      const speed = this._warpSpeed * (0.4 + 0.6 * p);
      for (let i = 0; i < this._warp.length; i++) {
        const q = this._warp[i];
        q.x -= speed * (0.6 + q.z * 0.4) * dt;
        let wrapped = false;
        while (q.x < -q.size) {
          // Wrap instead of respawning at the right edge, so the stream never breaks.
          q.x += fw + q.size * 2;
          wrapped = true;
        }
        if (wrapped) q.y = Math.random() * h;
        ctx.fillStyle = `rgba(255,255,255,${q.alpha.toFixed(2)})`;
        // Integer positions keep every square equally crisp (fractional coordinates blur some of them).
        ctx.fillRect(Math.round(q.x - q.size / 2), Math.round(q.y - q.size / 2), q.size, q.size);
      }
      ctx.restore();
    }

    _emitWake(x, count) {
      if (this._reduced || !this._ctx) return;
      const st = this._trailStyle;
      const cx = clamp(x, 4, this._w - 4);
      const base = st.count[0] + Math.random() * (st.count[1] - st.count[0]);
      const n = Math.max(3, Math.min(12, Math.round(base * count / 8)));
      for (let i = 0; i < n; i++) {
        if (this._wake.length >= 110) break;
        const angle = Math.random() * Math.PI * 2;
        const speed = st.speed[0] + Math.random() * (st.speed[1] - st.speed[0]);
        const ci = Math.floor(Math.random() * st.colors.length);
        const spin = (st.spin[0] + Math.random() * (st.spin[1] - st.spin[0])) * Math.PI / 180;
        this._wake.push({
          x: cx + (Math.random() - 0.5) * 6,
          y: this._h / 2 + (Math.random() - 0.5) * 11,
          vx: Math.cos(angle) * speed * (st.squashX || 1),
          vy: Math.sin(angle) * speed * (st.squashY || 1) - speed * (st.rise || 0) - (Math.random() - 0.5) * 18,
          age: 0,
          life: st.life[0] + Math.random() * (st.life[1] - st.life[0]),
          size: st.size[0] + Math.random() * (st.size[1] - st.size[0]),
          alpha: 0.5 + Math.random() * 0.35,
          rot: Math.random() * Math.PI * 2,
          spin,
          grow0: st.grow[0],
          grow1: st.grow[1],
          ci,
          color: st.colors[ci],
        });
      }
    }

    _addRing(x) {
      if (this._reduced) return;
      const st = this._trailStyle;
      if (!st.ring) return;
      this._rings.push({ x: clamp(x, 6, this._w - 6), age: 0, life: 0.24, color: st.ring, scale: st.ringScale || 1 });
      if (this._rings.length > 8) this._rings.shift();
    }

    _simulateWake(dt) {
      const st = this._trailStyle;
      const ws = this._wake;
      for (let i = ws.length - 1; i >= 0; i--) {
        const q = ws[i];
        q.age += dt;
        if (q.age >= q.life) { ws.splice(i, 1); continue; }
        q.vy += st.gravity * dt;
        q.vx *= 1 - st.drag * dt;
        q.vy *= 1 - st.drag * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.rot += q.spin * dt;
        q.spin *= 1 - st.drag * 0.15 * dt;
        if (q.y < 2 || q.y > this._h - 2) q.vy *= -0.55;
        if (q.x < 2 || q.x > this._w - 2) q.vx *= -0.5;
      }
      const rs = this._rings;
      for (let i = rs.length - 1; i >= 0; i--) {
        rs[i].age += dt;
        if (rs[i].age >= rs[i].life) rs.splice(i, 1);
      }
    }

    _drawRings(ctx) {
      for (let i = 0; i < this._rings.length; i++) {
        const r = this._rings[i];
        const k = r.age / r.life;
        const a = (1 - k) * 0.8;
        if (a <= 0.01) continue;
        const rad = (10 + 20 * (1 - Math.pow(1 - k, 3))) * (r.scale || 1);
        ctx.globalAlpha = a;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(r.x, this._h / 2, rad, Math.max(3, rad * 0.6), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    _drawWake(ctx) {
      for (let i = 0; i < this._wake.length; i++) {
        const q = this._wake[i];
        const k = q.age / q.life;
        const a = q.alpha * Math.min(1, k / 0.15) * Math.pow(1 - k, 1.1);
        if (a <= 0.01) continue;
        const sprite = this._wakeSprites[q.ci] || this._sprite;
        const grow = q.grow0 + (q.grow1 - q.grow0) * k;
        const s = (2.4 + q.size * 3.8) * grow * WAKE_SCALE;
        ctx.globalAlpha = a;
        ctx.save();
        ctx.translate(q.x, q.y);
        ctx.rotate(q.rot || 0);
        ctx.drawImage(sprite, -s / 2, -s / 2, s, s);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    _ensureLoop() {
      if (this._reduced || document.hidden) return;
      this._start();
    }

    _start() {
      if (this._raf) return;
      this._last = 0;
      this._raf = requestAnimationFrame(this._frame);
    }

    _stop() {
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = 0;
    }

    _frame(now) {
      if (!this._raf) return;
      this._raf = requestAnimationFrame(this._frame);
      if (!this._last) this._last = now;
      let dt = (now - this._last) / 1000;
      this._last = now;
      if (dt <= 0) return;
      if (dt > 0.05) dt = 0.05;
      this._time += dt;

      if (!this._dragging) {
        const k = 205, d = 21;
        this._vel += (this._targetP - this._p) * k * dt;
        this._vel *= Math.exp(-d * dt);
        this._p += this._vel * dt;
        if (Math.abs(this._targetP - this._p) < 0.0004 && Math.abs(this._vel) < 0.0015) {
          this._p = this._targetP;
          this._vel = 0;
        }
        this._p = clamp(this._p, 0, 1);

        if (!this._reduced) {
          this._overVel += -this._overPx * 320 * dt;
          this._overVel *= Math.exp(-24 * dt);
          this._overPx += this._overVel * dt;
          if (Math.abs(this._overPx) < 0.1 && Math.abs(this._overVel) < 0.5) {
            this._overPx = 0;
            this._overVel = 0;
          }
        } else {
          this._overPx = 0;
          this._overVel = 0;
        }
      }

      if (!this._reduced) {
        this._pulse *= Math.exp(-26 * dt);
        if (this._pulse < 0.001) this._pulse = 0;
      } else {
        this._pulse = 0;
      }

      if (this._effectStyle === 'aurora') {
        if (this._value === 3) {
          this._auroraReveal = Math.min(1, this._auroraReveal + dt / 1.8);
        } else {
          this._auroraReveal = Math.max(0, this._auroraReveal - dt / .35);
        }
      }
      this._layout();
      if (this._effectStyle === 'original') {
        this._simulateWake(dt);
        this._simulate(dt);
      }
      this._draw();
    }
  }

  window.customElements.define('reasoning-effort', ReasoningEffort);
})();
