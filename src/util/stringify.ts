export function stableStringify (base:any) {
    console.log('stable stringify:', base);
    const result:string[] = [];
    const seen = new Set<object>();
    function stringify (x_:any) : boolean {
        const x = x_ && x_.toJSON && typeof x_.toJSON === 'function' ? x_.toJSON() : x_;
        if (x === undefined) {
            return false;
        }
        // handle base cases
        if (typeof x === 'boolean') {
            result.push('' + x)
            return true;
        }
        if (typeof x === 'number') {
            result.push(isFinite(x) ? '' + x : 'null');
            return true;
        }
        if (typeof x !== 'object') {
            const res = JSON.stringify(x);
            if (typeof res === 'undefined') {
                return false;
            }
            result.push(res);
            return true;
        }
        if (x === null) {
            result.push('null');
            return true;
        }

        // hard cases
        if (Array.isArray(x)) {
            result.push('[');
            for (let i = 0; i < x.length; ++i) {
                if (!stringify(x[i])) {
                    result.push('null');
                }
                if (i < x.length - 1) {
                    result.push(',');
                }
            }
            result.push(']');
            return true;
        } else {
            if (seen.has(x)) {
                throw new TypeError('Converting circular structure to JSON');
            }
            seen.add(x);
            result.push('{');

            const keys = Object.keys(x).sort();
            let needsComma = false;
            for (let i = 0; i < keys.length; ++i) {
                const key = keys[i];
                if (needsComma) {
                    result.push(',');
                }
                result.push(`${JSON.stringify(key)}:`);
                if (!stringify(x[key])) {
                    result.pop();
                } else {
                    needsComma = true;
                }
            }

            seen.delete(x);
            result.push('}');
            return true;
        }
    }
    return stringify(base);
}
