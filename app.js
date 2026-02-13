const i18n = {
    en: {
        title: "Unscrambler", placeholder: "Enter your letters...", btnAnalyze: "Analyze",
        lockStatus: "Encrypted Access", lockTitle: "Titan Beta Access",
        lockDesc: "Full access to Spelling Bee, Wordle, and Unlimited Unscrambling is currently locked.",
        btnVerify: "Verify Identity", btnReturn: "Return to Limited Demo"
    },
    pl: {
        title: "Anagramator", placeholder: "Wpisz litery...", btnAnalyze: "Analizuj",
        lockStatus: "Szyfrowany dostęp", lockTitle: "Dostęp Titan Beta",
        lockDesc: "Pełny dostęp do Spelling Bee, Wordle i Nielimitowanego układania słów jest zablokowany.",
        btnVerify: "Potwierdź tożsamość", btnReturn: "Wróć do wersji Demo"
    },
    es: {
        title: "Descifrador", placeholder: "Introduce tus letras...", btnAnalyze: "Analizar",
        lockStatus: "Acceso Encriptado", lockTitle: "Acceso Beta Titan",
        lockDesc: "El acceso completo a Spelling Bee, Wordle y Descifrador Ilimitado está bloqueado actualmente.",
        btnVerify: "Verificar Identidad", btnReturn: "Volver a la Demo"
    }
};

class TitanEngine {
    constructor() {
        this.worker = new Worker('worker.js');
        this.unlocked = localStorage.getItem('titan_v1_secure') === 'true';
        this.AUTH_HASH = "131325c1df02b3ece2ca223db417ae876b1e2a2b854ff4e20456246409f1658d"; // "TITAN2026"
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
        document.getElementById('status-dot').className = 'status-indicator loading';
        document.getElementById('status-text').textContent = `Loading ${this.currentLang.toUpperCase()} Lexicon...`;
        this.worker.postMessage({ type: 'init', lang: this.currentLang });
    }

    bindLangSwitcher() {
        const switcher = document.getElementById('lang-switcher');
        switcher.addEventListener('change', (e) => {
            this.currentLang = e.target.value;
            this.applyTranslations();
            this.loadDictionary(); // Tell worker to swap language database
        });
    }

    applyTranslations() {
        const t = i18n[this.currentLang];
        document.getElementById('page-title').textContent = t.title;
        document.getElementById('inp-letters').placeholder = t.placeholder;
        document.getElementById('btn-unscramble').textContent = t.btnAnalyze;
        
        // Update Lock Screen
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
                
                // Keep Unscrambler translated, but default others
                if (target === 'unscramble') {
                    document.getElementById('page-title').textContent = i18n[this.currentLang].title;
                } else {
                    document.getElementById('page-title').textContent = item.innerText.trim();
                }
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
            const word = document.getElementById('inp-rhyme').value;
            const res = await fetch(`https://api.datamuse.com/words?rel_rhy=${word}`);
            const data = await res.json();
            this.render(data, 'res-rhyme');
        };
    }

    runQuery(type, payload, containerId) {
        document.getElementById(containerId).innerHTML = '<div style="grid-column:1/-1; opacity:0.6;">Crunching Shards...</div>';
        this.worker.postMessage({ type, payload, containerId });
    }

    handleMessage(data) {
        if (data.type === 'ready') {
            document.getElementById('status-dot').className = 'status-indicator ready';
            document.getElementById('status-text').textContent = `${this.currentLang.toUpperCase()} Engine Online`;
        } else if (data.type === 'results') {
            this.render(data.words, data.containerId);
        }
    }

    render(list, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = list.length ? "" : "No valid matches found.";
        list.slice(0, 100).forEach(w => {
            const card = document.createElement('div');
            card.className = 'word-card';
            card.textContent = w.word || w;
            container.appendChild(card);
        });
    }
}

new TitanEngine();
