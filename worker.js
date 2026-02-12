/* Lexicon Titan - Background Worker */

let dictionary = [];
let isReady = false;

// Scrabble Point Values
const POINTS = {
    a:1, b:3, c:3, d:2, e:1, f:4, g:2, h:4, i:1, j:8, k:5, l:1, m:3,
    n:1, o:1, p:3, q:10, r:1, s:1, t:1, u:1, v:4, w:4, x:8, y:4, z:10
};

self.onmessage = async (e) => {
    const { type, payload, id } = e.data;

    if (type === 'init') {
        try {
            const res = await fetch(payload.url);
            const text = await res.text();
            dictionary = text.split(/\r?\n/).filter(w => w.length > 1);
            isReady = true;
            self.postMessage({ type: 'ready' });
        } catch(err) {
            self.postMessage({ type: 'error', message: 'Failed to load words' });
        }
        return;
    }

    if (!isReady) return;

    let results = [];
    const start = performance.now();

    // -- LOGIC ROUTER --
    if (type === 'unscramble') results = doUnscramble(payload);
    else if (type === 'spellingbee') results = doSpellingBee(payload);
    else if (type === 'wordle') results = doWordle(payload);
    else if (type === 'pattern') results = doPattern(payload);

    const time = (performance.now() - start).toFixed(2);
    self.postMessage({ type: 'result', id, data: results, time });
};

// --- CORE ALGORITHMS ---

function getScore(word) {
    return word.split('').reduce((a,c) => a + (POINTS[c] || 0), 0);
}

function doUnscramble({ letters, start, end, sort }) {
    const input = letters.toLowerCase();
    const map = {};
    let wildcards = 0;
    
    for (let c of input) {
        if(c === '?') wildcards++;
        else map[c] = (map[c] || 0) + 1;
    }

    return dictionary.filter(word => {
        if (word.length > input.length) return false;
        if (start && !word.startsWith(start.toLowerCase())) return false;
        if (end && !word.endsWith(end.toLowerCase())) return false;

        let tempMap = {...map};
        let tempWild = wildcards;
        
        for (let char of word) {
            if (tempMap[char] > 0) tempMap[char]--;
            else if (tempWild > 0) tempWild--;
            else return false;
        }
        return true;
    }).map(w => ({ word: w, score: getScore(w) }))
      .sort((a,b) => sort === 'length' ? b.word.length - a.word.length : b.score - a.score);
}

function doSpellingBee({ center, outer }) {
    if (!center) return [];
    const main = center.toLowerCase();
    const allowed = new Set((center + outer).toLowerCase().split(''));

    return dictionary.filter(w => {
        if (w.length < 4) return false;      // Min length 4
        if (!w.includes(main)) return false; // Must have center
        for (let c of w) {
            if (!allowed.has(c)) return false; // Only allowed chars
        }
        return true;
    }).map(w => ({ word: w, score: w.length === 4 ? 1 : w.length }));
}

function doWordle({ green, yellow, gray }) {
    // green: ['.', 'a', '.', '.', 'e']
    // yellow: 'r,s'
    // gray: 'm,o'
    
    const bad = new Set(gray.split(/[ ,]+/).filter(Boolean));
    const must = yellow.split(/[ ,]+/).filter(Boolean);

    return dictionary.filter(w => {
        if (w.length !== 5) return false;

        // 1. Check Bad
        for (let c of w) {
            if (bad.has(c)) return false;
        }
        // 2. Check Must Haves
        for (let c of must) {
            if (!w.includes(c)) return false;
        }
        // 3. Check Positions (Green)
        for (let i=0; i<5; i++) {
            if (green[i] && green[i] !== '' && green[i] !== w[i]) return false;
        }
        return true;
    }).map(w => ({ word: w, score: getScore(w) }));
}

function doPattern({ pattern }) {
    // pattern: "c_m_u_e"
    const reg = new RegExp('^' + pattern.replace(/[_.]/g, '.') + '$', 'i');
    return dictionary
        .filter(w => reg.test(w))
        .map(w => ({ word: w, score: getScore(w) }));
}
