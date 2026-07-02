/* ============================================================
   SAEP Analytics — theme-switcher.js
   Apenas alterna a classe dark-mode no <html>.
   Todo o visual está nas variáveis CSS do style.css.
============================================================ */

const THEME_KEY  = 'saep-theme';
const DARK       = 'dark';
const LIGHT      = 'light';

function saved() {
    return localStorage.getItem(THEME_KEY) ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK : LIGHT);
}

function apply(theme) {
    document.documentElement.classList.toggle('dark-mode', theme === DARK);
    localStorage.setItem(THEME_KEY, theme);
    const icon = document.querySelector('#themeToggleBtn i');
    if (icon) icon.className = theme === DARK ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        btn.title = theme === DARK ? 'Usar tema claro' : 'Usar tema escuro';
        btn.setAttribute('aria-label', btn.title);
    }
}

function injectBtn() {
    const nav = document.querySelector('.nav-right');
    if (!nav || document.getElementById('themeToggleBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'themeToggleBtn';
    btn.type = 'button';
    btn.className = 'nav-icon-btn theme-toggle-btn';
    btn.title = saved() === DARK ? 'Usar tema claro' : 'Usar tema escuro';
    btn.setAttribute('aria-label', btn.title);
    btn.innerHTML = `<i class="${saved() === DARK ? 'fa-solid fa-sun' : 'fa-solid fa-moon'}"></i>`;
    btn.onclick = () => apply(saved() === DARK ? LIGHT : DARK);
    nav.insertBefore(btn, nav.firstChild);
}

function boot() { apply(saved()); injectBtn(); }

document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot)
    : boot();
