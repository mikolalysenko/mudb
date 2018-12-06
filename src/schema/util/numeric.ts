export const fround = (function (a) {
    return function (n:number) : number {
        a[0] = n;
        return a[0];
    };
})(new Float32Array(1));

export const inRange = (function (rangeTable) {
    return function (n:number, type:string) : boolean {
        const range = rangeTable[type];
        return n >= range[0] && n <= range[1];
    };
})({
    float32:    [-3.4e+38,          3.4e+38],
    float64:    [-Number.MAX_VALUE, Number.MAX_VALUE],
    int8:       [-0x80,             0x7F],
    int16:      [-0x8000,           0x7FFF],
    int32:      [-0x80000000,       0x7FFFFFFF],
    uint8:      [0,                 0xFF],
    uint16:     [0,                 0xFFFF],
    uint32:     [0,                 0xFFFFFFFF],
});
