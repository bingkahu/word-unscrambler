const i18n = {
    en: {
        navUnscramble: "Unscrambler", navBee: "Spelling Bee", navWordle: "Wordle Solver", navRhymes: "Rhyme Finder",
        engines: "Engines", utility: "Utility", statusLoading: "Loading EN Lexicon...", statusReady: "EN Engine Online",
        pageTitle: "Unscrambler"
    },
    pl: {
        navUnscramble: "Anagramator", navBee: "Spelling Bee", navWordle: "Wordle Solver", navRhymes: "Szukaj Rymów",
        engines: "Silniki", utility: "Narzędzia", statusLoading: "Pobieranie bazy PL...", statusReady: "Silnik PL Gotowy",
        pageTitle: "Anagramator"
    },
    es: {
        navUnscramble: "Descifrador", navBee: "Spelling Bee", navWordle: "Wordle Solver", navRhymes: "Buscador Rimas",
        engines: "Motores", utility: "Utilidad", statusLoading: "Cargando léxico ES...", statusReady: "Motor ES en línea",
        pageTitle: "Descifrador"
    }
};

class TitanEngine {
    constructor() {
        this.currentLang = 'en';
        this.currentView = 'unscramble';
        this.init();
    }

    init() {
        this.bindEvents();
        this.applyTranslations();
        this.registerPWA();
        // Simulate loading for the demo
        setTimeout(() => this.updateStatus('ready'), 2000);
    }

    applyTranslations() {
        const t = i18n[this.currentLang];
        document.getElementById('lbl-engines').textContent = t.engines;
        document.getElementById('lbl-utility').textContent = t.utility;
        document.getElementById('nav-unscramble-text').textContent = t.navUnscramble;
        document.getElementById('nav-bee-text').textContent = t.navBee;
        document.getElementById('nav-wordle-text').textContent = t.navWordle;
        document.getElementById('nav-rhymes-text').textContent = t.navRhymes;
        document.getElementById('status-text').textContent = t.statusLoading;
        document.getElementById('page-title').textContent = i18n[this.currentLang].pageTitle;
    }

    updateStatus(state) {
        const dot = document.getElementById('status-dot');
        const text = document.getElementById('status-text');
        if (state === 'ready') {
            dot.className = 'status-indicator ready';
            text.textContent = i18n[this.currentLang].statusReady;
        }
    }

    bindEvents() {
        // Language Switch
        document.getElementById('lang-switcher').onchange = (e) => {
            this.currentLang = e.target.value;
            this.applyTranslations();
        };

        // Mobile Sidebar Toggle
        const sidebar = document.getElementById('main-sidebar');
        document.getElementById('mobile-menu-btn').onclick = () => sidebar.classList.toggle('open');

        // View Switching
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.onclick = () => {
                if (btn.classList.contains('locked')) {
                    document.getElementById('beta-lock').classList.remove('hidden');
                    return;
                }
                
                const viewId = btn.getAttribute('data-view');
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.page-view').forEach(v => v.classList.remove('active'));
                
                btn.classList.add('active');
                document.getElementById(`view-${viewId}`).classList.add('active');
                sidebar.classList.remove('open');
            };
        });

        document.getElementById('btn-close-lock').onclick = () => {
            document.getElementById('beta-lock').classList.add('hidden');
        };
    }

    registerPWA() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(() => {});
        }
    }
}

new TitanEngine();
