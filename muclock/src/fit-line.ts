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

export function fitLine(x:number[], y:number[]) : { a:number, b:number } {
    const n = x.length;

    let sumX2 = 0;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;

    for (let i = 0; i < n; ++i) {
        const xi = x[i];
        const yi = y[i];
        sumX2 += xi * xi;
        sumX += xi;
        sumY += yi;
        sumXY += xi * yi;
    }

    const det = sumX2 * n - sumX * sumX;
    if (Math.abs(det) < 1e-6) {
        return { a: 1, b: y[0] - x[0] };
    }

    const a0 = n / det;
    const a1 = -sumX / det;
    const a2 = sumX2 / det;

    return {
        a: sumXY * a0 + sumY * a1,
        b: sumXY * a1 + sumY * a2,
    };
}
