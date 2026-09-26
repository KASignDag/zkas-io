const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('.site-nav');

menuButton?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});

document.querySelectorAll('.site-nav a').forEach(a => a.addEventListener('click', () => {
  nav.classList.remove('open');
  menuButton?.setAttribute('aria-expanded', 'false');
}));

const io = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      io.unobserve(entry.target);
    }
  }
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => io.observe(el));

document.querySelectorAll('[data-placeholder]').forEach(link => {
  link.addEventListener('click', event => {
    if (link.getAttribute('href') === '#') event.preventDefault();
  });
});

(function initDagHero() {
  const canvas = document.getElementById('dagCanvas');
  if (!canvas) return;

  const card = canvas.closest('.dag-card');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');
  const labels = ['0A','1B','2C','3D','4E','5F','6A','7C','8D','9E','AA','B1','C2','D3','E4','F5'];

  let width = 0;
  let height = 0;
  let dpr = 1;
  let nodes = [];
  let edges = [];
  let pulses = [];
  let raf = 0;
  let animationStart = performance.now();
  let paused = document.hidden;

  function rand(min, max) { return min + Math.random() * (max - min); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function getNodePosition(node, time) {
    const driftX = Math.sin(time * 0.0003 + node.phase) * node.drift;
    const driftY = Math.cos(time * 0.00023 + node.phase * 1.31) * node.drift * 0.75;
    return { x: node.x + driftX, y: node.y + driftY };
  }

  function createGraph() {
    nodes = [];
    edges = [];
    pulses = [];

    const cols = width > 560 ? 6 : 5;
    const colStep = (width - 120) / (cols - 1);
    let nodeIndex = 0;

    for (let c = 0; c < cols; c++) {
      const count = c === 0 || c === cols - 1 ? 4 : (width > 560 ? 5 + (c % 2) : 4 + (c % 2));
      const marginTop = 68;
      const usableHeight = height - 136;
      const rowStep = usableHeight / (count - 1);
      for (let r = 0; r < count; r++) {
        nodes.push({
          id: nodeIndex++,
          col: c,
          row: r,
          x: 60 + c * colStep + rand(-16, 16),
          y: marginTop + r * rowStep + rand(-18, 18),
          size: rand(28, 34),
          label: pick(labels),
          phase: rand(0, Math.PI * 2),
          drift: rand(3, 7)
        });
      }
    }

    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      const next = nodes.filter(n => n.col === a.col + 1);
      const nearby = next
        .map(n => ({ node: n, dist: Math.abs(n.row - a.row) + Math.abs(n.y - a.y) * 0.002 }))
        .sort((m, n) => m.dist - n.dist)
        .slice(0, 3 + (Math.random() > 0.7 ? 1 : 0));

      if (nearby[0]) edges.push({ from: a.id, to: nearby[0].node.id, weight: 1, activeBias: 0.9 });
      if (nearby[1] && Math.random() > 0.18) edges.push({ from: a.id, to: nearby[1].node.id, weight: 0.9, activeBias: 0.6 });
      if (nearby[2] && Math.random() > 0.45) edges.push({ from: a.id, to: nearby[2].node.id, weight: 0.75, activeBias: 0.35 });
    }

    // extra faint diagonals / mesh edges for richer privacy-network feel
    const extraAttempts = Math.floor(nodes.length * 1.1);
    for (let i = 0; i < extraAttempts; i++) {
      const from = pick(nodes.filter(n => n.col < cols - 2));
      const candidates = nodes.filter(n => n.col > from.col && n.col <= from.col + 2);
      const to = pick(candidates);
      if (to && !edges.some(e => e.from === from.id && e.to === to.id)) {
        edges.push({ from: from.id, to: to.id, weight: 0.45, activeBias: 0.12, ghost: true });
      }
    }

    const pulseCount = reduceMotion ? 0 : Math.max(7, Math.round(edges.length * 0.08));
    for (let i = 0; i < pulseCount; i++) spawnPulse(true);
  }

  function spawnPulse(initial = false) {
    const edge = pick(edges.filter(e => !e.ghost || Math.random() > 0.6));
    if (!edge) return;
    pulses.push({
      edge,
      progress: initial ? Math.random() : 0,
      speed: rand(0.18, 0.35),
      width: rand(2.4, 4.6),
      hue: Math.random() > 0.5 ? 'cyan' : 'violet',
      alpha: rand(0.45, 0.9)
    });
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(320, rect.width);
    height = Math.max(380, rect.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    createGraph();
    draw(performance.now(), true);
  }

  function draw(now, staticOnly = false) {
    ctx.clearRect(0, 0, width, height);

    // back glows
    const glow = ctx.createRadialGradient(width * 0.64, height * 0.45, 20, width * 0.64, height * 0.45, width * 0.48);
    glow.addColorStop(0, 'rgba(133, 235, 255, 0.10)');
    glow.addColorStop(0.42, 'rgba(133, 235, 255, 0.03)');
    glow.addColorStop(1, 'rgba(133, 235, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // subtle mesh lines
    for (const edge of edges) {
      const from = nodes.find(n => n.id === edge.from);
      const to = nodes.find(n => n.id === edge.to);
      const p1 = getNodePosition(from, now);
      const p2 = getNodePosition(to, now);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = edge.ghost ? 'rgba(161, 201, 255, 0.06)' : 'rgba(190, 225, 255, 0.14)';
      ctx.lineWidth = edge.ghost ? 0.8 : 1.1;
      ctx.stroke();
    }

    // pulses / active paths
    for (let i = pulses.length - 1; i >= 0; i--) {
      const pulse = pulses[i];
      if (!staticOnly && !paused) pulse.progress += pulse.speed * 0.010;
      if (pulse.progress > 1) {
        pulses.splice(i, 1);
        if (!reduceMotion) spawnPulse();
        continue;
      }
      const from = nodes.find(n => n.id === pulse.edge.from);
      const to = nodes.find(n => n.id === pulse.edge.to);
      const p1 = getNodePosition(from, now);
      const p2 = getNodePosition(to, now);
      const head = pulse.progress;
      const tail = Math.max(0, head - 0.22);
      const x1 = lerp(p1.x, p2.x, tail);
      const y1 = lerp(p1.y, p2.y, tail);
      const x2 = lerp(p1.x, p2.x, head);
      const y2 = lerp(p1.y, p2.y, head);
      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      if (pulse.hue === 'violet') {
        grad.addColorStop(0, `rgba(169, 145, 255, 0)`);
        grad.addColorStop(0.25, `rgba(169, 145, 255, ${pulse.alpha * 0.45})`);
        grad.addColorStop(1, `rgba(232, 215, 255, ${pulse.alpha})`);
      } else {
        grad.addColorStop(0, `rgba(102, 228, 255, 0)`);
        grad.addColorStop(0.25, `rgba(102, 228, 255, ${pulse.alpha * 0.55})`);
        grad.addColorStop(1, `rgba(220, 252, 255, ${pulse.alpha})`);
      }
      ctx.strokeStyle = grad;
      ctx.lineWidth = pulse.width;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.fillStyle = pulse.hue === 'violet' ? `rgba(233, 226, 255, ${pulse.alpha})` : `rgba(234, 255, 255, ${pulse.alpha})`;
      ctx.shadowColor = pulse.hue === 'violet' ? 'rgba(169, 145, 255, .85)' : 'rgba(102, 228, 255, .85)';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(x2, y2, pulse.width * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    const activeNodes = new Set();
    pulses.forEach(p => {
      activeNodes.add(p.edge.from);
      activeNodes.add(p.edge.to);
    });

    // nodes
    for (const node of nodes) {
      const p = getNodePosition(node, now);
      const size = node.size;
      const active = activeNodes.has(node.id);
      const x = p.x - size / 2;
      const y = p.y - size / 2;

      const fill = ctx.createLinearGradient(x, y, x + size, y + size);
      if (active) {
        fill.addColorStop(0, 'rgba(100, 230, 255, 0.96)');
        fill.addColorStop(1, 'rgba(110, 147, 255, 0.95)');
      } else {
        fill.addColorStop(0, 'rgba(26, 56, 78, 0.94)');
        fill.addColorStop(1, 'rgba(17, 34, 54, 0.88)');
      }

      ctx.shadowColor = active ? 'rgba(102, 228, 255, .36)' : 'rgba(0, 0, 0, .22)';
      ctx.shadowBlur = active ? 20 : 10;
      roundedRect(x, y, size, size, 8);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = active ? 'rgba(226, 248, 255, 0.55)' : 'rgba(185, 225, 255, 0.16)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = active ? 'rgba(245, 252, 255, 0.96)' : 'rgba(208, 237, 255, 0.72)';
      ctx.font = `700 ${Math.max(10, size * 0.33)}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label, p.x, p.y + 0.5);
    }

    // sprinkle tiny particles
    for (let i = 0; i < 28; i++) {
      const px = ((i * 53.17) % width) + Math.sin(now * 0.0002 + i) * 18;
      const py = ((i * 87.31) % height) + Math.cos(now * 0.00017 + i * 0.8) * 14;
      const a = 0.06 + (Math.sin(now * 0.001 + i) + 1) * 0.04;
      ctx.fillStyle = `rgba(190, 235, 255, ${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(px, py, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!staticOnly && !reduceMotion && !paused) raf = requestAnimationFrame(t => draw(t));
  }

  function start() {
    cancelAnimationFrame(raf);
    paused = false;
    draw(performance.now());
  }

  function stop() {
    paused = true;
    cancelAnimationFrame(raf);
    draw(performance.now(), true);
  }

  const ro = new ResizeObserver(() => resize());
  ro.observe(card);
  resize();

  document.addEventListener('visibilitychange', () => {
    paused = document.hidden;
    if (paused) stop(); else start();
  });

  const heroObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.target !== card) continue;
      if (entry.isIntersecting) start();
      else stop();
    }
  }, { threshold: 0.12 });
  heroObserver.observe(card);

  if (reduceMotion) stop();
  else start();
})();

// Wallet / exchanges guide tabs
(() => {
  const hub = document.querySelector('[data-wallet-hub]');
  if (!hub) return;
  const tabs = [...hub.querySelectorAll('[data-wallet-tab]')];
  const panels = [...hub.querySelectorAll('[data-wallet-panel]')];

  function activate(name) {
    tabs.forEach(tab => {
      const on = tab.dataset.walletTab === name;
      tab.classList.toggle('active', on);
      tab.setAttribute('aria-selected', String(on));
    });
    panels.forEach(panel => {
      const on = panel.dataset.walletPanel === name;
      panel.classList.toggle('active', on);
      panel.hidden = !on;
    });
  }

  tabs.forEach(tab => tab.addEventListener('click', () => activate(tab.dataset.walletTab)));
})();


// CounterAPI visitor counter, matching the counter used by ZKAS.stream.
// ZKAS.io keeps its own namespace so each site's total remains independent.
(async function updateSiteViewCounter() {
  const counter = document.getElementById('siteViewCount');
  if (!counter) return;

  try {
    const response = await fetch('https://counterapi.com/api/zkas.io/view/site-visitors?unique=true', {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) throw new Error(`Counter returned ${response.status}`);

    const data = await response.json();
    if (typeof data.value === 'number' && Number.isFinite(data.value)) {
      const displayedViews = 1000 + Math.max(0, data.value - 1);
      counter.textContent = new Intl.NumberFormat().format(displayedViews);
    } else {
      throw new Error('Counter response did not include a numeric value');
    }
  } catch (error) {
    console.warn('Site view counter unavailable:', error);
    counter.textContent = '—';
  }
})();
