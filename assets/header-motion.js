(() => {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.querySelectorAll('.hl-header-motion').forEach(panel => {
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;

    const tick = () => {
      cx += (tx - cx) * 0.045;
      cy += (ty - cy) * 0.045;
      panel.style.transform = `translate3d(${cx}px,${cy}px,0)`;
      raf = requestAnimationFrame(tick);
    };

    const header = panel.closest('.top');
    if (!header) return;

    header.addEventListener('pointermove', event => {
      const rect = header.getBoundingClientRect();
      tx = ((event.clientX - rect.left) / rect.width - .5) * 10;
      ty = ((event.clientY - rect.top) / rect.height - .5) * 7;
    });

    header.addEventListener('pointerleave', () => {
      tx = 0;
      ty = 0;
    });

    raf = requestAnimationFrame(tick);
  });
})();