/* Complete Portfolio JavaScript - script-clean.js */

// Formspree endpoint provided by user
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xkogdrjd';

document.addEventListener('DOMContentLoaded', () => {
  // Language management
  let currentLang = localStorage.getItem('language') || 'fr';
  
  const langToggle = document.getElementById('lang-toggle');
  
  function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('language', lang);
    
    document.querySelectorAll('[data-en][data-fr]').forEach(el => {
      el.textContent = lang === 'en' ? el.getAttribute('data-en') : el.getAttribute('data-fr');
    });
    
    document.querySelectorAll('[data-en-placeholder][data-fr-placeholder]').forEach(el => {
      el.placeholder = lang === 'en' ? el.getAttribute('data-en-placeholder') : el.getAttribute('data-fr-placeholder');
    });
    
    if (langToggle) {
      langToggle.textContent = lang === 'en' ? 'FR' : 'EN';
    }
  }
  
  setLanguage(currentLang);
  
  if (langToggle) {
    langToggle.addEventListener('click', () => {
      setLanguage(currentLang === 'en' ? 'fr' : 'en');
    });
  }

  // Update year in footer
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Scroll progress indicator
  const scrollProgress = document.getElementById('scrollProgress');
  if (scrollProgress) {
    window.addEventListener('scroll', () => {
      const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      scrollProgress.style.height = `${scrollPercent}%`;
    });
  }

  // ---------- INDEPENDENT POPUP MODALS ----------
  const popupTemplate = document.getElementById('popupTemplate');

  function getPopupContent(el) {
    return {
      title: currentLang === 'en' ? el.getAttribute('data-en-popup-title') || '' : el.getAttribute('data-fr-popup-title') || '',
      text: currentLang === 'en' ? el.getAttribute('data-en-popup-text') || '' : el.getAttribute('data-fr-popup-text') || ''
    };
  }

  function createPopup(modalId, title, text, element) {
    const clone = popupTemplate.content.cloneNode(true);
    const modal = clone.querySelector('.popup-modal');
    const popupTitle = clone.querySelector('.popup-title');
    const popupContent = clone.querySelector('.popup-content');
    const closeBtn = clone.querySelector('.popup-close');

    // Replace ID placeholders - template uses {{id}}
    modal.querySelectorAll('[id]').forEach(el => {
      el.id = el.id.replace(/\{\{id\}\}/g, modalId);
    });
    const ariaEl = modal.querySelector('[aria-labelledby]');
    if (ariaEl) ariaEl.setAttribute('aria-labelledby', `popup-title-${modalId}`);

    popupTitle.textContent = title;

    const popupCard = clone.querySelector('.popup-card');
    const isMarlink = element.getAttribute('data-en-popup-title') && element.getAttribute('data-en-popup-title').includes('Marlink');
    const isFortinet = element.getAttribute('data-en-popup-title') && element.getAttribute('data-en-popup-title').includes('Certification');
    
    if (isMarlink) {
      // Logo top-right
      const logo = document.createElement('img');
      logo.src = './Malrink-logo-1440x321.png';
      logo.alt = 'Marlink';
      logo.className = 'popup-logo';
      popupCard.appendChild(logo);
      
      // Language-specific schema
      const schemaSrc = currentLang === 'en' ? './task-schema.png' : './schema-tache.png';
      popupContent.innerHTML = `<div class="popup-mindmap"><img src="${schemaSrc}" alt="Task Schema"></div>`;

    } else if (isFortinet) {
      // Logo top-right
      const logo = document.createElement('img');
      logo.src = './NSE3-Certification.png';
      logo.alt = 'certification';
      logo.className = 'popup-logo';
      popupCard.appendChild(logo);
      
      // Show text content for Fortinet certification
      popupContent.innerHTML = text.replace(/\n/g, '<br>');
    } else {
      popupContent.innerHTML = text.replace(/\n/g, '<br>');
    }

    // Event handlers
    closeBtn.onclick = () => closeSpecificPopup(modalId);
    modal.querySelector('.popup-backdrop').onclick = () => closeSpecificPopup(modalId);

    document.body.appendChild(clone);
    document.body.classList.add('modal-open');

    // Open animation
    requestAnimationFrame(() => modal.classList.add('open'));

    return modal;
  }

  const openModals = new Set();

  function closeSpecificPopup(modalId) {
    const titleEl = document.getElementById(`popup-title-${modalId}`);
    const modal = titleEl ? titleEl.closest('.popup-modal') : null;
    if (modal) {
      modal.classList.remove('open');
      setTimeout(() => {
        if (modal.parentNode) modal.remove();
        if (document.body.classList.contains('modal-open') && openModals.size === 1) {
          document.body.classList.remove('modal-open');
        }
        openModals.delete(modalId);
      }, 400);
    }
  }

  // Global Escape handler for all modals (closes topmost)
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && openModals.size > 0) {
      const modalArray = Array.from(openModals);
      closeSpecificPopup(modalArray[modalArray.length - 1]);
    }
  });

  // Event listeners for popups - create independent modals
  document.querySelectorAll('.project-card, .timeline-item').forEach((element, index) => {
    element.style.cursor = 'pointer';
    element.addEventListener('click', (e) => {
      e.stopPropagation();
      const { title, text } = getPopupContent(element);
      if (title || text) {
        const modalId = `popup-${Date.now()}-${index}`;
        openModals.add(modalId);
        createPopup(modalId, title, text, element);
      }
    });
  });

  // ---------- CONTACT FORM - FORMSPREE ----------
  const contactForm = document.getElementById('contact-form');
  const formStatus = document.getElementById('form-status');
  
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (formStatus) {
        formStatus.textContent = currentLang === 'en' ? 'Sending...' : 'Envoi en cours…';
      }
      
      const formData = new FormData(contactForm);
      
      try {
        const response = await fetch(FORMSPREE_ENDPOINT, {
          method: 'POST',
          body: formData,
          headers: { 
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          if (formStatus) {
            formStatus.textContent = currentLang === 'en' ? 
              '✅ Thank you! Your message has been sent.' : 
              '✅ Merci ! Ton message a bien été envoyé.';
            formStatus.style.color = '#43e97b';
          }
          contactForm.reset();
        } else {
          const data = await response.json();
          throw new Error(data.error || (currentLang === 'en' ? 'Send error' : 'Erreur envoi'));
        }
      } catch (err) {
        console.error('Formspree error:', err);
        if (formStatus) {
          formStatus.textContent = currentLang === 'en' ? 
            '❌ Send error. Please try again or contact directly.' : 
            '❌ Erreur lors de l\'envoi. Essaie à nouveau ou contacte directement.';
          formStatus.style.color = '#f5576c';
        }
      }
    });
  }
});
