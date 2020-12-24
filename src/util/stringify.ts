const seen:object[] = [];

export function stableStringify (x_) {
    const x = x_ && x_.toJSON && typeof x_.toJSON === 'function' ? x_.toJSON() : x_;
    if (x === undefined) { return; }
    if (x === true) { return 'true'; }
    if (x === false) { return 'false'; }
    if (typeof x === 'number') { return isFinite(x) ? '' + x : 'null'; }
    if (typeof x !== 'object') { return JSON.stringify(x); }

    if (x === null) { return 'null'; }
    if (Array.isArray(x)) {
        let str = '[';
        const tail = x.length - 1;
        for (let i = 0; i < tail; ++i) {
            str += (stableStringify(x[i]) || 'null') + ',';
        }
        if (tail >= 0) {
            str += stableStringify(x[tail]) || 'null';
        }
        return str + ']';
    } else {
        if (seen.indexOf(x) !== -1) {
            throw new TypeError('Converting circular structure to JSON');
        }
        const idx = seen.push(x) - 1;

        let str = '';
        const keys = Object.keys(x).sort();
        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            const val = stableStringify(x[key]);
            if (val !== undefined) {
                if (str) { str += ','; }
                str += `${JSON.stringify(key)}:${val}`;
            }
        }

        seen[idx] = seen[seen.length - 1];
        seen.pop();
        return `{${str}}`;
    }
};
