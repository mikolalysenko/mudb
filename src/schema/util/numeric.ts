export const fround = (function (a) {
    return function (n:number) {
        a[0] = n;
        return a[0];
    };
})(new Float32Array(1));
