/* Apply before styles load to avoid a light flash. No application data is touched. */
(() => {
  'use strict';
  const key = 'applytrack-theme-v1';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = 'system';
  try { const saved = localStorage.getItem(key); if (['light', 'dark', 'system'].includes(saved)) preference = saved; } catch {}
  function apply() {
    document.documentElement.dataset.theme = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
    document.documentElement.style.colorScheme = document.documentElement.dataset.theme;
  }
  apply();
  system.addEventListener('change', apply);
  document.addEventListener('DOMContentLoaded', () => {
    const control = document.getElementById('theme-select');
    if (!control) return;
    control.value = preference;
    control.addEventListener('change', () => {
      preference = control.value;
      try { localStorage.setItem(key, preference); } catch {}
      apply();
    });
  });
})();
