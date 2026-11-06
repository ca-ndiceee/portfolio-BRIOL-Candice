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
    '.section-standard h2, .section-subtitle, .projects-grid > *, .timeline-item, .reco, .hobby-card, .skills-boxes .skill-box, #about .horizontal-panel, .contact-form-wrapper'
  );
  if (!reduce && 'IntersectionObserver' in window) {
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

  /* ===== Présentation : défilement horizontal épinglé =====
     La page défile verticalement, la section se fige, le contenu glisse vers la gauche,
     puis le défilement vertical reprend à la section suivante. */
  const hs = document.querySelector('[data-hscroll]');
  if (hs && !reduce) {
    const track = hs.querySelector('.hscroll-track');
    const panels = [...track.children];
    let dist = 0, ticking = false;
    hs.classList.add('hscroll-on');
    panels.forEach(p => { const v = p.querySelector('[data-count]'); if (v) v.textContent = '0%'; });

    const countUp = el => {
      if (!el) return;
      const to = +el.dataset.count, t0 = performance.now();
      (function tick(now) {
        const k = Math.min(1, (now - t0) / 1000), e = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(to * e) + '%';
        if (k < 1) requestAnimationFrame(tick);
      })(t0);
    };

    function update() {
      ticking = false;
      const top = hs.getBoundingClientRect().top;
      const p = dist ? Math.min(1, Math.max(0, -top / dist)) : 0;
      track.style.transform = `translate3d(${-p * dist}px,0,0)`;
      if (top > innerHeight * .5) return;           // la section n'est pas encore à l'écran
      panels.forEach(el => {
        if (el.classList.contains('active')) return;
        const b = el.getBoundingClientRect();
        if (b.left < innerWidth * .72 && b.right > innerWidth * .28) {
          el.classList.add('active');
          countUp(el.querySelector('[data-count]'));
        }
      });
    }
    function measure() {
      dist = Math.max(0, track.offsetWidth - innerWidth);
      hs.style.height = (innerHeight + dist) + 'px';  // distance de défilement = largeur à parcourir
      update();
    }
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    let mt; addEventListener('resize', () => { clearTimeout(mt); mt = setTimeout(measure, 120); });
    addEventListener('load', measure);
    measure();
  }

  /* ===== Fond du hero : paquets routés sur une topologie réseau ===== */
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
  const mouse = { x: -9999, y: -9999, on: false };
  let w = 0, h = 0, raf = 0, last = 0, visible = true;

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

  const scene = scenePaquets();

  function frame(ts) {
    const dt = Math.min(.05, (ts - last) / 1000 || .016); last = ts;
    scene.step(dt); scene.draw();
    raf = visible ? requestAnimationFrame(frame) : 0;
  }
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = cv.clientWidth; h = cv.clientHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scene.init();
    if (reduce) { scene.step(.016); scene.draw(); }
  }

  hero.addEventListener('pointermove', e => {
    const r = cv.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; mouse.on = false; });
  hero.addEventListener('pointerdown', e => {            // un clic lance une rafale de paquets
    if (e.target.closest('a, button')) return;
    const r = cv.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true;
    scene.click();
  });
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
  resize();

  if (!reduce) {
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    }).observe(hero);
    raf = requestAnimationFrame(frame);
  }
})();
