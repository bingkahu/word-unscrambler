/**
 * WordUnscrambler Class
 * Handles dictionary loading, permutation generation, and DOM manipulation.
 */
class WordUnscrambler {
    constructor() {
        // State
        this.dictionary = new Set();
        this.isReady = false;
        
        // Configuration
        this.DICTIONARY_URL = 'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt';
        
        // DOM Elements
        this.els = {
            input: document.getElementById('user-input'),
            btn: document.getElementById('solve-btn'),
            list: document.getElementById('results-list'),
            count: document.getElementById('result-count'),
            status: document.getElementById('status-bar'),
            error: document.getElementById('error-msg'),
            sort: document.getElementById('sort-select')
        };

        this.init();
    }

    async init() {
        this.attachEvents();
        await this.loadDictionary();
    }

    /**
     * Fetches the large word list from GitHub
     */
    async loadDictionary() {
        try {
            const response = await fetch(this.DICTIONARY_URL);
            if (!response.ok) throw new Error("Network response was not ok");
            
            const text = await response.text();
            
            // Convert newline-separated text into a Set for O(1) lookups
            // We optimize by splitting by newline
            const words = text.split(/\r?\n/);
            
            words.forEach(word => {
                if (word.length > 1) { // Skip single letters except 'a' and 'i' (handled loosely here)
                    this.dictionary.add(word.toLowerCase());
                }
            });

            this.setReadyState();
        } catch (error) {
            console.error("Dictionary Load Error:", error);
            this.els.status.innerHTML = `<span style="color:red">Error loading dictionary. Check internet.</span>`;
        }
    }

    setReadyState() {
        this.isReady = true;
        this.els.status.classList.add('ready');
        this.els.status.innerHTML = `✅ Dictionary Loaded (${this.dictionary.size.toLocaleString()} words)`;
        this.els.btn.disabled = false;
    }

    attachEvents() {
        // Click "Unscramble"
        this.els.btn.addEventListener('click', () => this.handleSolve());

        // Press "Enter" inside input
        this.els.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSolve();
        });

        // Change Sort Order
        this.els.sort.addEventListener('change', () => {
            // Trigger a re-solve if data exists, or just re-render (simplified here as re-solve)
            if (this.els.input.value) this.handleSolve();
        });
    }

    handleSolve() {
        if (!this.isReady) return;

        const input = this.els.input.value.toLowerCase().trim();
        const sortType = this.els.sort.value; // 'length' or 'alpha'

        // Validation
        this.els.error.textContent = '';
        if (!input || !/^[a-z]+$/.test(input)) {
            this.els.error.textContent = 'Please enter only letters (a-z).';
            return;
        }

        // 1. Generate Logic
        const allCombos = this.getPermutations(input);
        
        // 2. Filter Logic (Check Dictionary)
        const validWords = [...new Set(allCombos)].filter(word => this.dictionary.has(word));

        // 3. Sort Logic
        const sortedWords = this.sortWords(validWords, sortType);

        // 4. Render Logic
        this.render(sortedWords);
    }

    /**
     * Recursive function to generate all substrings/permutations
     */
    getPermutations(str) {
        let results = [];

        // Helper recursive function
        const permute = (currentWord, remainingChars) => {
            if (currentWord.length > 1) results.push(currentWord);
            
            for (let i = 0; i < remainingChars.length; i++) {
                // Take one character out
                const char = remainingChars[i];
                // Remaining is everything else
                const left = remainingChars.slice(0, i) + remainingChars.slice(i + 1);
                // Recurse
                permute(currentWord + char, left);
            }
        };

        permute("", str);
        return results;
    }

    sortWords(words, type) {
        return words.sort((a, b) => {
            if (type === 'length') {
                // Longest first, then alphabetical
                return b.length - a.length || a.localeCompare(b);
            } else {
                // Alphabetical
                return a.localeCompare(b);
            }
        });
    }

    render(words) {
        this.els.list.innerHTML = '';
        this.els.count.textContent = `${words.length} found`;

        if (words.length === 0) {
            this.els.list.innerHTML = `<li style="grid-column: 1/-1; text-align:center; color:#888;">No valid words found.</li>`;
            return;
        }

        // Create document fragment for better performance
        const fragment = document.createDocumentFragment();

        words.forEach(word => {
            const li = document.createElement('li');
            li.className = 'result-tag';
            li.textContent = word;
            fragment.appendChild(li);
        });

        this.els.list.appendChild(fragment);
    }
}

// Initialize the app
const app = new WordUnscrambler();
