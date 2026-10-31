/* Apply before styles load to avoid a light flash. No application data is touched. */
(() => {
  'use strict';
  const key = 'applytrack-theme-v1';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = 'system';
  let control;
  try { const saved = localStorage.getItem(key); if (['light', 'dark', 'system'].includes(saved)) preference = saved; } catch {}
  function apply() {
    document.documentElement.dataset.theme = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
    document.documentElement.style.colorScheme = document.documentElement.dataset.theme;
    if (control) {
      const dark = document.documentElement.dataset.theme === 'dark';
      const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
      control.setAttribute('aria-label', label);
      control.title = label;
      control.setAttribute('aria-pressed', String(dark));
    }
  }
  apply();
  system.addEventListener('change', apply);
  document.addEventListener('DOMContentLoaded', () => {
    control = document.getElementById('theme-toggle');
    if (!control) return;
    apply();
    control.addEventListener('click', () => {
      preference = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, preference); } catch {}
      apply();
    });
  });
})();
