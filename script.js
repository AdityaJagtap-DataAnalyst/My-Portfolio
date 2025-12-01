/* script.js
   Improved: hamburger toggle, sticky nav, scrollspy, smooth scroll,
   plus robust projects carousel + filters + preview button behavior.
*/

(function () {
  /* ========== NAV / MENU / SCROLLSPY ========== */
  const desktopNav = document.getElementById('desktop-nav');
  const hamburgerNav = document.getElementById('hamburger-nav');

  function setScrolledState(on) {
    if (desktopNav) desktopNav.classList.toggle('scrolled', on);
    if (hamburgerNav) hamburgerNav.classList.toggle('scrolled', on);
  }

  function handleScrollBg() {
    const y = window.scrollY || window.pageYOffset;
    setScrolledState(y > 20);
  }

  // toggle mobile menu; if 'force' boolean provided it sets open/closed explicitly
  window.toggleMenu = function (force) {
    if (!hamburgerNav) return;
    const menu = hamburgerNav.querySelector('.menu-links');
    if (typeof force === 'boolean') {
      hamburgerNav.classList.toggle('open', force);
      if (menu) menu.setAttribute('aria-hidden', String(!force));
      return;
    }
    const nowOpen = hamburgerNav.classList.toggle('open');
    if (menu) menu.setAttribute('aria-hidden', String(!nowOpen));
  };

  // gather nav anchors from desktop + mobile lists
  const navAnchors = Array.from(document.querySelectorAll('.nav-links a, .menu-links a')).filter(Boolean);

  // read nav height from CSS var or default
  function getNavHeight() {
    const val = getComputedStyle(document.documentElement).getPropertyValue('--nav-height') || '78px';
    return parseInt(val, 10) || 78;
  }

  // smooth scroll that accounts for sticky nav height
  function smoothScrollTo(targetEl) {
    if (!targetEl) return;
    const navH = getNavHeight();
    const rect = targetEl.getBoundingClientRect();
    const targetY = rect.top + window.scrollY - navH - 10; // small gap
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  }

  // wire up nav links for smooth scroll and close mobile menu
  navAnchors.forEach(a => {
    a.addEventListener('click', function (e) {
      const href = this.getAttribute('href') || '';
      if (!href.startsWith('#')) return; // external or anchorless: keep default
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();

      // close mobile menu when navigating
      if (hamburgerNav && hamburgerNav.classList.contains('open')) toggleMenu(false);
      smoothScrollTo(target);
    });
  });

  // build sections array used by scrollspy
  const sections = navAnchors.map(a => {
    const href = a.getAttribute('href');
    if (!href || !href.startsWith('#')) return null;
    const sec = document.querySelector(href);
    return sec ? { link: a, section: sec } : null;
  }).filter(Boolean);

  function updateActiveLink() {
    const navH = getNavHeight();
    const scrollPos = window.scrollY + navH + 12;
    let found = null;
    for (let i = 0; i < sections.length; i++) {
      const sTop = sections[i].section.offsetTop;
      const sBottom = sTop + sections[i].section.offsetHeight;
      if (scrollPos >= sTop && scrollPos < sBottom) {
        found = sections[i].link;
        break;
      }
    }
    // if scrolled to bottom, mark last
    if (!found && window.scrollY + window.innerHeight >= document.body.scrollHeight - 10) {
      found = sections[sections.length - 1] && sections[sections.length - 1].link;
    }
    navAnchors.forEach(a => a.classList.remove('active'));
    if (found) found.classList.add('active');
  }

  // throttle scroll handling with rAF
  let ticking = false;
  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        handleScrollBg();
        updateActiveLink();
        ticking = false;
      });
      ticking = true;
    }
  }

  // initial states
  handleScrollBg();
  updateActiveLink();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => updateActiveLink());

})();

/* ========== PROJECTS CAROUSEL & FILTERS ========== */
document.addEventListener('DOMContentLoaded', function () {
  const track = document.querySelector('.carousel-track');
  const prevBtn = document.querySelector('.carousel-btn.prev');
  const nextBtn = document.querySelector('.carousel-btn.next');
  const filterButtons = Array.from(document.querySelectorAll('.filter-btn'));
  const projectCountNode = document.getElementById('projectCount');

  if (!track) return;

  // Helper - read currently visible project cards
  function getVisibleCards() {
    return Array.from(track.children).filter(card => {
      // hidden style can be applied inline (display: none)
      const st = window.getComputedStyle(card);
      return st.display !== 'none' && st.visibility !== 'hidden';
    });
  }

  // State
  let idx = 0;
  let visibleCards = getVisibleCards();
  let gap = 18;
  function computeCardWidth() {
    visibleCards = getVisibleCards();
    if (visibleCards.length === 0) return 360;
    // get bounding from the first visible card
    const w = visibleCards[0].getBoundingClientRect().width;
    return Math.round(w + gap);
  }
  let cardWidth = computeCardWidth();

  // Update carousel transform & controls
  function updateCarousel() {
    // recalc cardWidth (in case layout changed)
    cardWidth = computeCardWidth();
    // clamp idx so we don't go past last card
    const maxIndex = Math.max(0, visibleCards.length - 1);
    idx = Math.min(Math.max(0, idx), maxIndex);
    track.style.transform = `translateX(${-idx * cardWidth}px)`;
    // update prev/next disabled states (if present)
    if (prevBtn) prevBtn.disabled = (idx === 0);
    if (nextBtn) nextBtn.disabled = (idx >= maxIndex);
  }

  // initial update
  updateCarousel();

  // handle window resize (recompute sizes)
  window.addEventListener('resize', () => {
    // small debounce pattern using rAF
    window.requestAnimationFrame(() => {
      updateCarousel();
    });
  });

  // prev/next wiring
  if (prevBtn) {
    prevBtn.innerHTML = '&#10094;'; // left arrow
    prevBtn.addEventListener('click', () => {
      idx = Math.max(0, idx - 1);
      updateCarousel();
    });
  }
  if (nextBtn) {
    nextBtn.innerHTML = '&#10095;'; // right arrow
    nextBtn.addEventListener('click', () => {
      const maxIndex = Math.max(0, getVisibleCards().length - 1);
      idx = Math.min(maxIndex, idx + 1);
      updateCarousel();
    });
  }

  // filter buttons: show/hide project cards and update count + reset carousel
  filterButtons.forEach(btn => {
    btn.addEventListener('click', function () {
      filterButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      const tool = this.getAttribute('data-tool');
      const projects = Array.from(document.querySelectorAll('.proj-card'));
      projects.forEach(p => {
        const tools = (p.getAttribute('data-tools') || '').toLowerCase();
        if (tool === 'all' || tools.includes(tool)) {
          p.style.display = ''; // show
        } else {
          p.style.display = 'none'; // hide
        }
      });

      // update project count text (pluralize)
      const visible = getVisibleCards().length;
      if (projectCountNode) projectCountNode.textContent = `${visible} project${visible !== 1 ? 's' : ''}`;

      // reset carousel to start
      idx = 0;
      updateCarousel();
    });
  });

  // Preview buttons: open href if present, otherwise show alert
  document.querySelectorAll('.preview-btn').forEach(btn => {
    btn.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href && href.trim() && href !== '#') {
        e.preventDefault();
        window.open(href, '_blank', 'noopener');
      } else {
        e.preventDefault();
        alert('Preview not configured — open the project link to view the dashboard.');
      }
    });
  });

  // If you want keyboard support (left/right) when carousel has focus:
  const viewport = document.querySelector('.carousel-viewport');
  if (viewport) {
    viewport.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowLeft') { ev.preventDefault(); if (prevBtn) prevBtn.click(); }
      if (ev.key === 'ArrowRight') { ev.preventDefault(); if (nextBtn) nextBtn.click(); }
    });
  }

  // When DOM or visibility changes (e.g. filters), ensure we recalc sizes.
  // MutationObserver watches for inline style changes on children (display:block/none)
  const mo = new MutationObserver(() => {
    window.requestAnimationFrame(updateCarousel);
  });
  mo.observe(track, { childList: true, attributes: true, subtree: false, attributeFilter: ['style', 'class'] });
});
