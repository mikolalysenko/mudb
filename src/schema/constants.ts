export const muPrimitiveTypes = [
    'ascii',
    'boolean',
    'fixed-ascii',
    'float32',
    'float64',
    'int8',
    'int16',
    'int32',
    'utf8',
    'uint8',
    'uint16',
    'uint32',
    'void',
];

export const Constants = {
    float32: {
        EPSILON: 1.401298464324817e-45,
        MIN: 1.1754943508222875e-38,
        MAX: 3.4028234663852886e+38,
    },
    float64: {
        EPSILON: 5e-324,
        MIN: 2.2250738585072014e-308,
        MAX: 1.7976931348623157e+308,
    },
    int8: { MIN: -0x80, MAX: 0x7F },
    int16: { MIN: -0x8000, MAX: 0x7FFF },
    int32: { MIN: -0x80000000, MAX: 0x7FFFFFFF },
    uint8: { MIN: 0, MAX: 0xFF },
    uint16: { MIN: 0, MAX: 0xFFFF },
    uint32: { MIN: 0, MAX: 0xFFFFFFFF },
};

export const muType2TypedArray = {
    float32: Float32Array,
    float64: Float64Array,
    int8: Int8Array,
    int16: Int16Array,
    int32: Int32Array,
    uint8: Uint8Array,
    uint16: Uint16Array,
    uint32: Uint32Array,
};
