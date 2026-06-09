/* ============================================
   AXIAL INSPECTION — main.js
   ============================================ */

(function () {
  'use strict';

  // ─── NAV SCROLL EFFECT ────────────────────────
  const nav = document.getElementById('nav');
  function onScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ─── MOBILE MENU ──────────────────────────────
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');

  hamburger.addEventListener('click', () => {
    const open = hamburger.classList.toggle('open');
    navLinks.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });

  navLinks.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      navLinks.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (navLinks.classList.contains('open') &&
        !nav.contains(e.target)) {
      hamburger.classList.remove('open');
      navLinks.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  });

  // ─── REVEAL ON SCROLL ─────────────────────────
  const revealEls = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  revealEls.forEach(el => revealObserver.observe(el));

  // ─── COUNTER ANIMATION ────────────────────────
  function animateCounter(el) {
    const target   = parseInt(el.dataset.target, 10);
    const duration = 1800;
    const start    = performance.now();

    function update(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease     = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = Math.round(ease * target);
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  const statsSection  = document.querySelector('.stats');
  const statNumbers   = document.querySelectorAll('.stats__number');
  let countersStarted = false;

  const statsObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !countersStarted) {
      countersStarted = true;
      statNumbers.forEach(animateCounter);
      statsObserver.disconnect();
    }
  }, { threshold: 0.4 });

  if (statsSection) statsObserver.observe(statsSection);

  // ─── CONTACT FORM ─────────────────────────────
  const form       = document.getElementById('contactForm');
  const submitBtn  = document.getElementById('submitBtn');
  const msgEl      = document.getElementById('formMessage');

  function setMessage(type, text) {
    msgEl.className = 'form-message ' + type;
    msgEl.textContent = text;
    msgEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function validateField(input) {
    const value = input.value.trim();
    if (input.required && !value) {
      input.classList.add('error');
      return false;
    }
    if (input.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      input.classList.add('error');
      return false;
    }
    input.classList.remove('error');
    return true;
  }

  form.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => {
      if (input.classList.contains('error')) validateField(input);
    });
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();

    // Validate all fields
    let valid = true;
    form.querySelectorAll('.form-input').forEach(input => {
      if (!validateField(input)) valid = false;
    });
    if (!valid) {
      setMessage('error-msg', 'Veuillez remplir tous les champs obligatoires correctement.');
      return;
    }

    // Gather data
    const data = {
      firstName: form.firstName.value.trim(),
      lastName:  form.lastName.value.trim(),
      email:     form.email.value.trim(),
      phone:     form.phone.value.trim(),
      company:   form.company.value.trim(),
      service:   form.service.value,
      message:   form.message.value.trim(),
    };

    // Update button state
    const btnText = submitBtn.querySelector('.btn-text');
    btnText.textContent = 'Envoi en cours…';
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });

      if (res.ok) {
        setMessage('success', 'Votre message a été envoyé avec succès. Nous vous contacterons dans les plus brefs délais.');
        form.reset();
      } else {
        const body = await res.json().catch(() => ({}));
        setMessage('error-msg', body.error || 'Une erreur est survenue. Veuillez réessayer.');
      }
    } catch {
      setMessage('error-msg', 'Impossible d\'envoyer le message. Vérifiez votre connexion et réessayez.');
    } finally {
      btnText.textContent = 'Envoyer le Message';
      submitBtn.disabled = false;
    }
  });

  // ─── SMOOTH SCROLL (fallback for browsers without CSS scroll-behavior) ─────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

})();
