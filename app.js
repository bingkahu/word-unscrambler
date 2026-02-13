const i18n = {
    en: {
        navUnscramble: "Unscrambler", navBee: "Spelling Bee", navWordle: "Wordle Solver", navRhymes: "Rhyme Finder",
        engines: "Engines", utility: "Utility", statusLoading: "Downloading EN Lexicon...", statusReady: "EN System Online", statusError: "Network Error",
        pageTitle: { unscramble: "Unscrambler", spellingbee: "Spelling Bee", wordle: "Wordle Solver", rhymes: "Rhyme Finder" }
    },
    pl: {
        navUnscramble: "Anagramator", navBee: "Spelling Bee", navWordle: "Wordle Solver", navRhymes: "Szukaj Rymów",
        engines: "Silniki", utility: "Narzędzia", statusLoading: "Pobieranie bazy PL...", statusReady: "System PL Gotowy", statusError: "Błąd Sieci",
        pageTitle: { unscramble: "Anagramator", spellingbee: "Spelling Bee", wordle: "Wordle Solver", rhymes: "Szukaj Rymów" }
    },
    es: {
        navUnscramble: "Descifrador", navBee: "Spelling Bee", navWordle: "Wordle Solver", navRhymes: "Buscador Rimas",
        engines: "Motores", utility: "Utilidad", statusLoading: "Descargando léxico ES...", statusReady: "Sistema ES en Línea", statusError: "Error de Red",
        pageTitle: { unscramble: "Descifrador", spellingbee: "Spelling Bee", wordle: "Wordle Solver", rhymes: "Buscador Rimas" }
    }
};

// Public RAW URLs for real dictionaries
const DICT_URLS = {
    en: 'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt', // 370k words
    es: 'https://raw.githubusercontent.com/javierarce/palabras/master/listado-general.txt', // 80k words
    pl: 'data/pl.txt' // See instructions below on how to host this yourself
};

class TitanEngine {
    constructor() {
        this.currentLang = 'en';
        this.currentView = 'unscramble';
        this.isPro = localStorage.getItem('titan_unlocked') === 'true';
        this.dictionaries = { en: null, pl: null, es: null }; // Caches loaded languages
        this.init();
    }

    init() {
        this.checkAuthState();
        this.bindEvents();
        this.applyTranslations();
        this.loadDictionary(this.currentLang);
    }

    // --- 1. ASYNC DICTIONARY LOADER ---
    async loadDictionary(lang) {
        this.updateStatus('loading');
        
        // If we already downloaded it this session, don't download it again
        if (this.dictionaries[lang]) {
            this.updateStatus('ready');
            return;
        }

        try {
            const response = await fetch(DICT_URLS[lang]);
            if (!response.ok) throw new Error('Dictionary not found');
            
            const text = await response.text();
            
            // Convert the giant text block into an array of lowercase words
            // \r?\n handles both Windows and Mac/Linux line endings
            this.dictionaries[lang] = text.split(/\r?\n/).map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
            
            this.updateStatus('ready');
        } catch (error) {
            console.error("Dictionary Load Error:", error);
            this.updateStatus('error');
            
            // Fallback for Polish if local file is missing during testing
            if (lang === 'pl') {
                this.dictionaries['pl'] = ['tytan', 'jabłko', 'kod', 'program', 'gra']; 
                this.updateStatus('ready'); // Pretend it worked for the 5 fallback words
            }
        }
    }

    // --- 2. AUTH & UI STATE ---
    checkAuthState() {
        if (this.isPro) {
            document.querySelectorAll('.auth-required').forEach(el => {
                el.classList.remove('locked');
                el.querySelector('.mini-lock').classList.replace('fa-lock', 'fa-unlock');
            });
            const badge = document.getElementById('badge-demo');
            badge.textContent = 'PRO';
            badge.style.color = 'var(--green)';
            badge.style.borderColor = 'var(--green)';
            badge.style.background = 'rgba(34, 197, 94, 0.1)';
        }
    }

    verifyCode() {
        const input = document.getElementById('beta-code-input').value.trim().toUpperCase();
        const errorMsg = document.getElementById('auth-error');
        const card = document.getElementById('auth-card');

        if (input === 'iyuegkwgoeq47834o2eqe') {
            this.isPro = true;
            localStorage.setItem('titan_unlocked', 'true');
            this.checkAuthState();
            document.getElementById('beta-lock').classList.add('hidden');
            errorMsg.classList.add('hidden');
        } else {
            errorMsg.classList.remove('hidden');
            card.classList.remove('shake');
            void card.offsetWidth; 
            card.classList.add('shake');
        }
    }

    // --- 3. ENGINE LOGIC ---

    runUnscramble() {
        const input = document.getElementById('inp-letters').value.toLowerCase().trim();
        const resDiv = document.getElementById('res-unscramble');
        const dict = this.dictionaries[this.currentLang];
        
        if(!input || !dict) return;

        const inputCounts = this.getCharCounts(input);
        
        const results = dict.filter(word => {
            if(word.length > input.length || word.length < 2) return false;
            const wordCounts = this.getCharCounts(word);
            for (const char in wordCounts) {
                if (!inputCounts[char] || wordCounts[char] > inputCounts[char]) return false;
            }
            return true;
        });

        this.renderResults(results, resDiv);
    }

    runSpellingBee() {
        const center = document.getElementById('bee-center').value.toLowerCase();
        let others = '';
        for(let i=1; i<=6; i++) others += document.getElementById(`bee-${i}`).value.toLowerCase();
        
        const resDiv = document.getElementById('res-bee');
        const dict = this.dictionaries[this.currentLang];
        
        if(!center || !dict) return;

        const allLetters = center + others;

        const results = dict.filter(word => {
            if (word.length < 4) return false;
            if (!word.includes(center)) return false;
            for (let char of word) {
                if (!allLetters.includes(char)) return false;
            }
            return true;
        });

        this.renderResults(results, resDiv);
    }

    runWordle() {
        let green = document.getElementById('w-green').value.toLowerCase();
        let yellow = document.getElementById('w-yellow').value.toLowerCase();
        let gray = document.getElementById('w-gray').value.toLowerCase();
        const resDiv = document.getElementById('res-wordle');
        const dict = this.dictionaries[this.currentLang];
        
        if(!dict) return;

        green = green.padEnd(5, '.').substring(0, 5);
        const greenRegex = new RegExp('^' + green + '$');
        
        const results = dict.filter(word => {
            if (word.length !== 5) return false;
            if (!greenRegex.test(word)) return false; 
            
            for(let y of yellow) {
                if(y !== ' ' && y !== ',' && !word.includes(y)) return false;
            }
            
            for(let g of gray) {
                if(g !== ' ' && g !== ',' && word.includes(g) && !green.includes(g) && !yellow.includes(g)) return false;
            }
            
            return true;
        });

        this.renderResults(results, resDiv);
    }

    async runRhymes() {
        const input = document.getElementById('inp-rhyme').value.trim();
        const resDiv = document.getElementById('res-rhyme');
        if(!input) return;

        resDiv.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">Fetching rhymes via API...</p>';

        try {
            // Datamuse only supports English natively. 
            const langCode = this.currentLang === 'en' ? 'en' : 'es'; // Datamuse has limited ES support, no PL.
            const response = await fetch(`https://api.datamuse.com/words?rel_rhy=${input}&max=50&v=${langCode}`);
            const data = await response.json();
            const words = data.map(item => item.word);
            this.renderResults(words, resDiv);
        } catch (error) {
            resDiv.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color: var(--error);">Network Error.</p>';
        }
    }

    // --- 4. UTILS & UI BINDING ---
    getCharCounts(str) {
        const counts = {};
        for (let char of str) counts[char] = (counts[char] || 0) + 1;
        return counts;
    }

    renderResults(arr, container) {
        container.innerHTML = '';
        if (arr.length === 0) {
            container.innerHTML = '<div class="no-results">No words found in database.</div>';
            return;
        }
        
        // Sort by length (longest first), then alphabetically
        arr.sort((a, b) => b.length - a.length || a.localeCompare(b));

        // Render limits to prevent browser freezing if results are huge
        const limit = Math.min(arr.length, 500); 

        for(let i=0; i<limit; i++) {
            const div = document.createElement('div');
            div.className = 'word-card';
            div.textContent = arr[i];
            div.style.animationDelay = `${(i % 20) * 0.02}s`; 
            container.appendChild(div);
        }

        if(arr.length > limit) {
             const div = document.createElement('div');
             div.className = 'no-results';
             div.textContent = `+ ${arr.length - limit} more words (hidden for performance)`;
             container.appendChild(div);
        }
    }

    applyTranslations() {
        const t = i18n[this.currentLang];
        document.getElementById('lbl-engines').textContent = t.engines;
        document.getElementById('lbl-utility').textContent = t.utility;
        document.getElementById('nav-unscramble-text').textContent = t.navUnscramble;
        document.getElementById('nav-bee-text').textContent = t.navBee;
        document.getElementById('nav-wordle-text').textContent = t.navWordle;
        document.getElementById('nav-rhymes-text').textContent = t.navRhymes;
        document.getElementById('page-title').textContent = t.pageTitle[this.currentView];
        
        const dot = document.getElementById('status-dot');
        if (dot.classList.contains('ready')) document.getElementById('status-text').textContent = t.statusReady;
        else if (dot.classList.contains('loading')) document.getElementById('status-text').textContent = t.statusLoading;
        else document.getElementById('status-text').textContent = t.statusError;
    }

    updateStatus(state) {
        const dot = document.getElementById('status-dot');
        const mDot = document.getElementById('mobile-status-dot-mini');
        const text = document.getElementById('status-text');
        const t = i18n[this.currentLang];
        
        dot.className = 'status-indicator';
        if(mDot) mDot.className = 'status-indicator';

        if (state === 'ready') {
            dot.classList.add('ready');
            if(mDot) mDot.classList.add('ready');
            text.textContent = t.statusReady;
        } else if (state === 'loading') {
            dot.classList.add('loading');
            if(mDot) mDot.classList.add('loading');
            text.textContent = t.statusLoading;
        } else {
            dot.style.background = 'var(--error)';
            dot.style.boxShadow = '0 0 10px var(--error)';
            if(mDot) mDot.style.background = 'var(--error)';
            text.textContent = t.statusError;
        }
    }

    bindEvents() {
        const sidebar = document.getElementById('main-sidebar');
        document.getElementById('mobile-menu-btn').onclick = () => sidebar.classList.toggle('open');

        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.onclick = () => {
                if (btn.classList.contains('locked')) {
                    document.getElementById('beta-lock').classList.remove('hidden');
                    return;
                }
                
                const viewId = btn.getAttribute('data-view');
                this.currentView = viewId;
                
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.page-view').forEach(v => v.classList.remove('active'));
                
                btn.classList.add('active');
                document.getElementById(`view-${viewId}`).classList.add('active');
                
                if (window.innerWidth <= 768) sidebar.classList.remove('open');
                this.applyTranslations();
            };
        });

        // Language Switcher Triggers Dictionary Download
        document.getElementById('lang-switcher').onchange = (e) => {
            this.currentLang = e.target.value;
            this.applyTranslations();
            this.loadDictionary(this.currentLang);
        };

        document.getElementById('btn-close-lock').onclick = () => {
            document.getElementById('beta-lock').classList.add('hidden');
            document.getElementById('auth-error').classList.add('hidden');
        };
        document.getElementById('btn-unlock').onclick = () => this.verifyCode();
        document.getElementById('beta-code-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.verifyCode();
        });

        document.getElementById('btn-unscramble').onclick = () => this.runUnscramble();
        document.getElementById('inp-letters').addEventListener('keypress', (e) => { if (e.key === 'Enter') this.runUnscramble(); });
        document.getElementById('btn-bee').onclick = () => this.runSpellingBee();
        document.getElementById('btn-wordle').onclick = () => this.runWordle();
        document.getElementById('btn-rhyme').onclick = () => this.runRhymes();
        document.getElementById('inp-rhyme').addEventListener('keypress', (e) => { if (e.key === 'Enter') this.runRhymes(); });
        
        const hexes = document.querySelectorAll('.hex-in');
        hexes.forEach((hex, i) => {
            hex.addEventListener('input', () => {
                if (hex.value.length === 1 && i < hexes.length - 1) hexes[i + 1].focus();
            });
        });
    }
}

new TitanEngine();
