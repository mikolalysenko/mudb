import { pair } from '../../type';

export const range = {
    float32:    pair(-3.4028234663852886e+38,   3.4028234663852886e+38),
    float64:    pair(-1.7976931348623157e+308,  1.7976931348623157e+308),
    int8:       pair(-128,          127),
    int16:      pair(-32768,        32767),
    int32:      pair(-2147483648,   2147483647),
    uint8:      pair(0,             255),
    uint16:     pair(0,             65535),
    uint32:     pair(0,             4294967295),
};
