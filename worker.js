let dictionary = [];

self.onmessage = async (e) => {
    const { type, url, payload, containerId } = e.data;

    if (type === 'init') {
        const response = await fetch(url);
        const text = await response.text();
        // Load words and filter out short junk
        dictionary = text.split(/\r?\n/).filter(w => w.length >= 3);
        self.postMessage({ type: 'ready' });
        return;
    }

    let results = [];

    if (type === 'unscramble') {
        const target = payload.letters;
        results = dictionary.filter(word => {
            if (word.length > target.length) return false;
            let hand = target;
            for (let char of word) {
                if (hand.includes(char)) hand = hand.replace(char, '');
                else return false;
            }
            return true;
        }).sort((a,b) => b.length - a.length);
    }

    if (type === 'bee') {
        const center = payload.center;
        const allowed = center + payload.outer;
        results = dictionary.filter(w => {
            if (w.length < 4 || !w.includes(center)) return false;
            for (let char of w) if (!allowed.includes(char)) return false;
            return true;
        });
    }

    if (type === 'wordle') {
        const { green, yellow, gray } = payload;
        const pattern = new RegExp(`^${green.replace(/\./g, '.')}$`);
        
        results = dictionary.filter(w => {
            if (w.length !== 5) return false;
            // Gray check
            for (let char of gray) if (w.includes(char)) return false;
            // Yellow check
            for (let char of yellow) if (!w.includes(char)) return false;
            // Green pattern check
            return pattern.test(w);
        });
    }

    self.postMessage({ 
        type: 'results', 
        containerId, 
        words: results.map(w => ({ word: w })) 
    });
};
