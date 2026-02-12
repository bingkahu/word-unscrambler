/* Lexicon Titan - Application Controller */

class App {
    constructor() {
        this.worker = new Worker('worker.js');
        this.DICT_URL = 'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt';
        this.saved = new Set(JSON.parse(localStorage.getItem('lexicon_saved') || '[]'));
        
        this.els = {
            navItems: document.querySelectorAll('.nav-item'),
            views: document.querySelectorAll('.page-view'),
            title: document.getElementById('page-title'),
            status: document.getElementById('status-dot'),
            statusText: document.getElementById('status-text'),
            themeBtn: document.getElementById('theme-btn'),
            
            // Modal
            modal: document.getElementById('modal-overlay'),
            modalTitle: document.getElementById('def-title'),
            modalBody: document.getElementById('def-body'),
        };

        this.init();
    }

    init() {
        // Init Worker
        this.worker.postMessage({ type: 'init', payload: { url: this.DICT_URL } });
        this.worker.onmessage = this.handleWorkerMsg.bind(this);

        // Navigation
        this.els.navItems.forEach(btn => {
            btn.addEventListener('click', () => this.navigate(btn));
        });

        // Theme
        this.setupTheme();

        // Bind Tools
        this.bindEvents();
        
        // Load Saved
        this.renderSaved();
    }

    navigate(btn) {
        // Update Active Nav
        this.els.navItems.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update View
        const viewId = btn.dataset.view;
        this.els.views.forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${viewId}`).classList.add('active');

        // Update Title
        this.els.title.textContent = btn.innerText.trim();
    }

    bindEvents() {
        // Unscramble
        document.getElementById('btn-unscramble').onclick = () => {
            this.sendJob('unscramble', {
                letters: document.getElementById('inp-letters').value,
                start: document.getElementById('filter-start').value,
                end: document.getElementById('filter-end').value,
                sort: document.getElementById('sort-mode').value
            }, 'res-unscramble');
        };

        // Spelling Bee
        document.getElementById('btn-bee').onclick = () => {
            const center = document.getElementById('sb-center-input').value;
            const outerInputs = document.querySelectorAll('.hex-input:not(.center)');
            let outer = '';
            outerInputs.forEach(i => outer += i.value);
            
            this.sendJob('spellingbee', { center, outer }, 'res-bee');
        };

        // Wordle
        document.getElementById('btn-wordle').onclick = () => {
            const greens = Array.from(document.querySelectorAll('.w-green')).map(i => i.value.toLowerCase());
            this.sendJob('wordle', {
                green: greens,
                yellow: document.getElementById('w-yellow').value,
                gray: document.getElementById('w-gray').value
            }, 'res-wordle');
        };

        // Pattern
        document.getElementById('btn-pattern').onclick = () => {
            this.sendJob('pattern', { pattern: document.getElementById('inp-pattern').value }, 'res-pattern');
        };

        // API Tools (Rhyme/Synonym) - No Worker Needed
        document.getElementById('btn-rhyme').onclick = () => this.fetchDatamuse('rel_rhy', 'inp-rhyme', 'res-rhyme');
        document.getElementById('btn-syn').onclick = () => this.fetchDatamuse('rel_syn', 'inp-syn', 'res-syn');

        // Modal Close
        document.querySelector('.close-modal').onclick = () => this.els.modal.classList.remove('open');
        document.getElementById('btn-clear-saved').onclick = () => {
            this.saved.clear();
            this.saveDisk();
            this.renderSaved();
        };
    }

    // --- WORKER HANDLERS ---
    sendJob(type, payload, resId) {
        if(this.els.status.classList.contains('loading')) {
            alert("Dictionary loading... please wait 2 seconds.");
            return;
        }
        const container = document.getElementById(resId);
        container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;">Computing...</div>';
        this.worker.postMessage({ type, payload, id: resId });
    }

    handleWorkerMsg(e) {
        const { type, data, id } = e.data;
        if (type === 'ready') {
            this.els.status.className = 'status-indicator ready';
            this.els.statusText.textContent = 'Ready';
        } else if (type === 'result') {
            this.renderResults(data, id);
        }
    }

    // --- API HANDLERS (Datamuse) ---
    async fetchDatamuse(relType, inpId, resId) {
        const word = document.getElementById(inpId).value;
        const container = document.getElementById(resId);
        container.innerHTML = 'Loading...';

        try {
            const res = await fetch(`https://api.datamuse.com/words?${relType}=${word}`);
            const data = await res.json();
            this.renderResults(data, resId);
        } catch(e) {
            container.innerHTML = 'Error fetching data.';
        }
    }

    // --- RENDERING ---
    renderResults(items, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        
        if (!items || items.length === 0) {
            container.innerHTML = '<div style="opacity:0.5; padding:20px;">No matches found.</div>';
            return;
        }

        const frag = document.createDocumentFragment();
        // Limit to 200 for perf
        items.slice(0, 200).forEach(item => {
            const w = item.word;
            const card = document.createElement('div');
            card.className = 'word-card';
            card.innerHTML = `<div style="font-weight:bold;font-size:1.1em">${w}</div>`;
            
            if(item.score) card.innerHTML += `<div class="score">${item.score}</div>`;
            
            card.onclick = () => this.openDefinition(w);
            frag.appendChild(card);
        });
        container.appendChild(frag);
    }

    // --- MODAL & SAVING ---
    async openDefinition(word) {
        this.els.modal.classList.add('open');
        this.els.modalTitle.textContent = word;
        this.els.modalBody.innerHTML = 'Fetching definition...';
        
        document.getElementById('btn-modal-save').onclick = () => this.toggleSave(word);
        document.getElementById('btn-modal-google').href = `https://google.com/search?q=define+${word}`;

        try {
            const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
            if(!res.ok) throw new Error();
            const data = await res.json();
            
            let html = '';
            data[0].meanings.slice(0,2).forEach(m => {
                html += `<div style="margin-bottom:10px;">
                    <i style="color:var(--primary)">${m.partOfSpeech}</i>
                    <p>${m.definitions[0].definition}</p>
                </div>`;
            });
            this.els.modalBody.innerHTML = html;
        } catch(e) {
            this.els.modalBody.innerHTML = "Definition not found in API.";
        }
    }

    toggleSave(word) {
        if(this.saved.has(word)) this.saved.delete(word);
        else this.saved.add(word);
        this.saveDisk();
        this.renderSaved();
        this.els.modal.classList.remove('open');
    }

    renderSaved() {
        const list = Array.from(this.saved).map(w => ({ word: w }));
        this.renderResults(list, 'res-saved');
    }

    saveDisk() {
        localStorage.setItem('lexicon_saved', JSON.stringify([...this.saved]));
    }

    setupTheme() {
        const saved = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', saved);
        this.els.themeBtn.onclick = () => {
            const cur = document.documentElement.getAttribute('data-theme');
            const next = cur === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
        };
    }
}

new App();
