// boolean

export function randBool () {
    return Math.random() >= 0.5;
}

// integer

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
    return randInt(0, 0xFFFFFFFF) >>> 0;
}

// float

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
    let f;
    do {
        dv.setUint32(0, randUint32(), true);
        dv.setUint32(4, randUint32(), true);
        f  = dv.getFloat64(0, true);
    } while (isNaN(f));
    return f;
}
