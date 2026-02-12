/* Lexicon Ultra - Main Controller
 * Handles UI interactions and Worker communication
 */

class App {
    constructor() {
        this.worker = new Worker('worker.js');
        this.savedWords = new Set(JSON.parse(localStorage.getItem('lexicon_saved') || '[]'));
        
        // Config
        this.DICT_URL = 'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt';
        
        this.dom = {
            navBtns: document.querySelectorAll('.nav-btn'),
            views: document.querySelectorAll('.view'),
            inputs: {
                unscramble: document.getElementById('input-letters'),
                starts: document.getElementById('filter-starts'),
                ends: document.getElementById('filter-ends'),
                sort: document.getElementById('sort-order'),
                pattern: document.getElementById('input-pattern'),
                // Wordle
                wCorrect: document.getElementById('w-correct'),
                wPresent: document.getElementById('w-present'),
                wAbsent: document.getElementById('w-absent'),
                // Bee
                sbCenter: document.getElementById('sb-center'),
                sbOuter: document.getElementById('sb-outer')
            },
            containers: {
                unscramble: document.getElementById('results-container'),
                pattern: document.getElementById('pattern-results'),
                wordle: document.getElementById('wordle-results'),
                bee: document.getElementById('bee-results'),
                saved: document.getElementById('saved-list')
            },
            status: document.getElementById('status-indicator'),
            themeToggle: document.getElementById('theme-toggle')
        };

        this.init();
    }

    init() {
        this.setupWorker();
        this.setupNavigation();
        this.setupEventListeners();
        this.setupTheme();
        this.renderSaved();
    }

    setupWorker() {
        this.worker.postMessage({ type: 'init', payload: { url: this.DICT_URL } });

        this.worker.onmessage = (e) => {
            const { type, data, time, message } = e.data;
            
            if (type === 'ready') {
                this.dom.status.classList.remove('loading');
                this.dom.status.classList.add('ready');
                this.toast('System Ready', 'Dictionary loaded successfully.');
            } else if (type === 'result') {
                this.handleResults(data, time, e.data.id);
            } else if (type === 'error') {
                console.log(message);
            }
        };
    }

    setupNavigation() {
        this.dom.navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update Sidebar
                this.dom.navBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Show View
                const target = btn.dataset.target;
                this.dom.views.forEach(v => v.classList.remove('active'));
                document.getElementById(`view-${target}`).classList.add('active');
            });
        });
    }

    setupEventListeners() {
        // Unscramble Trigger
        const runUnscramble = () => {
            const letters = this.dom.inputs.unscramble.value;
            if(!letters) return;
            this.sendJob('unscramble', {
                letters,
                starts: this.dom.inputs.starts.value,
                ends: this.dom.inputs.ends.value,
                sort: this.dom.inputs.sort.value
            }, 'unscramble');
        };

        document.getElementById('btn-solve').onclick = runUnscramble;
        this.dom.inputs.sort.onchange = runUnscramble;
        this.dom.inputs.unscramble.addEventListener('keypress', e => e.key === 'Enter' && runUnscramble());

        // Pattern Trigger
        document.getElementById('btn-pattern').onclick = () => {
            this.sendJob('pattern', { pattern: this.dom.inputs.pattern.value }, 'pattern');
        };

        // Wordle Trigger
        document.getElementById('btn-wordle').onclick = () => {
            this.sendJob('wordle', {
                correct: this.dom.inputs.wCorrect.value,
                present: this.dom.inputs.wPresent.value,
                absent: this.dom.inputs.wAbsent.value
            }, 'wordle');
        };

        // Spelling Bee Trigger
        document.getElementById('btn-bee').onclick = () => {
            this.sendJob('spellingbee', {
                center: this.dom.inputs.sbCenter.value,
                outer: this.dom.inputs.sbOuter.value
            }, 'bee');
        };

        // Saved Words Clear
        document.getElementById('btn-clear-saved').onclick = () => {
            this.savedWords.clear();
            this.saveStorage();
            this.renderSaved();
        };

        // Anagram Check
        document.getElementById('btn-anag-check').onclick = () => {
             const s = document.getElementById('anag-source').value;
             const t = document.getElementById('anag-target').value;
             const clean = str => str.toLowerCase().replace(/[^a-z]/g, '').split('').sort().join('');
             const match = clean(s) === clean(t) && s && t;
             document.getElementById('anag-status').innerHTML = match 
                ? `<span style="color:var(--accent)">MATCH! Exact anagrams.</span>`
                : `<span style="color:red">Mismatch.</span>`;
        };
    }

    sendJob(type, payload, uiId) {
        if (!this.dom.status.classList.contains('ready')) {
            this.toast('Wait', 'Dictionary is still loading...');
            return;
        }
        // Show loading state in UI if needed
        this.dom.containers[uiId].style.opacity = '0.5';
        this.worker.postMessage({ type, payload, id: uiId });
    }

    handleResults(data, time, uiId) {
        const container = this.dom.containers[uiId];
        container.style.opacity = '1';
        container.innerHTML = '';
        
        if (uiId === 'unscramble') {
            document.getElementById('results-count').textContent = `${data.length} results in ${time}ms`;
        }

        if (data.length === 0) {
            container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#888">No matches found.</div>';
            return;
        }

        // Render Cards
        const fragment = document.createDocumentFragment();
        // Limit render to 500 items for DOM performance
        data.slice(0, 500).forEach(item => {
            const div = document.createElement('div');
            div.className = 'word-card';
            div.innerHTML = `<span class="word">${item.word}</span> <span class="score ${item.score > 15 ? 'high' : ''}">${item.score}</span>`;
            
            // Interaction: Toggle Save
            div.onclick = () => this.toggleSave(item.word);
            
            fragment.appendChild(div);
        });

        container.appendChild(fragment);
    }

    // --- UTILS ---

    toggleSave(word) {
        if (this.savedWords.has(word)) {
            this.savedWords.delete(word);
            this.toast('Removed', `${word} removed from saved.`);
        } else {
            this.savedWords.add(word);
            this.toast('Saved', `${word} added to library.`);
        }
        this.saveStorage();
        this.renderSaved();
    }

    renderSaved() {
        const list = this.dom.containers.saved;
        list.innerHTML = '';
        this.savedWords.forEach(word => {
            const li = document.createElement('li');
            li.textContent = word;
            li.className = 'word-card'; // Reuse style
            li.style.display = 'inline-block';
            li.style.margin = '5px';
            list.appendChild(li);
        });
    }

    saveStorage() {
        localStorage.setItem('lexicon_saved', JSON.stringify([...this.savedWords]));
    }

    setupTheme() {
        const saved = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', saved);
        this.dom.themeToggle.onclick = () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
        };
    }

    toast(title, msg) {
        const container = document.getElementById('toast-container');
        const el = document.createElement('div');
        el.className = 'toast';
        el.innerHTML = `<strong>${title}</strong><br>${msg}`;
        container.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }
}

new App();
