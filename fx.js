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

  /* Réseau de nœuds dans le hero : réagit à la souris */
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
  const LINK = 140, REACH = 190;
  let w = 0, h = 0, nodes = [], raf = 0, visible = true;
  const mouse = { x: -9999, y: -9999 };

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = cv.clientWidth; h = cv.clientHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(110, Math.max(34, (w * h) / 14000)));
    nodes = Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - .5) * .28, vy: (Math.random() - .5) * .28,
      r: Math.random() * 1.4 + .6
    }));
    if (reduce) draw();
  }

  function draw() {
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
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
    }
  }

  function frame() {
    for (const p of nodes) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
    }
    draw();
    raf = visible ? requestAnimationFrame(frame) : 0;
  }

  hero.addEventListener('pointermove', e => {
    const r = cv.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });

  let t;
  addEventListener('resize', () => { clearTimeout(t); t = setTimeout(resize, 150); });
  resize();

  if (!reduce) {
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(frame);
    }).observe(hero);
    raf = requestAnimationFrame(frame);
  }
})();
