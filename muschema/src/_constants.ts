export const muPrimitiveSize = {
    'boolean': 1,
    'uint8': 1,
    'uint16': 2,
    'uint32': 4,
    'int8': 1,
    'int16': 2,
    'int32': 4,
    'float32': 4,
    'float64': 8,
};

export const muPrimitiveTypes = Object.keys(muPrimitiveSize);

export const muNonPrimitiveTypes = [
    'array',
    'dictionary',
    'sorted',
    'struct',
    'union',
    'vector',
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

export const muType2WriteMethod = {
    boolean: 'writeUint8',
    float32: 'writeFloat32',
    float64: 'writeFloat64',
    int8: 'writeInt8',
    int16: 'writeInt16',
    int32: 'writeInt32',
    string: 'writeString',
    uint8: 'writeUint8',
    uint16: 'writeUint16',
    uint32: 'writeUint32',
};

export const muType2ReadMethod = {
    boolean: 'readUint8',
    float32: 'readFloat32',
    float64: 'readFloat64',
    int8: 'readInt8',
    int16: 'readInt16',
    int32: 'readInt32',
    string: 'readString',
    uint8: 'readUint8',
    uint16: 'readUint16',
    uint32: 'readUint32',
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
