class TitanEngine {
    constructor() {
        this.worker = new Worker('worker.js');
        this.unlocked = localStorage.getItem('titan_v1_secure') === 'true';
        
        this.AUTH_HASH = "5b5034c44238e8211b8b80983d3e69145f065a3d00f72f8832168f6920f4c361";
        
        this.init();
    }

    async init() {
        // Initialize dictionary
        this.worker.postMessage({ 
            type: 'init', 
            url: 'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt' 
        });

        this.worker.onmessage = (e) => this.handleMessage(e.data);
        
        this.bindAuth();
        this.bindNav();
        this.bindUI();
    }

    // SHA-256 Hashing function to compare the password without storing it
    async hash(string) {
        const utf8 = new TextEncoder().encode(string);
        const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    bindAuth() {
        const lock = document.getElementById('beta-lock');
        const badge = document.getElementById('badge-demo');

        if (this.unlocked) {
            badge.style.display = 'none';
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('locked'));
        }

        document.getElementById('btn-unlock').onclick = async () => {
            const input = document.getElementById('beta-code-input').value.trim().toUpperCase();
            const hashedInput = await this.hash(input);

            if (hashedInput === this.AUTH_HASH) {
                localStorage.setItem('titan_v1_secure', 'true');
                location.reload();
            } else {
                alert("ACCESS DENIED: Invalid Beta Code.");
            }
        };

        document.getElementById('btn-close-lock').onclick = () => lock.classList.add('hidden');
    }

    bindNav() {
        const items = document.querySelectorAll('.nav-item');
        const views = document.querySelectorAll('.page-view');

        items.forEach(item => {
            item.onclick = () => {
                const target = item.dataset.view;

                // LOCK LOGIC: Block everything but unscramble
                if (!this.unlocked && target !== 'unscramble') {
                    document.getElementById('beta-lock').classList.remove('hidden');
                    return;
                }

                items.forEach(i => i.classList.remove('active'));
                views.forEach(v => v.classList.remove('active'));

                item.classList.add('active');
                document.getElementById(`view-${target}`).classList.add('active');
                document.getElementById('page-title').textContent = item.innerText.trim();
            };
        });
    }

    bindUI() {
        // Unscrambler Logic
        document.getElementById('btn-unscramble').onclick = () => {
            const letters = document.getElementById('inp-letters').value.toLowerCase().trim();
            
            // LIMIT LOGIC: Check length if locked
            if (!this.unlocked && letters.length > 5) {
                document.getElementById('beta-lock').classList.remove('hidden');
                return;
            }

            this.runQuery('unscramble', { letters }, 'res-unscramble');
        };

        // Spelling Bee Logic
        document.getElementById('btn-bee').onclick = () => {
            const center = document.getElementById('bee-center').value.toLowerCase();
            const outer = [1,2,3,4,5,6].map(n => document.getElementById(`bee-${n}`).value.toLowerCase()).join('');
            this.runQuery('bee', { center, outer }, 'res-bee');
        };

        // Wordle Logic
        document.getElementById('btn-wordle').onclick = () => {
            this.runQuery('wordle', {
                green: document.getElementById('w-green').value.toLowerCase() || '.....',
                yellow: document.getElementById('w-yellow').value.toLowerCase(),
                gray: document.getElementById('w-gray').value.toLowerCase()
            }, 'res-wordle');
        };

        // Rhyme Logic (External)
        document.getElementById('btn-rhyme').onclick = async () => {
            const word = document.getElementById('inp-rhyme').value;
            const res = await fetch(`https://api.datamuse.com/words?rel_rhy=${word}`);
            const data = await res.json();
            this.render(data, 'res-rhyme');
        };
    }

    runQuery(type, payload, containerId) {
        document.getElementById(containerId).innerHTML = '<div style="grid-column:1/-1">Processing Shards...</div>';
        this.worker.postMessage({ type, payload, containerId });
    }

    handleMessage(data) {
        if (data.type === 'ready') {
            document.getElementById('status-dot').className = 'status-indicator ready';
            document.getElementById('status-text').textContent = 'Titan Online';
        } else if (data.type === 'results') {
            this.render(data.words, data.containerId);
        }
    }

    render(list, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = list.length ? "" : "No valid matches found.";
        list.slice(0, 80).forEach(w => {
            const card = document.createElement('div');
            card.className = 'word-card';
            card.textContent = w.word || w;
            container.appendChild(card);
        });
    }
}

new TitanEngine();
