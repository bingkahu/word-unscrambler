class TitanApp {
    constructor() {
        this.worker = new Worker('worker.js');
        this.unlocked = localStorage.getItem('titan_v1_auth') === 'true';
        this.SECRET_HASH = 'VElUQU4yMDI2'; // Base64 for TITAN2026
        
        this.init();
    }

    init() {
        this.worker.postMessage({ type: 'init', payload: { url: 'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt' } });
        
        this.setupAuth();
        this.setupNavigation();
        
        document.getElementById('btn-unscramble').onclick = () => this.handleUnscramble();
    }

    setupAuth() {
        const lock = document.getElementById('beta-lock');
        const badge = document.getElementById('badge-demo');
        
        if (this.unlocked) {
            badge.classList.add('hidden');
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('locked'));
        }

        document.getElementById('btn-unlock').onclick = () => {
            const input = document.getElementById('beta-code-input').value.toUpperCase();
            if (btoa(input) === this.SECRET_HASH) {
                this.unlocked = true;
                localStorage.setItem('titan_v1_auth', 'true');
                lock.classList.remove('open');
                location.reload(); // Refresh to unlock all UI
            } else {
                alert("Invalid Beta Code.");
            }
        };

        document.getElementById('btn-close-lock').onclick = () => lock.classList.remove('open');
    }

    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.onclick = () => {
                const viewId = btn.dataset.view;
                if (!this.unlocked && viewId !== 'unscramble') {
                    document.getElementById('beta-lock').classList.add('open');
                    return;
                }
                // Standard navigation logic here...
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };
        });
    }

    handleUnscramble() {
        const letters = document.getElementById('inp-letters').value;
        
        if (!this.unlocked && letters.length > 5) {
            document.getElementById('beta-lock').classList.add('open');
            return;
        }

        const container = document.getElementById('res-unscramble');
        container.innerHTML = 'Thinking...';
        
        this.worker.postMessage({ 
            type: 'unscramble', 
            payload: { letters, sort: 'length' } 
        });

        this.worker.onmessage = (e) => {
            if (e.data.type === 'result') this.render(e.data.data);
        };
    }

    render(data) {
        const container = document.getElementById('res-unscramble');
        container.innerHTML = data.map(w => `<div class="word-card">${w.word}</div>`).join('');
    }
}

new TitanApp();
