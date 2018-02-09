class Pair {
    public x!:number;
    public y!:number;
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

export function fitLine(x:number[], y:number[]) {
    const pairs = zipPairs(x, y);
    const p = pairs[pairs.length >> 1];
    return p.y - p.x;
}
