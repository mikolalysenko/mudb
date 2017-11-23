// solve for model. parameters a,b.
//  f(x) = ax + b
//
// loss
//  L = sum((f(xi) - yi)^2)
//      sum((axi + b - yi)^2)
//      sum(a^2 xi^2 + a b xi - a xi yi + a b xi + b^2 - b yi - a xi yi - b yi + yi^2)
//      sum(a^2 xi^2 + 2 a b xi - 2 a xi yi + b^2 - 2 b yi + yi^2)
//
//  dL / da = sum(2 a xi^2 + 2 b xi - 2 xi yi)
//          ~ a sum(xi^2) + b sum(xi) - sum(xi yi)
//
//  dL / db = sum(2 a xi + 2 b - 2 yi)
//          ~ a sum(xi) + n b - sum(yi)
//

class Pair {
    public x:number;
    public y:number;
}

const pairList:Pair[] = [];
const pairPool:Pair[] = [];

function comparePair (a:Pair, b:Pair) {
    return (a.x - a.y) - (b.x - b.y);
}

function zipPairs (x:number[], y:number[]) : Pair[] {
    const N = x.length;
    while (pairPool.length < N) {
        pairPool.push(new Pair());
    }
    pairList.length = N;
    for (let i = 0; i < N; ++i) {
        const p = pairPool[i];
        pairList[i] = p;
        p.x = x[i];
        p.y = y[i];
    }
    pairList.sort(comparePair);
    return pairList;
}

export function fitLine(x:number[], y:number[]) : { a:number, b:number } {
    const pairs = zipPairs(x, y);

    const startIdx = Math.floor(pairs.length * 1 / 6);
    const endIdx = Math.ceil(pairs.length * 5 / 6);
    const n = endIdx - startIdx;

    let sumX2 = 0;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;

    for (let i = startIdx; i < endIdx; ++i) {
        const p = pairs[i];
        const xi = p.x;
        const yi = p.y;
        sumX2 += xi * xi;
        sumX += xi;
        sumY += yi;
        sumXY += xi * yi;
    }

    const det = sumX2 * n - sumX * sumX;
    if (Math.abs(det) < 1e-6) {
        const p = pairs[pairs.length >> 1];
        return { a: 1, b: p.y - p.x };
    }

    const a0 = n / det;
    const a1 = -sumX / det;
    const a2 = sumX2 / det;

    return {
        a: sumXY * a0 + sumY * a1,
        b: sumXY * a1 + sumY * a2,
    };
}
