class LexiconTitan {
    constructor() {
        this.worker = new Worker('worker.js');
        this.isUnlocked = localStorage.getItem('titan_auth') === 'true';
        this.SECRET = 'VElUQU4yMDI2'; // TITAN2026
        
        this.init();
    }

    init() {
        // Initialize Worker Dictionary
        this.worker.postMessage({ 
            type: 'init', 
            payload: { url: 'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt' } 
        });

        this.worker.onmessage = (e) => this.handleWorkerMessage(e.data);

        this.setupAuth();
        this.setupNavigation();
        this.bindTools();
    }

    setupAuth() {
        const lock = document.getElementById('beta-lock');
        const badge = document.getElementById('badge-demo');

        if (this.isUnlocked) {
            badge.style.display = 'none';
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('locked'));
        }

        document.getElementById('btn-unlock').onclick = () => {
            const input = document.getElementById('beta-code-input').value.toUpperCase();
            if (btoa(input) === this.SECRET) {
                localStorage.setItem('titan_auth', 'true');
                location.reload();
            } else {
                alert("Invalid Access Code.");
            }
        };

        document.getElementById('btn-close-lock').onclick = () => lock.classList.remove('open');
    }

    setupNavigation() {
        const items = document.querySelectorAll('.nav-item');
        const views = document.querySelectorAll('.page-view');

        items.forEach(item => {
            item.onclick = () => {
                const viewId = item.dataset.view;
                
                // Gate check
                if (!this.isUnlocked && viewId !== 'unscramble') {
                    document.getElementById('beta-lock').classList.add('open');
                    return;
                }

                items.forEach(i => i.classList.remove('active'));
                views.forEach(v => v.classList.remove('active'));
                
                item.classList.add('active');
                document.getElementById(`view-${viewId}`).classList.add('active');
                document.getElementById('page-title').textContent = item.innerText;
            };
        });
    }

    bindTools() {
        // Unscramble
        document.getElementById('btn-unscramble').onclick = () => {
            const letters = document.getElementById('inp-letters').value;
            if (!this.isUnlocked && letters.length > 5) {
                document.getElementById('beta-lock').classList.add('open');
                return;
            }
            this.sendToWorker('unscramble', { letters }, 'res-unscramble');
        };

        // Spelling Bee
        document.getElementById('btn-bee').onclick = () => {
            const center = document.getElementById('sb-center-input').value;
            const outer = Array.from(document.querySelectorAll('.hex-input:not(.center)')).map(i => i.value).join('');
            this.sendToWorker('spellingbee', { center, outer }, 'res-bee');
        };

        // Wordle
        document.getElementById('btn-wordle').onclick = () => {
            this.sendToWorker('wordle', {
                green: document.getElementById('w-green').value,
                yellow: document.getElementById('w-yellow').value,
                gray: document.getElementById('w-gray').value
            }, 'res-wordle');
        };

        // Rhymes (External API)
        document.getElementById('btn-rhyme').onclick = async () => {
            const word = document.getElementById('inp-rhyme').value;
            const res = await fetch(`https://api.datamuse.com/words?rel_rhy=${word}`);
            const data = await res.json();
            this.renderResults(data, 'res-rhyme');
        };
    }

    sendToWorker(type, payload, containerId) {
        document.getElementById(containerId).innerHTML = '<div style="grid-column:1/-1">Calculating...</div>';
        this.worker.postMessage({ type, payload, id: containerId });
    }

    handleWorkerMessage(data) {
        if (data.type === 'ready') {
            document.getElementById('status-dot').className = 'status-indicator ready';
            document.getElementById('status-text').textContent = 'Titan Online';
        } else if (data.type === 'result') {
            this.renderResults(data.data, data.id);
        }
    }

    renderResults(items, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = items.length ? '' : 'No matches.';
        items.slice(0, 100).forEach(item => {
            const div = document.createElement('div');
            div.className = 'word-card';
            div.textContent = item.word;
            container.appendChild(div);
        });
    }
}

new LexiconTitan();
