const i18n = {
    en: {
        navUnscramble: "Unscrambler", navBee: "Spelling Bee", navWordle: "Wordle Solver", navRhymes: "Rhyme Finder",
        engines: "Engines", utility: "Utility", statusLoading: "Loading EN Lexicon...", statusReady: "EN Engine Online"
    },
    pl: {
        navUnscramble: "Anagramator", navBee: "Spelling Bee", navWordle: "Wordle Solver", navRhymes: "Szukaj Rymów",
        engines: "Silniki", utility: "Narzędzia", statusLoading: "Pobieranie bazy PL...", statusReady: "Silnik PL Gotowy"
    },
    es: {
        navUnscramble: "Descifrador", navBee: "Spelling Bee", navWordle: "Wordle Solver", navRhymes: "Buscador Rimas",
        engines: "Motores", utility: "Utilidad", statusLoading: "Cargando léxico ES...", statusReady: "Motor ES en línea"
    }
};

class TitanEngine {
    constructor() {
        this.worker = new Worker('worker.js');
        this.currentLang = 'en';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadDictionary();
        this.applyTranslations();
    }

    loadDictionary() {
        const t = i18n[this.currentLang];
        document.getElementById('status-text').textContent = t.statusLoading;
        document.getElementById('status-dot').className = 'status-indicator loading';
        this.worker.postMessage({ type: 'init', lang: this.currentLang });
    }

    applyTranslations() {
        const t = i18n[this.currentLang];
        // Sidebar Labels
        document.getElementById('lbl-engines').textContent = t.engines;
        document.getElementById('lbl-utility').textContent = t.utility;
        
        // Navigation items
        document.getElementById('nav-unscramble-text').textContent = t.navUnscramble;
        document.getElementById('nav-bee-text').textContent = t.navBee;
        document.getElementById('nav-wordle-text').textContent = t.navWordle;
        document.getElementById('nav-rhymes-text').textContent = t.navRhymes;
    }

    bindEvents() {
        // Language Switcher
        document.getElementById('lang-switcher').onchange = (e) => {
            this.currentLang = e.target.value;
            this.applyTranslations();
            this.loadDictionary();
        };

        // Mobile Menu Toggle
        const sidebar = document.getElementById('main-sidebar');
        document.getElementById('mobile-menu-btn').onclick = () => {
            sidebar.classList.toggle('open');
        };

        // Close sidebar on click (mobile)
        document.querySelectorAll('.nav-item').forEach(item => {
            item.onclick = () => {
                if(window.innerWidth <= 768) sidebar.classList.remove('open');
                // View switching logic here...
            };
        });

        this.worker.onmessage = (e) => {
            if (e.data.type === 'ready') {
                document.getElementById('status-text').textContent = i18n[this.currentLang].statusReady;
                document.getElementById('status-dot').className = 'status-indicator ready';
            }
        };
    }
}

new TitanEngine();
