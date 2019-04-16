export let perfNow:() => number;

if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    perfNow = () => performance.now();
} else if (typeof process !== 'undefined' && typeof process.hrtime === 'function') {
    perfNow = (() => {
        function nanoSeconds () {
            const hrt = process.hrtime();
            return hrt[0] * 1e9 + hrt[1];
        }
        const loadTime = nanoSeconds() - process.uptime() * 1e9;
        return () => (nanoSeconds() - loadTime) / 1e6;
    })();
} else if (typeof Date.now === 'function') {
    perfNow = (() => {
        const loadTime = Date.now();
        return () => Date.now() - loadTime;
    })();
} else {
    perfNow = (() => {
        const loadTime = new Date().getTime();
        return () => new Date().getTime() - loadTime;
    })();
}
