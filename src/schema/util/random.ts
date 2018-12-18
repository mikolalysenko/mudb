// random boolean

export function randBool () {
    return Math.random() >= 0.5;
}

// random integer

export function randInt (min:number, max:number) : number {
    return Math.random() * (max - min + 1) + min | 0;
}

export function randInt8 () {
    return randInt(-0x80, 0x7F);
}

export function randInt16 () {
    return randInt(-0x8000, 0x7FFF);
}

export function randInt32 () {
    return randInt(-0x80000000, 0x7FFFFFFF);
}

export function randUint8 () {
    return randInt(0, 0xFF);
}

export function randUint16 () {
    return randInt(0, 0xFFFF);
}

export function randUint32 () {
    return randInt(0, 0xFFFFFFFF);
}

// random float

export function randFloat (min:number, max:number) : number {
    return Math.random() * (max - min) + min;
}

const dv = new DataView(new ArrayBuffer(8));

export function randFloat32 () {
    let f;
    do {
        dv.setUint32(0, randUint32(), true);
        f = dv.getFloat32(0, true);
    } while (isNaN(f));
    return f;
}

export function randFloat64 () {
    dv.setUint32(0, randUint32(), true);
    dv.setUint32(4, randUint32(), true);
    return dv.getFloat64(0, true);
}

// random array

export function randArray () {
    const a = new Array(Math.random() * 10 | 0);
    for (let i = 0; i < a.length; ++i) {
        a[i] = randFloat32();
    }
    return a;
}

export function randVec (dimension:number) {
    const v = new Float32Array(dimension);
    for (let i = 0; i < v.length; ++i) {
        v[i] = randFloat32();
    }
    return v;
}
