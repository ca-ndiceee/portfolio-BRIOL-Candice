/* marlink-schema.js — schéma interactif des tâches réalisées chez Marlink (FR / EN)
   Appelé par script.js : window.renderMarlinkSchema(conteneur, 'fr' | 'en') */
(() => {
  const TARGET = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>';

  const DATA = {
    fr: {
      root: 'Tâches réalisées',
      label: 'Catégories de tâches',
      cats: [
        { title: 'Inspection réseau', kind: 'cards', items: [
          "Mise en place et configuration de l'inspection approfondie des paquets (DPI) sur des équipements FortiGate",
          "Analyse de son impact sur les performances matérielles" ] },
        { title: 'Gestion des vulnérabilités', kind: 'steps',
          lead: 'Réalisation et exploitation de scans de vulnérabilités Qualys', items: [
          "Scans via le Qualys Cloud Agent",
          "Scans authentifiés pour une meilleure visibilité sur les vulnérabilités des systèmes" ] },
        { title: 'Contrôle qualité & analyse', kind: 'chips',
          lead: 'Contrôle qualité et vérification des rapports UTM', items: [
          'Analyse', 'Cohérence', 'Complétude', 'Suivi des anomalies détectées' ] },
        { title: 'Recherche & veille du marché', kind: 'cards', items: [
          "Étude de marché des solutions logicielles de cartographie réseau disponibles" ] },
        { title: 'Cybersécurité défensive', kind: 'cards', items: [
          "Déploiement d'un honeypot Linux (Pentbox)" ] }
      ]
    },
    en: {
      root: 'Completed tasks',
      label: 'Task categories',
      cats: [
        { title: 'Network inspection', kind: 'cards', items: [
          'Implementation and configuration of Deep Packet Inspection (DPI) on FortiGate devices',
          'Analysis of its impact on hardware performance' ] },
        { title: 'Vulnerability management', kind: 'steps',
          lead: 'Performing and leveraging Qualys vulnerability scans', items: [
          'Scans using the Qualys Cloud Agent',
          'Authenticated scans for deeper visibility into system vulnerabilities' ] },
        { title: 'Quality control & analysis', kind: 'chips',
          lead: 'Quality control and verification of UTM reports', items: [
          'Analysis', 'Consistency', 'Completeness', 'Tracking of detected anomalies' ] },
        { title: 'Research & market intelligence', kind: 'cards', items: [
          'Conducting a market study of available network mapping software solutions' ] },
        { title: 'Defensive cybersecurity', kind: 'cards', items: [
          'Deployment of a Linux honeypot (Pentbox)' ] }
      ]
    }
  };

  let uid = 0;

  function panelHTML(c, i) {
    const head = `<div class="ms-phead ms-enter" style="--i:0"><span class="ms-pnum">${i + 1}</span><h4 class="ms-ptitle">${c.title}</h4></div>`;
    const lead = c.lead ? `<div class="ms-lead ms-enter" style="--i:1">${c.lead}</div>` : '';
    const base = c.lead ? 2 : 1;
    if (c.kind === 'chips') {
      return head + lead + `<ul class="ms-items ms-items--chips">${
        c.items.map((t, k) => `<li class="ms-chip ms-enter" style="--i:${base + k}">${t}</li>`).join('')}</ul>`;
    }
    return head + lead + `<ul class="ms-items">${
      c.items.map((t, k) => `<li class="ms-leaf ms-enter" style="--i:${base + k}">${
        c.kind === 'steps' ? `<span class="ms-badge">${k + 1}</span>` : '<span class="ms-dot"></span>'}<span>${t}</span></li>`).join('')}</ul>`;
  }

  window.renderMarlinkSchema = function (container, lang) {
    const d = DATA[lang] || DATA.fr;
    const id = ++uid;
    container.innerHTML = `
      <div class="ms">
        <div class="ms-root">${TARGET}<span>${d.root}</span></div>
        <div class="ms-rail" role="tablist" aria-label="${d.label}">${
          d.cats.map((c, i) => `<button type="button" class="ms-node" role="tab" data-i="${i}" id="ms-${id}-tab-${i}" aria-controls="ms-${id}-panel" aria-selected="false" tabindex="-1"><span class="ms-num">${i + 1}</span><span class="ms-title">${c.title}</span></button>`).join('')}</div>
        <div class="ms-panel" id="ms-${id}-panel" role="tabpanel" tabindex="0"></div>
      </div>`;

    const rail = container.querySelector('.ms-rail');
    const panel = container.querySelector('.ms-panel');
    const tabs = [...rail.querySelectorAll('.ms-node')];
    let current = -1;

    function select(i, focus) {
      if (i === current) { if (focus) tabs[i].focus(); return; }
      current = i;
      tabs.forEach((t, k) => {
        t.setAttribute('aria-selected', String(k === i));
        t.tabIndex = k === i ? 0 : -1;
      });
      panel.setAttribute('aria-labelledby', tabs[i].id);
      panel.innerHTML = panelHTML(d.cats[i], i);
      if (focus) tabs[i].focus();
    }

    rail.addEventListener('click', e => {
      const b = e.target.closest('.ms-node');
      if (b) select(+b.dataset.i);
    });
    rail.addEventListener('keydown', e => {
      const n = tabs.length;
      let k = current;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') k = (current + 1) % n;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') k = (current + n - 1) % n;
      else if (e.key === 'Home') k = 0;
      else if (e.key === 'End') k = n - 1;
      else return;
      e.preventDefault();
      select(k, true);
    });

    select(0);
  };
})();
