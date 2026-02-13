const i18n = {
    en: {
        navUnscramble: "Unscrambler", navBee: "Spelling Bee", navWordle: "Wordle Solver", navRhymes: "Rhyme Finder",
        titleUnscramble: "Unscrambler", titleBee: "Spelling Bee", titleWordle: "Wordle Solver", titleRhymes: "Rhyme Finder",
        plUnscramble: "Enter your letters...", btnUnscramble: "Analyze",
        beeTitle: "Honeycomb Solver", btnBee: "Find Bee Words",
        wLblGreen: "Green (Correct Spot)", wPlGreen: "e.g. .a.e. (dots for blanks)",
        wLblYellow: "Yellow (Wrong Spot)", wPlYellow: "letters to include",
        wLblGray: "Gray (Excluded)", wPlGray: "letters to avoid", btnWordle: "Filter Dictionary",
        plRhyme: "Type a word to rhyme with...", btnRhyme: "Search",
        lockStatus: "Encrypted Access", lockTitle: "Titan Beta Access",
        lockDesc: "Full access to Spelling Bee, Wordle, and Unlimited Unscrambling is currently locked.",
        btnVerify: "Verify Identity", btnReturn: "Return to Limited Demo",
        statusLoading: "Loading EN Lexicon...", statusReady: "EN Engine Online",
        crunching: "Crunching Shards...", noMatches: "No valid matches found.", rhymeError: "Rhymes currently only support English and Spanish."
    },
    pl: {
        navUnscramble: "Anagramator", navBee: "Spelling Bee", navWordle: "Wordle Solver", navRhymes: "Szukaj Rymów",
        titleUnscramble: "Anagramator", titleBee: "Spelling Bee", titleWordle: "Wordle Solver", titleRhymes: "Szukaj Rymów",
        plUnscramble: "Wpisz litery...", btnUnscramble: "Analizuj",
        beeTitle: "Rozwiązywanie Plastra", btnBee: "Znajdź Słowa",
        wLblGreen: "Zielony (Dobre Miejsce)", wPlGreen: "np. .a.e. (kropki na puste)",
        wLblYellow: "Żółty (Złe Miejsce)", wPlYellow: "wymagane litery",
        wLblGray: "Szary (Wykluczone)", wPlGray: "wykluczone litery", btnWordle: "Filtruj Słownik",
        plRhyme: "Wpisz słowo do rymu...", btnRhyme: "Szukaj",
        lockStatus: "Dostęp Szyfrowany", lockTitle: "Dostęp Titan Beta",
        lockDesc: "Pełny dostęp do Spelling Bee, Wordle i Nielimitowanego układania słów jest zablokowany.",
        btnVerify: "Potwierdź tożsamość", btnReturn: "Wróć do wersji Demo",
        statusLoading: "Pobieranie bazy PL...", statusReady: "Silnik PL Gotowy",
        crunching: "Przetwarzanie...", noMatches: "Brak pasujących słów.", rhymeError: "Wyszukiwarka rymów nie obsługuje języka polskiego."
    },
    es: {
        navUnscramble: "Descifrador", navBee: "Spelling Bee", navWordle: "Wordle Solver", navRhymes: "Buscador Rimas",
        titleUnscramble: "Descifrador", titleBee: "Spelling Bee", titleWordle: "Wordle Solver", titleRhymes: "Buscador Rimas",
        plUnscramble: "Introduce tus letras...", btnUnscramble: "Analizar",
        beeTitle: "Solucionador de Panal", btnBee: "Encontrar Palabras",
        wLblGreen: "Verde (Lugar Correcto)", wPlGreen: "ej. .a.e. (puntos para vacíos)",
        wLblYellow: "Amarillo (Lugar Incorrecto)", wPlYellow: "letras a incluir",
        wLblGray: "Gris (Excluidas)", wPlGray: "letras a evitar", btnWordle: "Filtrar Diccionario",
        plRhyme: "Escribe una palabra para rimar...", btnRhyme: "Buscar",
        lockStatus: "Acceso Encriptado", lockTitle: "Acceso Beta Titan",
        lockDesc: "El acceso completo a Spelling Bee, Wordle y Descifrador Ilimitado está bloqueado actualmente.",
        btnVerify: "Verificar Identidad", btnReturn: "Volver a la Demo",
        statusLoading: "Cargando léxico ES...", statusReady: "Motor ES en línea",
        crunching: "Procesando...", noMatches: "No se encontraron coincidencias.", rhymeError: "Error al buscar rimas."
    }
};

class TitanEngine {
    constructor() {
        this.worker = new Worker('worker.js');
        this.unlocked = localStorage.getItem('titan_v1_secure') === 'true';
        this.AUTH_HASH = "131325c1df02b3ece2ca223db417ae876b1e2a2b854ff4e20456246409f1658d";
        this.currentLang = 'en';
        this.init();
    }

    async init() {
        this.worker.onmessage = (e) => this.handleMessage(e.data);
        this.loadDictionary();
        this.bindLangSwitcher();
        this.bindAuth();
        this.bindNav();
        this.bindUI();
    }

    loadDictionary() {
        const t = i18n[this.currentLang];
        document.getElementById('status-dot').className = 'status-indicator loading';
        document.getElementById('status-text').textContent = t.statusLoading;
        this.worker.postMessage({ type: 'init', lang: this.currentLang });
    }

    bindLangSwitcher() {
        const switcher = document.getElementById('lang-switcher');
        switcher.addEventListener('change', (e) => {
            this.currentLang = e.target.value;
            this.applyTranslations();
            this.loadDictionary();
        });
    }

    applyTranslations() {
        const t = i18n[this.currentLang];
        
        // Sidebar
        document.getElementById('nav-unscramble-text').textContent = t.navUnscramble;
        document.getElementById('nav-bee-text').textContent = t.navBee;
        document.getElementById('nav-wordle-text').textContent = t.navWordle;
        document.getElementById('nav-rhymes-text').textContent = t.navRhymes;

        // Current Page Title
        const activeNav = document.querySelector('.nav-item.active').dataset.view;
        const titleMap = { unscramble: t.titleUnscramble, spellingbee: t.titleBee, wordle: t.titleWordle, rhymes: t.titleRhymes };
        document.getElementById('page-title').textContent = titleMap[activeNav];

        // Unscrambler View
        document.getElementById('inp-letters').placeholder = t.plUnscramble;
        document.getElementById('btn-unscramble').textContent = t.btnUnscramble;

        // Spelling Bee View
        document.getElementById('bee-title').textContent = t.beeTitle;
        document.getElementById('btn-bee').textContent = t.btnBee;

        // Wordle View
        document.getElementById('w-lbl-green').textContent = t.wLblGreen;
        document.getElementById('w-green').placeholder = t.wPlGreen;
        document.getElementById('w-lbl-yellow').textContent = t.wLblYellow;
        document.getElementById('w-yellow').placeholder = t.wPlYellow;
        document.getElementById('w-lbl-gray').textContent = t.wLblGray;
        document.getElementById('w-gray').placeholder = t.wPlGray;
        document.getElementById('btn-wordle').textContent = t.btnWordle;

        // Rhymes View
        document.getElementById('inp-rhyme').placeholder = t.plRhyme;
        document.getElementById('btn-rhyme').textContent = t.btnRhyme;

        // Lock Screen
        document.getElementById('t-lock-status').textContent = t.lockStatus;
        document.getElementById('t-lock-title').textContent = t.lockTitle;
        document.getElementById('t-lock-desc').textContent = t.lockDesc;
        document.getElementById('t-btn-verify').textContent = t.btnVerify;
        document.getElementById('btn-close-lock').textContent = t.btnReturn;
    }

    async hash(string) {
        const utf8 = new TextEncoder().encode(string);
        const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    bindAuth() {
        const lock = document.getElementById('beta-lock');
        const badge = document.getElementById('badge-demo');
        const inputField = document.getElementById('beta-code-input');

        if (this.unlocked) {
            badge.style.display = 'none';
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('locked'));
        }

        const attemptUnlock = async () => {
            const input = inputField.value.trim().toUpperCase();
            const hashedInput = await this.hash(input);

            if (hashedInput === this.AUTH_HASH) {
                localStorage.setItem('titan_v1_secure', 'true');
                location.reload();
            } else {
                alert("ACCESS DENIED: Invalid Beta Code.");
                inputField.value = "";
            }
        };

        document.getElementById('btn-unlock').onclick = attemptUnlock;
        inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') attemptUnlock();
        });

        document.getElementById('btn-close-lock').onclick = () => lock.classList.add('hidden');
    }

    bindNav() {
        const items = document.querySelectorAll('.nav-item');
        const views = document.querySelectorAll('.page-view');

        items.forEach(item => {
            item.onclick = () => {
                const target = item.dataset.view;
                if (!this.unlocked && target !== 'unscramble') {
                    document.getElementById('beta-lock').classList.remove('hidden');
                    return;
                }
                items.forEach(i => i.classList.remove('active'));
                views.forEach(v => v.classList.remove('active'));
                item.classList.add('active');
                document.getElementById(`view-${target}`).classList.add('active');
                
                const t = i18n[this.currentLang];
                const titleMap = { unscramble: t.titleUnscramble, spellingbee: t.titleBee, wordle: t.titleWordle, rhymes: t.titleRhymes };
                document.getElementById('page-title').textContent = titleMap[target];
            };
        });
    }

    bindUI() {
        document.getElementById('btn-unscramble').onclick = () => {
            const letters = document.getElementById('inp-letters').value.toLowerCase().trim();
            if (!this.unlocked && letters.length > 5) {
                document.getElementById('beta-lock').classList.remove('hidden');
                return;
            }
            this.runQuery('unscramble', { letters }, 'res-unscramble');
        };

        document.getElementById('btn-bee').onclick = () => {
            const center = document.getElementById('bee-center').value.toLowerCase();
            const outer = [1,2,3,4,5,6].map(n => document.getElementById(`bee-${n}`).value.toLowerCase()).join('');
            this.runQuery('bee', { center, outer }, 'res-bee');
        };

        document.getElementById('btn-wordle').onclick = () => {
            this.runQuery('wordle', {
                green: document.getElementById('w-green').value.toLowerCase() || '.....',
                yellow: document.getElementById('w-yellow').value.toLowerCase(),
                gray: document.getElementById('w-gray').value.toLowerCase()
            }, 'res-wordle');
        };

        document.getElementById('btn-rhyme').onclick = async () => {
            const t = i18n[this.currentLang];
            
            // Datamuse API does not support Polish
            if (this.currentLang === 'pl') {
                document.getElementById('res-rhyme').innerHTML = `<div class="word-card">${t.rhymeError}</div>`;
                return;
            }

            const word = document.getElementById('inp-rhyme').value;
            const langFlag = this.currentLang === 'es' ? '&v=es' : '';
            
            document.getElementById('res-rhyme').innerHTML = `<div style="grid-column:1/-1; opacity:0.6;">${t.crunching}</div>`;
            const res = await fetch(`https://api.datamuse.com/words?rel_rhy=${word}${langFlag}`);
            const data = await res.json();
            this.render(data, 'res-rhyme');
        };
    }

    runQuery(type, payload, containerId) {
        document.getElementById(containerId).innerHTML = `<div style="grid-column:1/-1; opacity:0.6;">${i18n[this.currentLang].crunching}</div>`;
        this.worker.postMessage({ type, payload, containerId });
    }

    handleMessage(data) {
        const t = i18n[this.currentLang];
        if (data.type === 'ready') {
            document.getElementById('status-dot').className = 'status-indicator ready';
            document.getElementById('status-text').textContent = t.statusReady;
        } else if (data.type === 'results') {
            this.render(data.words, data.containerId);
        }
    }

    render(list, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = list.length ? "" : i18n[this.currentLang].noMatches;
        list.slice(0, 100).forEach(w => {
            const card = document.createElement('div');
            card.className = 'word-card';
            card.textContent = w.word || w;
            container.appendChild(card);
        });
    }
}

new TitanEngine();
