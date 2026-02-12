/* * LEXICON PRO - Core Application Logic
 * Features: SPA Routing, Dictionary Caching, Recursive Permutations, Public API
 */

class App {
    constructor() {
        this.dictionary = new Set();
        this.isReady = false;
        this.DICT_URL = 'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt';
        
        // Cache DOM elements
        this.dom = {
            navLinks: document.querySelectorAll('.nav-links a'),
            pages: document.querySelectorAll('.page'),
            status: document.getElementById('global-status'),
            themeBtn: document.getElementById('theme-toggle'),
            
            // Unscramble Page
            uInput: document.getElementById('unscramble-input'),
            uBtn: document.getElementById('unscramble-btn'),
            uList: document.getElementById('unscramble-results'),
            uMeta: document.getElementById('results-meta'),
            uSort: document.getElementById('sort-select'),
            
            // Anagram Page
            aInput1: document.getElementById('anagram-1'),
            aInput2: document.getElementById('anagram-2'),
            aBtn: document.getElementById('check-anagram-btn'),
            aResult: document.getElementById('anagram-result-display'),

            // Modal
            modal: document.getElementById('definition-modal'),
            modalClose: document.querySelector('.close-modal'),
            modalTitle: document.getElementById('def-word'),
            modalContent: document.getElementById('def-content')
        };

        this.init();
    }

    async init() {
        this.setupRouter();
        this.setupEventListeners();
        this.setupTheme();
        await this.loadDictionary();
    }

    // --- 1. SYSTEM & ROUTING ---

    setupRouter() {
        // Handle clicking nav links
        this.dom.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetPage = link.getAttribute('data-page');
                this.switchPage(targetPage);
            });
        });

        // Handle initial hash (e.g. reload on #anagrams)
        const hash = window.location.hash.replace('#', '');
        if (hash) this.switchPage(hash);
    }

    switchPage(pageId) {
        // Update Nav Active State
        this.dom.navLinks.forEach(l => {
            l.classList.toggle('active', l.getAttribute('data-page') === pageId);
        });

        // Show Correct Section
        this.dom.pages.forEach(p => {
            p.classList.remove('active');
            if(p.id === `page-${pageId}`) p.classList.add('active');
        });
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        this.dom.themeBtn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
        });
    }

    // --- 2. DICTIONARY CORE ---

    async loadDictionary() {
        try {
            const res = await fetch(this.DICT_URL);
            const text = await res.text();
            const words = text.split(/\r?\n/);
            
            words.forEach(w => {
                if (w.length > 1) this.dictionary.add(w.toLowerCase().trim());
            });

            this.isReady = true;
            this.dom.status.classList.add('ready'); // Hide loader
            console.log(`Dictionary loaded: ${this.dictionary.size} words`);
        } catch (e) {
            this.dom.status.innerHTML = "Error loading dictionary. Refresh page.";
        }
    }

    setupEventListeners() {
        // Unscramble
        this.dom.uBtn.addEventListener('click', () => this.handleUnscramble());
        this.dom.uInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') this.handleUnscramble() });
        this.dom.uSort.addEventListener('change', () => this.handleUnscramble());

        // Anagrams
        this.dom.aBtn.addEventListener('click', () => this.handleAnagramCheck());

        // Modal
        this.dom.modalClose.addEventListener('click', () => this.dom.modal.classList.remove('open'));
        window.addEventListener('click', (e) => {
            if (e.target === this.dom.modal) this.dom.modal.classList.remove('open');
        });
    }

    // --- 3. UNSCRAMBLER LOGIC (With Wildcards) ---

    handleUnscramble() {
        if (!this.isReady) return;
        
        const rawInput = this.dom.uInput.value.toLowerCase().trim();
        if (!rawInput) return;

        // Check for Wildcards (?)
        const wildcardCount = (rawInput.match(/\?/g) || []).length;
        if (wildcardCount > 2) {
            alert("Max 2 wildcards allowed for performance reasons.");
            return;
        }

        const letters = rawInput.split('');
        const results = new Set();
        
        // Helper: Recursive Permutation Generator
        const generate = (current, remaining) => {
            if (current.length > 1) {
                // Validate against dictionary immediately to prune tree if no wildcards
                // But with wildcards, we must generate then match
                if (wildcardCount === 0 && this.dictionary.has(current)) results.add(current);
                // With wildcards, we validate at the end or use Regex (simplified here: generate all, then check)
                else if (wildcardCount > 0) results.add(current);
            }
            
            for (let i = 0; i < remaining.length; i++) {
                const char = remaining[i];
                const nextRemaining = [...remaining];
                nextRemaining.splice(i, 1);
                
                if (char === '?') {
                    // Try all alphabet for wildcard (Expensive!)
                    // Optimization: We will skip strict wildcard generation here and use a Regex filter approach instead
                    // Logic switch: If wildcard, we iterate the DICTIONARY instead of generating perms.
                } else {
                    generate(current + char, nextRemaining);
                }
            }
        };

        // Decision: Normal Mode vs Wildcard Mode
        if (wildcardCount > 0) {
            this.wildcardSearch(rawInput, results);
        } else {
            generate("", letters);
        }

        this.renderResults(Array.from(results));
    }

    wildcardSearch(input, resultsSet) {
        // Strategy: Convert "t?st" into a sorted signature logic or Regex
        // Regex approach is best for "Pattern Matching", but user wants "Unscramble with wildcards"
        // Meaning: "c?t" -> "cat", "cut", "cot", "act", "etc"? 
        // Usually unscramble wildcards means the ? can be ANY letter in the pile.
        
        // 1. Create a frequency map of input (treating ? as bonus)
        const getFreq = (str) => {
            const map = {};
            for(let c of str) map[c] = (map[c] || 0) + 1;
            return map;
        };
        
        const inputFreq = getFreq(input);
        const wildcards = inputFreq['?'] || 0;
        delete inputFreq['?'];

        // 2. Iterate Dictionary (Brute force is fast enough for 300k items in JS V8)
        this.dictionary.forEach(word => {
            if (word.length > input.length) return; // Can't make word longer than tiles

            const wordFreq = getFreq(word);
            let neededWildcards = 0;
            let possible = true;

            for (let char in wordFreq) {
                const countInWord = wordFreq[char];
                const countInInput = inputFreq[char] || 0;
                
                if (countInWord > countInInput) {
                    neededWildcards += (countInWord - countInInput);
                }
            }

            if (neededWildcards <= wildcards) {
                resultsSet.add(word);
            }
        });
    }

    renderResults(words) {
        this.dom.uList.innerHTML = '';
        const sortBy = this.dom.uSort.value;
        
        // Filter: Ensure actual dictionary words
        const validWords = words.filter(w => this.dictionary.has(w));
        
        // Sort
        validWords.sort((a,b) => {
            return sortBy === 'length' 
                ? b.length - a.length || a.localeCompare(b)
                : a.localeCompare(b);
        });

        this.dom.uMeta.textContent = `Found ${validWords.length} words`;

        validWords.forEach(w => {
            const div = document.createElement('div');
            div.className = 'word-card';
            div.textContent = w;
            div.onclick = () => this.showDefinition(w);
            this.dom.uList.appendChild(div);
        });
    }

    // --- 4. ANAGRAM LOGIC ---

    handleAnagramCheck() {
        const clean = (s) => s.toLowerCase().replace(/[^a-z]/g, '').split('').sort().join('');
        const p1 = this.dom.aInput1.value;
        const p2 = this.dom.aInput2.value;

        if (!p1 || !p2) return;

        const isMatch = clean(p1) === clean(p2);
        const box = this.dom.aResult;
        
        box.className = `result-banner ${isMatch ? 'success' : 'fail'}`;
        box.innerHTML = isMatch 
            ? `<i class="fa-solid fa-check"></i> YES! They are anagrams.`
            : `<i class="fa-solid fa-xmark"></i> NO. Not a match.`;
    }

    // --- 5. DEFINITION API ---

    async showDefinition(word) {
        this.dom.modal.classList.add('open');
        this.dom.modalTitle.textContent = word;
        this.dom.modalContent.innerHTML = '<div class="loader"></div> Fetching definition...';

        try {
            const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
            if (!res.ok) throw new Error("Not found");
            
            const data = await res.json();
            const meanings = data[0].meanings.slice(0, 2); // Limit to top 2

            let html = '';
            meanings.forEach(m => {
                html += `<div class="def-item">
                    <div class="def-part">${m.partOfSpeech}</div>
                    <div>${m.definitions[0].definition}</div>
                </div>`;
            });
            
            this.dom.modalContent.innerHTML = html;

        } catch (e) {
            this.dom.modalContent.innerHTML = 'Definition not available for this word.';
        }
    }
}

// Start
const app = new App();
