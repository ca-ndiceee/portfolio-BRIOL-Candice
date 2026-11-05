/* fx.js — animations du portfolio (réseau interactif, révélations, navigation active) */
(() => {
  document.documentElement.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* En-tête : fond opaque après un peu de scroll */
  const header = document.querySelector('.site-header');
  const onScroll = () => header && header.classList.toggle('scrolled', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Lien de navigation actif selon la section visible */
  const links = [...document.querySelectorAll('.main-nav a[href^="#"]')];
  const byId = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
  const navIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(l => l.classList.remove('active'));
      const link = byId.get(e.target.id);
      if (link) link.classList.add('active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  byId.forEach((_, id) => { const s = document.getElementById(id); if (s) navIO.observe(s); });

  /* Apparition progressive du contenu (légère, une seule fois) */
  const targets = document.querySelectorAll(
    '.section-standard h2, .section-subtitle, .projects-grid > *, .timeline-item, .reco, .hobby-card, .skills-boxes .skill-box, .hero-card, #about .horizontal-panel, .contact-form-wrapper'
  );
  if (reduce || !('IntersectionObserver' in window)) {
    document.querySelectorAll('.hero-card').forEach(el => el.classList.add('seen'));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        el.classList.add('in', 'seen');
        io.unobserve(el);
        // on retire les classes une fois fini pour ne pas ralentir les effets de survol
        setTimeout(() => el.classList.remove('reveal', 'in'), 1400);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(el => {
      const i = Math.min([...el.parentElement.children].indexOf(el), 8);
      el.style.setProperty('--i', i);
      el.classList.add('reveal');
      io.observe(el);
    });
  }

  /* Halo cuivré qui suit le curseur sur les cartes */
  document.addEventListener('pointermove', e => {
    const el = e.target.closest && e.target.closest('.project-card, .timeline-item .body, .reco');
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    el.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });

  /* ===== Fond interactif du hero : 4 scènes réseau / cyber, au choix ===== */
  const hero = document.getElementById('home');
  const cv = document.getElementById('netCanvas');
  if (!hero || !cv) return;
  const ctx = cv.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const C = {
    line: css.getPropertyValue('--net-line').trim() || '110,84,66',
    node: css.getPropertyValue('--net-node').trim() || '58,42,32',
    hot:  css.getPropertyValue('--net-hot').trim()  || '168,72,31'
  };
  const TAU = Math.PI * 2;
  const rnd = n => Math.floor(Math.random() * n);
  const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  const mouse = { x: -9999, y: -9999, on: false };
  let w = 0, h = 0, dpr = 1, raf = 0, last = 0, visible = true, scene = null, name = 'reseau';

  /* --- 1. Réseau : nœuds qui dérivent et se relient --- */
  function sceneReseau() {
    const LINK = 140, REACH = 190;
    let nodes = [];
    return {
      init() {
        const n = Math.round(Math.min(110, Math.max(34, (w * h) / 14000)));
        nodes = Array.from({ length: n }, () => ({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - .5) * .28, vy: (Math.random() - .5) * .28,
          r: Math.random() * 1.4 + .6
        }));
      },
      step() {
        for (const p of nodes) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
        }
      },
      draw() {
        ctx.clearRect(0, 0, w, h);
        ctx.lineWidth = 1;
        for (let i = 0; i < nodes.length; i++) {
          const a = nodes[i];
          for (let j = i + 1; j < nodes.length; j++) {
            const b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < LINK) {
              ctx.strokeStyle = `rgba(${C.line},${(1 - d / LINK) * .22})`;
              ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            }
          }
          const dm = Math.hypot(a.x - mouse.x, a.y - mouse.y);
          if (dm < REACH) {
            ctx.strokeStyle = `rgba(${C.hot},${(1 - dm / REACH) * .7})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
          }
          ctx.fillStyle = dm < REACH ? `rgba(${C.hot},.95)` : `rgba(${C.node},.5)`;
          ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, TAU); ctx.fill();
        }
      }
    };
  }

  /* --- 2. Paquets : une topologie de routeurs, les paquets suivent le plus court chemin.
         Ils convergent vers le nœud le plus proche du curseur ; un clic lance une rafale. --- */
  function scenePaquets() {
    let nodes = [], packets = [], spawnT = 0, burstT = 0, target = -1;

    function build() {
      const g = Math.max(110, Math.min(170, w / 9));
      const cols = Math.ceil(w / g) + 1, rows = Math.ceil(h / g) + 1;
      const ox = (w - (cols - 1) * g) / 2, oy = (h - (rows - 1) * g) / 2;
      nodes = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        nodes.push({ i: r * cols + c, r, c, adj: [], glow: 0,
          x: ox + c * g + (Math.random() - .5) * g * .45,
          y: oy + r * g + (Math.random() - .5) * g * .45 });
      }
      const at = (r, c) => (r >= 0 && c >= 0 && r < rows && c < cols) ? nodes[r * cols + c] : null;
      const link = (a, b) => { if (a && b && !a.adj.includes(b.i)) { a.adj.push(b.i); b.adj.push(a.i); } };
      for (const n of nodes) {
        link(n, at(n.r, n.c + 1)); link(n, at(n.r + 1, n.c));
        if (Math.random() < .35) link(n, at(n.r + 1, n.c + 1));
        if (Math.random() < .35) link(n, at(n.r + 1, n.c - 1));
      }
    }

    function route(a, b) {               // Dijkstra sur la distance
      const N = nodes.length, dist = Array(N).fill(Infinity), prev = Array(N).fill(-1), done = Array(N).fill(false);
      dist[a] = 0;
      for (let k = 0; k < N; k++) {
        let u = -1;
        for (let i = 0; i < N; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
        if (u < 0 || dist[u] === Infinity || u === b) break;
        done[u] = true;
        for (const v of nodes[u].adj) {
          const d = dist[u] + Math.hypot(nodes[u].x - nodes[v].x, nodes[u].y - nodes[v].y);
          if (d < dist[v]) { dist[v] = d; prev[v] = u; }
        }
      }
      const path = [];
      for (let u = b; u >= 0; u = prev[u]) path.push(u);
      path.reverse();
      return path[0] === a ? path : [];
    }

    function send(src, dst, hot) {
      if (src === dst || packets.length > 40) return;
      const path = route(src, dst);
      if (path.length < 2) return;
      packets.push({ path, k: 0, d: 0, hot, trail: [], x: nodes[src].x, y: nodes[src].y });
    }

    function nearest(x, y, max) {
      let best = -1, bd = max;
      nodes.forEach((n, i) => { const d = Math.hypot(n.x - x, n.y - y); if (d < bd) { bd = d; best = i; } });
      return best;
    }

    function farFrom(t) {
      for (let tries = 0; tries < 12; tries++) {
        const i = rnd(nodes.length);
        if (Math.hypot(nodes[i].x - nodes[t].x, nodes[i].y - nodes[t].y) > 260) return i;
      }
      return rnd(nodes.length);
    }

    return {
      init() { packets = []; build(); },
      click() { if (target >= 0) for (let i = 0; i < 7; i++) send(farFrom(target), target, true); },
      step(dt) {
        target = mouse.on ? nearest(mouse.x, mouse.y, 170) : -1;
        spawnT -= dt; burstT -= dt;
        if (target >= 0) {
          if (burstT <= 0) { send(farFrom(target), target, true); burstT = .2; }
        } else if (spawnT <= 0 && packets.length < 16) {
          send(rnd(nodes.length), rnd(nodes.length), false); spawnT = .45;
        }
        for (const n of nodes) n.glow = Math.max(0, n.glow - dt * 1.4);
        for (const p of packets) {
          const speed = p.hot ? 330 : 210;
          p.d += speed * dt;
          let a = nodes[p.path[p.k]], b = nodes[p.path[p.k + 1]], L = Math.hypot(b.x - a.x, b.y - a.y);
          while (p.d >= L && p.k < p.path.length - 1) {
            p.d -= L; p.k++; nodes[p.path[p.k]].glow = 1;
            if (p.k >= p.path.length - 1) break;
            a = nodes[p.path[p.k]]; b = nodes[p.path[p.k + 1]]; L = Math.hypot(b.x - a.x, b.y - a.y);
          }
          if (p.k >= p.path.length - 1) { p.done = true; continue; }
          const t = p.d / L;
          p.x = a.x + (b.x - a.x) * t; p.y = a.y + (b.y - a.y) * t;
          p.trail.push({ x: p.x, y: p.y });
          if (p.trail.length > 16) p.trail.shift();
        }
        packets = packets.filter(p => !p.done);
      },
      draw() {
        ctx.clearRect(0, 0, w, h);
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(${C.line},.14)`;
        ctx.beginPath();
        for (const n of nodes) for (const j of n.adj) if (j > n.i) { ctx.moveTo(n.x, n.y); ctx.lineTo(nodes[j].x, nodes[j].y); }
        ctx.stroke();
        for (const p of packets) {           // route restante du paquet
          ctx.strokeStyle = `rgba(${C.hot},${p.hot ? .3 : .16})`;
          ctx.beginPath(); ctx.moveTo(p.x, p.y);
          for (let i = p.k + 1; i < p.path.length; i++) ctx.lineTo(nodes[p.path[i]].x, nodes[p.path[i]].y);
          ctx.stroke();
        }
        for (const n of nodes) {
          ctx.fillStyle = `rgba(${C.node},.5)`;
          ctx.beginPath(); ctx.arc(n.x, n.y, 2.2, 0, TAU); ctx.fill();
          if (n.glow > 0) {
            ctx.strokeStyle = `rgba(${C.hot},${n.glow * .7})`;
            ctx.beginPath(); ctx.arc(n.x, n.y, 3 + (1 - n.glow) * 16, 0, TAU); ctx.stroke();
          }
        }
        for (const p of packets) {
          ctx.lineWidth = 1.6;
          for (let i = 1; i < p.trail.length; i++) {
            ctx.strokeStyle = `rgba(${p.hot ? C.hot : C.node},${(i / p.trail.length) * .6})`;
            ctx.beginPath(); ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y); ctx.lineTo(p.trail[i].x, p.trail[i].y); ctx.stroke();
          }
          ctx.fillStyle = `rgba(${p.hot ? C.hot : C.node},.95)`;
          ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, TAU); ctx.fill();
        }
        ctx.lineWidth = 1;
        if (target >= 0) {                   // cible verrouillée par le curseur
          const n = nodes[target];
          ctx.strokeStyle = `rgba(${C.hot},.8)`;
          ctx.beginPath(); ctx.arc(n.x, n.y, 9, 0, TAU); ctx.stroke();
          ctx.setLineDash([3, 4]);
          ctx.beginPath(); ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(n.x, n.y); ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    };
  }

  /* --- 3. Radar : scan de ports. Le radar suit le curseur et révèle des hôtes. --- */
  function sceneRadar() {
    const PORTS = [22, 53, 80, 443, 445, 3306, 3389, 8080];
    let hosts = [], ang = 0, cx = 0, cy = 0, R = 0;
    return {
      init() {
        cx = w * (w > 800 ? .68 : .5); cy = h * .48; R = Math.hypot(w, h) * .6;
        const n = Math.round(Math.min(46, Math.max(20, (w * h) / 22000)));
        // zones de texte du hero : on n'y place pas d'hôtes pour garder la lecture propre
        const cr = cv.getBoundingClientRect();
        const zones = [...hero.querySelectorAll('.hero-headline, .hero-ctas, .hero-socials')].map(el => {
          const r = el.getBoundingClientRect(), mx = 110, my = 28;  // marge large à gauche : l'étiquette s'étend vers la droite
          return { x1: r.left - cr.left - mx, y1: r.top - cr.top - my, x2: r.right - cr.left + 20, y2: r.bottom - cr.top + my };
        });
        const free = (x, y) => !zones.some(z => x > z.x1 && x < z.x2 && y > z.y1 && y < z.y2);
        hosts = Array.from({ length: n }, () => {
          let x, y, t = 0;
          do { x = Math.random() * w; y = Math.random() * h; } while (!free(x, y) && ++t < 30);
          return { x, y, lit: 0, vuln: Math.random() < .22,
            tag: `10.0.${rnd(8)}.${1 + rnd(250)}:${PORTS[rnd(PORTS.length)]}` };
        });
      },
      step(dt) {
        const gx = mouse.on ? mouse.x : w * (w > 800 ? .68 : .5), gy = mouse.on ? mouse.y : h * .48;
        cx += (gx - cx) * .04; cy += (gy - cy) * .04;
        const da = dt * .95; ang += da;
        for (const o of hosts) {
          const a = Math.atan2(o.y - cy, o.x - cx);
          const delta = (((ang - a) % TAU) + TAU) % TAU;
          if (delta < da) o.lit = 1;
          if (mouse.on && Math.hypot(o.x - mouse.x, o.y - mouse.y) < 50) o.lit = Math.max(o.lit, .9);
          o.lit = Math.max(0, o.lit - dt * .32);
        }
      },
      draw() {
        ctx.clearRect(0, 0, w, h);
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(${C.line},.14)`;
        for (let k = 1; k <= 6; k++) { ctx.beginPath(); ctx.arc(cx, cy, (R / 6) * k, 0, TAU); ctx.stroke(); }
        ctx.beginPath();
        ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R);
        ctx.stroke();
        for (let i = 0; i < 36; i++) {       // faisceau qui s'estompe derrière la ligne de balayage
          const a1 = ang - i * .03;
          ctx.fillStyle = `rgba(${C.hot},${(1 - i / 36) * .16})`;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a1 - .031, a1); ctx.closePath(); ctx.fill();
        }
        ctx.strokeStyle = `rgba(${C.hot},.7)`;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R); ctx.stroke();
        ctx.font = `11px ${MONO}`;
        for (const o of hosts) {
          const col = o.vuln ? C.hot : C.node;
          ctx.fillStyle = `rgba(${col},${.22 + o.lit * .75})`;
          ctx.beginPath(); ctx.arc(o.x, o.y, 2 + o.lit * 1.5, 0, TAU); ctx.fill();
          if (o.lit > .02) {
            ctx.strokeStyle = `rgba(${col},${o.lit * .8})`;
            ctx.beginPath(); ctx.arc(o.x, o.y, 4 + (1 - o.lit) * 14, 0, TAU); ctx.stroke();
          }
          if (o.lit > .3) { ctx.fillStyle = `rgba(${col},${o.lit * .85})`; ctx.fillText(o.tag, o.x + 9, o.y - 8); }
        }
      }
    };
  }

  /* --- 4. Hex : trame hexadécimale dormante. Elle se « déchiffre » autour du curseur,
         et des pings se propagent de temps en temps. --- */
  function sceneHex() {
    const CW = 18, CH = 24, HEX = '0123456789ABCDEF';
    let cols = 0, rows = 0, cells = [], pings = [], pingT = 0, skip = false;
    return {
      init() {
        cols = Math.ceil(w / CW) + 1; rows = Math.ceil(h / CH) + 1;
        cells = Array.from({ length: cols * rows }, () => ({ ch: HEX[rnd(16)], b: 0 }));
      },
      click() { pings.push({ x: mouse.x, y: mouse.y, r: 0 }); },
      step(dt) {
        pingT -= dt;
        if (pingT <= 0) { pings.push({ x: Math.random() * w, y: Math.random() * h, r: 0 }); pingT = 2.4 + Math.random() * 1.6; }
        const maxR = Math.hypot(w, h) * .55;
        for (const p of pings) p.r += dt * 340;
        pings = pings.filter(p => p.r < maxR);
        for (let i = 0; i < cells.length; i++) {
          const c = cells[i], x = (i % cols) * CW + CW / 2, y = Math.floor(i / cols) * CH + CH / 2;
          let t = 0;
          if (mouse.on) { const dm = Math.hypot(x - mouse.x, y - mouse.y); if (dm < 140) t = 1 - dm / 140; }
          for (const p of pings) { const d = Math.abs(Math.hypot(x - p.x, y - p.y) - p.r); if (d < 28) t = Math.max(t, (1 - d / 28) * .9); }
          c.b += (t - c.b) * .25;
          if (Math.random() < .003 + c.b * .35) c.ch = HEX[rnd(16)];
        }
      },
      draw() {
        skip = !skip; if (skip) return;      // un rendu sur deux : léger, et plus "terminal"
        ctx.clearRect(0, 0, w, h);
        ctx.font = `13px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let i = 0; i < cells.length; i++) {
          const c = cells[i], x = (i % cols) * CW + CW / 2, y = Math.floor(i / cols) * CH + CH / 2;
          ctx.fillStyle = c.b > .12 ? `rgba(${C.hot},${.1 + c.b * .85})` : `rgba(${C.line},${.1 + c.b * .5})`;
          ctx.fillText(c.ch, x, y);
        }
      }
    };
  }

  const scenes = { reseau: sceneReseau, paquets: scenePaquets, radar: sceneRadar, hex: sceneHex };
  const LABELS = { reseau: 'Réseau', paquets: 'Paquets', radar: 'Radar', hex: 'Hex' };

  /* --- boucle --- */
  function frame(ts) {
    const dt = Math.min(.05, (ts - last) / 1000 || .016); last = ts;
    scene.step(dt); scene.draw();
    raf = visible ? requestAnimationFrame(frame) : 0;
  }

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = cv.clientWidth; h = cv.clientHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (scene) { scene.init(); if (reduce) { scene.step(.016); scene.draw(); } }
  }

  /* --- sélecteur (provisoire : retire-le quand tu as choisi) --- */
  const picker = document.createElement('div');
  picker.className = 'fx-picker';
  picker.setAttribute('role', 'group');
  picker.setAttribute('aria-label', 'Fond animé');
  Object.keys(scenes).forEach(k => {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.fx = k; b.textContent = LABELS[k];
    b.addEventListener('click', () => select(k));
    picker.appendChild(b);
  });
  hero.appendChild(picker);

  function select(n) {
    name = n;
    try { localStorage.setItem('fx', n); } catch (e) {}
    picker.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.fx === n)));
    scene = scenes[n]();
    scene.init();
    if (reduce) { scene.step(.016); scene.draw(); }
  }

  hero.addEventListener('pointermove', e => {
    const r = cv.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; mouse.on = false; });
  hero.addEventListener('pointerdown', e => {
    if (e.target.closest('a, button')) return;
    const r = cv.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true;
    if (scene && scene.click) scene.click();
  });

  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });

  let start = 'reseau';
  try {
    const q = new URLSearchParams(location.search).get('fx'), saved = localStorage.getItem('fx');
    start = scenes[q] ? q : (scenes[saved] ? saved : 'reseau');
  } catch (e) {}
  resize();
  select(start);

  if (!reduce) {
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    }).observe(hero);
    raf = requestAnimationFrame(frame);
  }
})();
