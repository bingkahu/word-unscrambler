/* Lexicon Titan Engine */
let dictionary = [];

self.onmessage = async (e) => {
    const { type, payload } = e.data;

    if (type === 'init') {
        const res = await fetch(payload.url);
        const text = await res.text();
        dictionary = text.split('\n');
        return;
    }

    if (type === 'unscramble') {
        const input = payload.letters.toLowerCase();
        const results = dictionary.filter(word => {
            if (word.length > input.length || word.length < 2) return false;
            let temp = input;
            for (let char of word.trim()) {
                if (temp.includes(char)) temp = temp.replace(char, '');
                else return false;
            }
            return true;
        }).sort((a, b) => b.length - a.length);

        self.postMessage({ type: 'result', data: results.slice(0, 50).map(w => ({ word: w })) });
    }
};
