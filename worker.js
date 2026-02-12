let dictionary = [];

self.onmessage = async (e) => {
    const { type, payload, id } = e.data;

    if (type === 'init') {
        const res = await fetch(payload.url);
        const text = await res.text();
        dictionary = text.split(/\r?\n/).filter(w => w.length > 2);
        self.postMessage({ type: 'ready' });
        return;
    }

    let results = [];

    if (type === 'unscramble') {
        const input = payload.letters.toLowerCase();
        results = dictionary.filter(word => {
            if (word.length > input.length) return false;
            let temp = input;
            for (let char of word) {
                if (temp.includes(char)) temp = temp.replace(char, '');
                else return false;
            }
            return true;
        }).sort((a,b) => b.length - a.length);
    }

    if (type === 'spellingbee') {
        const center = payload.center.toLowerCase();
        const allowed = (payload.center + payload.outer).toLowerCase();
        results = dictionary.filter(w => {
            if (w.length < 4 || !w.includes(center)) return false;
            for (let char of w) if (!allowed.includes(char)) return false;
            return true;
        });
    }

    if (type === 'wordle') {
        const { green, yellow, gray } = payload;
        results = dictionary.filter(w => {
            if (w.length !== 5) return false;
            // Gray check
            for (let c of gray) if (w.includes(c)) return false;
            // Yellow check
            for (let c of yellow) if (!w.includes(c)) return false;
            // Green check (regex)
            const pattern = new RegExp(`^${green.replace(/\./g, '.')}$`);
            return pattern.test(w);
        });
    }

    self.postMessage({ 
        type: 'result', 
        id, 
        data: results.map(w => ({ word: w })) 
    });
};
