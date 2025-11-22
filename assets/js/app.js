// app.js – Interaktivität (Karussell, Formular, Footer-Jahr)
(function () {
  const carousel = document.querySelector('.carousel');
  const track = document.getElementById('track');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  const dotsEl  = document.getElementById('dots');
  const logicalSlides = track ? Array.from(track.children) : [];
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!carousel || !track || logicalSlides.length === 0) return;

  const hasMultipleSlides = logicalSlides.length > 1;

  if (hasMultipleSlides) {
    const firstClone = logicalSlides[0].cloneNode(true);
    const lastClone = logicalSlides[logicalSlides.length - 1].cloneNode(true);
    track.appendChild(firstClone);
    track.insertBefore(lastClone, track.firstChild);
  }

  carousel.classList.add('is-enhanced');

  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });

  let index = hasMultipleSlides ? 1 : 0;
  let autoPlayId = null;
  let slideWidth = 0;
  let resizeObserver = null;
  const animationsEnabled = !prefersReduced;

  function computeWidth() {
    const referenceSlide = logicalSlides[0];
    const measured = referenceSlide ? referenceSlide.getBoundingClientRect().width : carousel.clientWidth;
    slideWidth = measured || carousel.clientWidth;
  }

  function renderDots() {
    if (!dotsEl) return;
    dotsEl.innerHTML = '';
    logicalSlides.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Gehe zu Folie ${i + 1}`);
      b.setAttribute('aria-current', i === 0);
      b.addEventListener('click', () => goToLogical(i));
      dotsEl.appendChild(b);
    });
  }

  function updateDots(activeIndex = normalize(index)) {
    if (!dotsEl) return;
    [...dotsEl.children].forEach((d, di) => d.setAttribute('aria-current', di === activeIndex));
  }

  function goToLogical(targetIndex, options) {
    if (!logicalSlides.length) return;
    const offset = hasMultipleSlides ? 1 : 0;
    go(targetIndex + offset, options);
  }

  function normalize(rawIndex) {
    if (!hasMultipleSlides) return 0;
    if (rawIndex <= 0) return logicalSlides.length - 1;
    if (rawIndex >= logicalSlides.length + 1) return 0;
    return rawIndex - 1;
  }

  function applySlideState(nextIndex, prevIndex, animate) {
    const prevSlide = logicalSlides[prevIndex];
    const nextSlide = logicalSlides[nextIndex];

    logicalSlides.forEach((slide, idx) => {
      if (idx !== nextIndex) {
        slide.classList.remove('is-active', 'is-entering');
      }
      slide.classList.remove('is-leaving');
    });

    if (!animate || !animationsEnabled || prevIndex === nextIndex) {
      logicalSlides.forEach((slide, idx) => {
        slide.classList.remove('is-entering', 'is-leaving');
        if (idx === nextIndex) slide.classList.add('is-active');
      });
      return;
    }

    if (prevSlide) {
      prevSlide.classList.remove('is-active', 'is-entering');
      prevSlide.classList.add('is-leaving');
      prevSlide.addEventListener('animationend', () => {
        prevSlide.classList.remove('is-leaving');
      }, { once: true });
    }

    if (nextSlide) {
      nextSlide.classList.remove('is-leaving');
      nextSlide.classList.add('is-active', 'is-entering');
      nextSlide.addEventListener('animationend', () => {
        nextSlide.classList.remove('is-entering');
      }, { once: true });
    }
  }

  function setTrackPosition(rawIndex, animate) {
    if (!hasMultipleSlides) {
      track.style.transform = 'translate3d(0, 0, 0)';
      return;
    }
    if (!animate) {
      track.style.transition = 'none';
    } else {
      track.style.transition = '';
    }
    track.style.transform = `translate3d(${-rawIndex * slideWidth}px, 0, 0)`;
    if (!animate) {
      requestAnimationFrame(() => { track.style.transition = ''; });
    }
  }

  function go(targetIndex, { animate = true } = {}) {
    if (!hasMultipleSlides) {
      index = 0;
      applySlideState(0, 0, false);
      setTrackPosition(0, false);
      updateDots(0);
      return;
    }

    const minIndex = 0;
    const maxIndex = logicalSlides.length + 1;
    const clampedTarget = Math.max(minIndex, Math.min(targetIndex, maxIndex));
    const prevIndex = index;
    const prevLogical = normalize(prevIndex);
    const targetLogical = normalize(clampedTarget);
    const shouldAnimate = animate && animationsEnabled && prevLogical !== targetLogical;

    index = shouldAnimate
      ? clampedTarget
      : adjustIndexWithoutAnimation(clampedTarget, minIndex, maxIndex);

    applySlideState(targetLogical, prevLogical, shouldAnimate);
    setTrackPosition(index, shouldAnimate);
    updateDots(targetLogical);
  }

  function adjustIndexWithoutAnimation(rawIndex, minIndex, maxIndex) {
    if (!hasMultipleSlides) return rawIndex;
    if (rawIndex === minIndex) return logicalSlides.length;
    if (rawIndex === maxIndex) return 1;
    return rawIndex;
  }

  function next() { go(index + 1); }
  function prev() { go(index - 1); }

  prevBtn && prevBtn.addEventListener('click', prev);
  nextBtn && nextBtn.addEventListener('click', next);

  track.setAttribute('tabindex', '0');
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft')  prev();
  });

  let startX = 0, dx = 0, dragging = false;
  track.addEventListener('pointerdown', (e) => {
    if (hasMultipleSlides && (index === 0 || index === logicalSlides.length + 1)) {
      handleLoopReset();
    }
    dragging = true; startX = e.clientX; dx = 0; track.setPointerCapture(e.pointerId); stopAuto();
    track.style.transition = 'none';
  });
  track.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dx = e.clientX - startX;
    track.style.transform = `translate3d(${(-index * slideWidth) + dx}px, 0, 0)`;
  });
  function onPointerEnd(e) {
    if (!dragging) return;
    dragging = false; track.releasePointerCapture(e.pointerId);
    track.style.transition = '';
    const threshold = slideWidth * 0.15;
    if (Math.abs(dx) > threshold) {
      requestAnimationFrame(() => (dx < 0 ? next() : prev()));
    } else {
      requestAnimationFrame(() => go(index, { animate: false }));
    }
    dx = 0;
    startAuto();
  }
  track.addEventListener('pointerup', onPointerEnd);
  track.addEventListener('pointercancel', onPointerEnd);
  track.addEventListener('transitionend', (event) => {
    if (event.target !== track || event.propertyName !== 'transform') return;
    handleLoopReset();
  });

  function handleLoopReset() {
    if (!hasMultipleSlides) return;
    const lastIndex = logicalSlides.length + 1;
    if (index === lastIndex) {
      index = 1;
      setTrackPosition(index, false);
    } else if (index === 0) {
      index = logicalSlides.length;
      setTrackPosition(index, false);
    }
  }

  function startAuto() {
    if (prefersReduced || !hasMultipleSlides) return;
    stopAuto();
    autoPlayId = setInterval(() => go(index + 1), 5000);
  }
  function stopAuto() {
    if (autoPlayId) { clearInterval(autoPlayId); autoPlayId = null; }
  }

  carousel.addEventListener('mouseenter', stopAuto);
  carousel.addEventListener('mouseleave', startAuto);
  carousel.addEventListener('focusin',  stopAuto);
  carousel.addEventListener('focusout', startAuto);

  renderDots();
  computeWidth();
  logicalSlides.forEach((slide, idx) => slide.classList.toggle('is-active', idx === 0));
  go(index, { animate: false });
  startAuto();

  function syncToWidth() {
    computeWidth();
    go(index, { animate: false });
  }

  window.addEventListener('resize', syncToWidth);

  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => syncToWidth());
    resizeObserver.observe(carousel);
  } else {
    window.addEventListener('load', syncToWidth);
  }

  // Footer-Jahr
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

})();
