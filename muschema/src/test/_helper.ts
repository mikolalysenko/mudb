import {
    Constants,
    primitiveMuTypes,
} from '../constants';

function randomSign () {
    return Math.random() < 0.5 ? -1 : 1;
}

function fround (float) {
    const fa = new Float32Array(1);
    fa[0] = float;
    return fa[0];
}

function randomCodePoint () {
    // to avoid the surrogates issue
    const MAX_CODE_POINT = 0xD7FF;
    return Math.random() * MAX_CODE_POINT | 0;
}

export function randomString (maxLength:number) {
    const length = Math.random() * maxLength | 0;
    const charCodes = new Array(length);
    for (let i = 0; i < length; ++i) {
        charCodes[i] = randomCodePoint();
    }
    return String.fromCharCode.apply(null, charCodes);
}

export function randomValue (muType:string) {
    const MAX = Constants[muType] && Constants[muType].MAX;
    const MIN = Constants[muType] && Constants[muType].MIN;
    switch (muType) {
        case 'boolean':
            return Math.random() < 0.5 ? false : true;
        case 'float32':
            return fround(randomSign() * Math.random() * 10 * MIN);
        case 'float64':
            return randomSign() * Math.random() * 10 * MIN;
        case 'int8':
        case 'int16':
        case 'int32':
            return randomSign() * Math.random() * MAX | 0;
        case 'string':
            return randomString(20);
        case 'uint8':
        case 'uint16':
        case 'uint32':
            return Math.random() * MAX >>> 0;
        default:
            return;
    }
}
