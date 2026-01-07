// Script principal : carousel, formulaire (EmailJS) et petites interactions

document.addEventListener('DOMContentLoaded', () => {
  // Gestion de la langue
  let currentLang = localStorage.getItem('language') || 'en';
  
  function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('language', lang);
    
    document.querySelectorAll('[data-en][data-fr]').forEach(el => {
      el.textContent = lang === 'en' ? el.getAttribute('data-en') : el.getAttribute('data-fr');
    });
    
    // Mettre à jour le bouton de langue
    const langBtn = document.getElementById('lang-toggle');
    langBtn.textContent = lang === 'en' ? 'FR' : 'EN';
  }
  
  // Initialiser la langue par défaut
  setLanguage(currentLang);
  
  // Bouton de changement de langue
  document.getElementById('lang-toggle').addEventListener('click', () => {
    setLanguage(currentLang === 'en' ? 'fr' : 'en');
  });

  // année du footer
  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- CAROUSEL ---------- */
  const track = document.querySelector('.carousel-track');
  const slides = Array.from(track.querySelectorAll('.carousel-slide'));
  const prevBtn = document.querySelector('.carousel-btn.prev');
  const nextBtn = document.querySelector('.carousel-btn.next');
  const dotsWrap = document.querySelector('.carousel-dots');

  // si slides non trouvées, on en crée à partir des enfants (HTML fourni)
  if (slides.length) {
    let currentIndex = 0;

    function showSlide(index) {
      slides.forEach((s, i) => {
        s.classList.remove('active');
        s.style.display = i === index ? 'flex' : 'none';
        if (i === index) {
          setTimeout(() => s.classList.add('active'), 10);
        }
      });
      // état dots
      Array.from(dotsWrap.children).forEach((d, i) => d.classList.toggle('active', i === index));
      currentIndex = index;
    }

    // créer les dots
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'carousel-dot';
      dot.setAttribute('aria-label', 'Aller au projet ' + (i + 1));
      dot.addEventListener('click', () => showSlide(i));
      dotsWrap.appendChild(dot);
    });

    showSlide(0);

    prevBtn.addEventListener('click', () => showSlide((currentIndex - 1 + slides.length) % slides.length));
    nextBtn.addEventListener('click', () => showSlide((currentIndex + 1) % slides.length));

    // autoplay
    let autoplay = setInterval(() => nextBtn.click(), 6000);
    [prevBtn, nextBtn, dotsWrap].forEach(el => {
      el.addEventListener('mouseenter', () => clearInterval(autoplay));
      el.addEventListener('mouseleave', () => autoplay = setInterval(() => nextBtn.click(), 6000));
    });

    // Project details data
    const projectsData = {
      'project-1': {
        title: 'Serveur Mail',
        description: 'Mise en place et configuration d\'un serveur mail sécurisé pour une infrastructure réseau.',
        technologies: ['Postfix', 'Dovecot', 'SpamAssassin', 'OpenDKIM'],
        details: [
          'Configuration et déploiement d\'un serveur mail complet',
          'Implémentation des protocoles SMTP, POP3, IMAP sécurisés',
          'Mise en place de filtres anti-spam et anti-virus',
          'Configuration des enregistrements SPF, DKIM, DMARC'
        ],
        duration: '3 mois',
        role: 'Administrateur système',
        skills: ['Administration serveur', 'Sécurité mail', 'Configuration réseau', 'Troubleshooting']
      },
      'project-2': {
        title: 'Usurpation d\'identité DNS',
        description: 'Test de pénétration sur les vulnérabilités DNS et démonstration d\'attaques DNS spoofing.',
        technologies: ['Wireshark', 'dnsspoof', 'Metasploit', 'Python'],
        details: [
          'Analyse des vulnérabilités DNS dans un environnement de test',
          'Démonstration d\'attaques DNS spoofing et cache poisoning',
          'Création de stratégies de mitigation et de défense',
          'Documentation complète des risques et recommandations'
        ],
        duration: '2 mois',
        role: 'Pentester',
        skills: ['Pentesting', 'Analyse réseau', 'Sécurité DNS', 'Documentation']
      },
      'project-3': {
        title: 'Projet laboratoire',
        description: 'Création d\'un environnement de lab complet pour apprentissage en cybersécurité.',
        technologies: ['Vagrant', 'VirtualBox', 'Linux', 'Debian'],
        details: [
          'Configuration d\'un lab multi-machines avec Vagrant',
          'Implémentation d\'un réseau sécurisé avec firewall',
          'Déploiement de services vulnérables pour l\'apprentissage',
          'Documentation et guides d\'utilisation pour les étudiants'
        ],
        duration: '4 mois',
        role: 'DevOps / Formateur',
        skills: ['Infrastructure as Code', 'Virtualisation', 'Configuration Linux', 'Automation']
      }
    };

    // Modal functionality
    const modal = document.getElementById('project-modal');
    const modalClose = document.querySelector('.modal-close');
    const modalBody = document.getElementById('modal-body');

    slides.forEach(slide => {
      slide.addEventListener('click', () => {
        const projectId = slide.getAttribute('data-project');
        const projectData = projectsData[projectId];
        const slideImg = slide.querySelector('img').src;
        
        if (projectData) {
          modalBody.innerHTML = `
            <h3>${projectData.title}</h3>
            <img src="${slideImg}" alt="${projectData.title}" style="width:200px;height:auto;border-radius:8px;margin:1rem 0;display:block;">
            <p><strong>Description:</strong> ${projectData.description}</p>
            <p><strong>Durée:</strong> ${projectData.duration}</p>
            <p><strong>Rôle:</strong> ${projectData.role}</p>
            <p><strong>Technologies:</strong> ${projectData.technologies.join(', ')}</p>
            <h4 style="color: var(--accent); margin-top: 1.5rem;">Détails du projet:</h4>
            <ul>
              ${projectData.details.map(detail => `<li>${detail}</li>`).join('')}
            </ul>
            <h4 style="color: var(--accent); margin-top: 1.5rem;">Compétences acquises:</h4>
            <div style="display:flex;flex-wrap:wrap;gap:0.6rem;margin-top:0.75rem;">
              ${projectData.skills.map(skill => `<div style="background:rgba(230,126,48,0.12);color:var(--text);padding:0.4rem 0.6rem;border-radius:8px;border:1px solid rgba(230,126,48,0.2);display:inline-flex;align-items:center;justify-content:center;text-align:center;font-weight:500;font-size:0.85rem;white-space:nowrap;">${skill}</div>`).join('')}
            </div>
          `;
          modal.classList.add('active');
        }
      });
    });

    modalClose.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  }

  /* ---------- CONTACT FORM ---------- */
  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  const mailtoBtn = document.getElementById('mailto-fallback');

  // Mailto fallback : ouvre le client de l'utilisateur
  mailtoBtn.addEventListener('click', () => {
    const name = form.elements['from_name'].value || '';
    const email = form.elements['reply_to'].value || '';
    const subject = form.elements['subject'].value || 'Contact portfolio';
    const message = form.elements['message'].value || '';
    const body = encodeURIComponent(`De : ${name} <${email}>\n\n${message}`);
    window.location.href = `mailto:candice.briol@edu.igensia.com?subject=${encodeURIComponent(subject)}&body=${body}`;
  });

  // ----- Option A : EmailJS (client-side) -----
  // Instructions : crée un compte sur https://www.emailjs.com, crée un service (ex: gmail), un template,
  // puis remplace 'YOUR_USER_ID', 'YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID' ci-dessous.
  // Template doit accepter keys: from_name, reply_to, subject, message
  try {
    if (window.emailjs) {
      // Initialiser EmailJS avec l'User ID public
      emailjs.init('-Slnvf8wCFrUvj7HF');
    }
  } catch (e) {
    // ignore si pas de EmailJS
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    status.textContent = 'Envoi en cours…';
    const templateParams = {
      from_name: form.elements['from_name'].value,
      reply_to: form.elements['reply_to'].value,
      subject: form.elements['subject'].value || 'Contact via portfolio',
      message: form.elements['message'].value
    };

    // Si EmailJS est configuré correctement -> envoi via EmailJS
    if (window.emailjs && typeof emailjs.send === 'function' && emailjs.init) {
      // Envoyer avec les identifiants EmailJS configurés
      emailjs.send('service_6ol953w', 'template_dolomdt', templateParams)
        .then(() => {
          status.textContent = 'Merci ! Ton message a bien été envoyé.';
          form.reset();
        }, (err) => {
          console.error('EmailJS error', err);
          status.textContent = 'Erreur lors de l\'envoi via EmailJS. Essaie la méthode mailto ou configure Formspree.';
        });
      return;
    }

    // ----- Option B : Formspree (fetch) -----
    // Si tu préfères Formspree (ou Netlify Forms), inscris-toi et remplace l'URL ci-dessous par ton endpoint Formspree.
    // Exemple Formspree : 'https://formspree.io/f/{ID}'
    const FORMSPREE_ENDPOINT = ''; // mettre ton endpoint Formspree si tu veux
    if (FORMSPREE_ENDPOINT) {
      fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      }).then(response => {
        if (response.ok) {
          status.textContent = 'Merci ! Ton message a bien été envoyé.';
          form.reset();
        } else {
          return response.json().then(data => Promise.reject(data));
        }
      }).catch(err => {
        console.error('Formspree error', err);
        status.textContent = 'Erreur lors de l\'envoi. Essaie la méthode mailto ou vérifie la configuration.';
      });
      return;
    }

    // ----- Fallback : afficher message et proposer mailto -----
    status.innerHTML = 'Aucun service d\'envoi configuré. Utilise le bouton "Envoyer via mailto" ou configure EmailJS/Formspree dans script.js.';
  });

  /* ---------- NAV: smooth scroll ---------- */
  document.querySelectorAll('.main-nav a').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        document.querySelector(href).scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
});