let dictionary = [];

const sources = {
    'en': 'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt',
    'pl': 'https://raw.githubusercontent.com/bieli/polish-dictionary/master/dictionary/pl_PL.dic',
    'es': 'https://raw.githubusercontent.com/javierarce/palabras/master/listado-general.txt'
};

self.onmessage = async (e) => {
    const { type, lang, payload, containerId } = e.data;

    if (type === 'init') {
        const url = sources[lang] || sources['en'];
        const response = await fetch(url);
        const text = await response.text();
        
        // Split lines, remove dictionary flags (like /n), lowercase, and filter tiny words
        dictionary = text.split(/\r?\n/)
            .map(w => w.split('/')[0].toLowerCase().trim())
            .filter(w => w.length >= 3);
            
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
            for (let char of gray) if (w.includes(char)) return false;
            for (let char of yellow) if (!w.includes(char)) return false;
            return pattern.test(w);
        });
    }

    self.postMessage({ 
        type: 'results', 
        containerId, 
        words: results.map(w => ({ word: w })) 
    });
};
