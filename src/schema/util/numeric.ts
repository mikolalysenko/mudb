import { MuNumericType } from '../type';
import { range } from '../constant/range';

export const fround = (function (a) {
    return function (n:number) : number {
        a[0] = n;
        return a[0];
    };
})(new Float32Array(1));

export function inRange (n:number, muType:MuNumericType) : boolean {
    const r = range[muType];
    return n >= r[0] && n <= r[1];
}
