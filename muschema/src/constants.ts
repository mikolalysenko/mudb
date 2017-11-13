export = {
    int8: { MIN: -0x80, MAX: 0x7F },
    int16: { MIN: -0x8000, MAX: 0x7FFF },
    int32: { MIN: -0x80000000, MAX: 0x7FFFFFFF },
    uint8: { MIN: 0, MAX: 0xFF },
    uint16: { MIN: 0, MAX: 0xFFFF },
    uint32: { MIN: 0, MAX: 0xFFFFFFFF },
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
};
