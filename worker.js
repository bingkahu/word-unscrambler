/* Lexicon Ultra - Web Worker
 * Handles Dictionary IO, Search Algorithms, and Scoring
 */

let dictionary = [];
let dictionarySet = new Set();
let isReady = false;

// Scrabble Scores
const SCORES = {
    a: 1, b: 3, c: 3, d: 2, e: 1, f: 4, g: 2, h: 4, i: 1, j: 8, k: 5, l: 1, m: 3,
    n: 1, o: 1, p: 3, q: 10, r: 1, s: 1, t: 1, u: 1, v: 4, w: 4, x: 8, y: 4, z: 10
};

self.onmessage = async function(e) {
    const { type, payload, id } = e.data;

    if (type === 'init') {
        await loadDictionary(payload.url);
        self.postMessage({ type: 'ready' });
    } 
    else if (!isReady) {
        self.postMessage({ type: 'error', message: 'Dictionary loading...' });
    }
    else {
        // Route to specific logic
        let results = [];
        const startTime = performance.now();

        switch (type) {
            case 'unscramble': results = handleUnscramble(payload); break;
            case 'pattern': results = handlePattern(payload); break;
            case 'wordle': results = handleWordle(payload); break;
            case 'spellingbee': results = handleSpellingBee(payload); break;
        }

        const endTime = performance.now();
        self.postMessage({ 
            type: 'result', 
            id: id,
            data: results, 
            time: (endTime - startTime).toFixed(2) 
        });
    }
};

async function loadDictionary(url) {
    try {
        const res = await fetch(url);
        const text = await res.text();
        // Split and filter empty/short strings
        dictionary = text.split(/\r?\n/).filter(w => w.length > 1);
        dictionarySet = new Set(dictionary);
        isReady = true;
    } catch (err) {
        console.error("Worker Dictionary Load Fail", err);
    }
}

function getScore(word) {
    return word.split('').reduce((acc, c) => acc + (SCORES[c] || 0), 0);
}

// --- ALGORITHMS ---

// 1. Unscrambler (Frequency Map Approach for High Performance)
function handleUnscramble({ letters, starts, ends, sort }) {
    const input = letters.toLowerCase();
    const mustStart = starts ? starts.toLowerCase() : '';
    const mustEnd = ends ? ends.toLowerCase() : '';
    
    // Frequency map of input
    const inputFreq = {};
    let wildcards = 0;
    for (let char of input) {
        if (char === '?') wildcards++;
        else inputFreq[char] = (inputFreq[char] || 0) + 1;
    }

    const results = [];

    // Single pass through dictionary (O(N) where N = 370k)
    // Much faster than generating permutations for 15 letters
    for (let i = 0; i < dictionary.length; i++) {
        const word = dictionary[i];
        
        // Basic Length Filters
        if (word.length > input.length) continue;
        if (mustStart && !word.startsWith(mustStart)) continue;
        if (mustEnd && !word.endsWith(mustEnd)) continue;

        // Check if word can be formed
        let tempWildcards = wildcards;
        let possible = true;
        
        // Optimization: creating freq map for every word is slow. 
        // We iterate the word chars and subtract from input freq.
        const currentFreq = { ...inputFreq }; // Shallow copy is ok for flat obj

        for (let char of word) {
            if (currentFreq[char] > 0) {
                currentFreq[char]--;
            } else if (tempWildcards > 0) {
                tempWildcards--;
            } else {
                possible = false;
                break;
            }
        }

        if (possible) {
            results.push({ word, score: getScore(word) });
        }
    }

    // Sort
    return sortResults(results, sort);
}

// 2. Pattern Matcher (Regex)
function handlePattern({ pattern }) {
    // Convert "c_t" to /^c.t$/
    const regexStr = '^' + pattern.toLowerCase().replace(/_/g, '.') + '$';
    const regex = new RegExp(regexStr);
    
    return dictionary
        .filter(w => regex.test(w))
        .map(w => ({ word: w, score: getScore(w) }));
}

// 3. Wordle Solver
function handleWordle({ correct, present, absent }) {
    // correct: ".a..e" (5 chars)
    // present: "r,s"
    // absent: "m,o"
    
    const badChars = new Set(absent.split(',').filter(c=>c).map(c=>c.trim()));
    const mustHave = present.split(',').filter(c=>c).map(c=>c.trim());
    
    return dictionary.filter(word => {
        if (word.length !== 5) return false;

        // 1. Check Gray letters (Absent)
        for (let char of word) {
            if (badChars.has(char)) return false;
        }

        // 2. Check Yellow letters (Present somewhere)
        for (let char of mustHave) {
            if (!word.includes(char)) return false;
        }

        // 3. Check Green letters (Correct position)
        if (correct) {
            for (let i = 0; i < 5; i++) {
                if (correct[i] !== '.' && correct[i] !== word[i]) return false;
            }
        }

        return true;
    }).map(w => ({ word: w, score: getScore(w) }));
}

// 4. Spelling Bee
function handleSpellingBee({ center, outer }) {
    if (!center) return [];
    const centerChar = center.toLowerCase();
    const validChars = new Set((center + outer).toLowerCase().split(''));

    return dictionary.filter(word => {
        if (word.length < 4) return false;
        if (!word.includes(centerChar)) return false;
        
        // Check if all letters are in the valid set
        for (let char of word) {
            if (!validChars.has(char)) return false;
        }
        return true;
    }).map(w => ({ word: w, score: word.length === 4 ? 1 : word.length }));
}

// Helper: Sorter
function sortResults(items, mode) {
    if (mode === 'score') return items.sort((a,b) => b.score - a.score);
    if (mode === 'alpha') return items.sort((a,b) => a.word.localeCompare(b.word));
    return items.sort((a,b) => b.word.length - a.word.length || a.word.localeCompare(b.word)); // Default length
}
