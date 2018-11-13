// random boolean

export function randBool () {
    return Math.random() >= 0.5;
}

// random integer

export function randInt (min:number, max:number) : number {
    return Math.floor(Math.random() * (max - min + 1) + min);
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

export function randFloat32 () {
    const u32a = new Uint32Array([randUint32()]);
    const f32a = new Float32Array(u32a.buffer);

    // in case of NaN
    while (f32a[0] !== f32a[0]) {
        u32a[0] = randUint32();
    }
    return f32a[0];
}

export function randFloat64 () {
    const u32a = new Uint32Array([randUint32(), randUint32()]);
    const f64a = new Float64Array(u32a.buffer);

    // in case of NaN
    while (f64a[0] !== f64a[0]) {
        u32a[1] = randUint32();
    }
    return f64a[0];
}
