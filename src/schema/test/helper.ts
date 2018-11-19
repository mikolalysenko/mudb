import {
    MuReadStream,
    MuWriteStream,
} from '../../stream';

import {
    MuSchema,
    MuASCII,
    MuBoolean,
    MuFloat32,
    MuFloat64,
    MuInt8,
    MuInt16,
    MuInt32,
    MuUTF8,
    MuUint8,
    MuUint16,
    MuUint32,
} from '../index';
import { Constants } from '../constants';

export function muNumberSchema (muType) {
    const map = {
        float32: () => new MuFloat32(),
        float64: () => new MuFloat64(),
        int8: () => new MuInt8(),
        int16: () => new MuInt16(),
        int32: () => new MuInt32(),
        uint8: () => new MuUint8(),
        uint16: () => new MuUint16(),
        uint32: () => new MuUint32(),
    };
    if (muType in map) {
        return map[muType]();
    }
}

export function muPrimitiveSchema (muType) {
    const map = {
        ascii: () => new MuASCII(),
        boolean: () => new MuBoolean(),
        float32: () => new MuFloat32(),
        float64: () => new MuFloat64(),
        int8: () => new MuInt8(),
        int16: () => new MuInt16(),
        int32: () => new MuInt32(),
        uint8: () => new MuUint8(),
        uint16: () => new MuUint16(),
        uint32: () => new MuUint32(),
        utf8: () => new MuUTF8(),
    };
    if (muType in map) {
        return map[muType]();
    }
}

export function simpleStrOfLeng (length) {
    const ingredient = 'abc';

    const chars = new Array(length);
    for (let i = 0; i < length; ++i) {
        chars[i] = ingredient.charAt(Math.random() * ingredient.length | 0);
    }
    return chars.join('');
}

export function randomString () {
    function randomCodePoint () {
        // to avoid the surrogates issue
        const MAX_CODE_POINT = 0xD7FF;
        return Math.random() * MAX_CODE_POINT | 0;
    }

    const length = Math.random() * 20 + 1 | 0;
    const codePoints = new Array(length);
    for (let i = 0; i < length; ++i) {
        codePoints[i] = randomCodePoint();
    }

    return String.fromCharCode.apply(String, codePoints);
}

export function randomShortStr () {
    const length = Math.random() * 3 + 1 | 0;
    return simpleStrOfLeng(length);
}

export function randomValue (muType:string) {
    function randomASCII () {
        const length = Math.random() * 21 | 0;
        const codePoints = new Array(length);
        for (let i = 0; i < length; ++i) {
            codePoints[i] = Math.random() * 0x80 | 0;
        }
        return String.fromCharCode.apply(null, codePoints);
    }

    function randomSign () {
        return Math.random() < 0.5 ? -1 : 1;
    }

    function randomFloat32 () {
        function fround (n:number) {
            const fa = new Float32Array(1);
            fa[0] = n;
            return fa[0];
        }

        const exponent = randomSign() * (Math.random() * 38 | 0);
        return fround(Math.random() * 10 ** exponent);
    }

    function randomFloat64 () {
        const exponent = randomSign() * (Math.random() * 308 | 0);
        return Math.random() * 10 ** exponent;
    }

    switch (muType) {
        case 'ascii':
            return randomASCII();
        case 'boolean':
            return Math.random() < 0.5 ? false : true;
        case 'float32':
            return randomFloat32();
        case 'float64':
            return randomFloat64();
        case 'int8':
        case 'int16':
        case 'int32':
            return randomSign() * Math.round(Math.random() * Constants[muType].MAX);
        case 'uint8':
        case 'uint16':
        case 'uint32':
            return Math.round(Math.random() * Constants[muType].MAX);
        case 'utf8':
            return randomString();
        default:
            return;
    }
}

export function testPatchingFactory (t, schema:MuSchema<any>, fn?) {
    function diffPatch (a, b) {
        const ws = new MuWriteStream(2);
        schema.diff(a, b, ws);
        const rs = new MuReadStream(ws.bytes());
        if (rs.length) {
            const r = schema.patch(a, rs);
            t.equals(rs.offset, rs.length, 'no bytes left in stream');
            return r;
        } else {
            t.same(a, b, 'empty patch consistent');
            return schema.clone(a);
        }
    }

    return  fn ?
            (a, b) => {
                t.same(diffPatch(a, b), fn(b));
            }
            :
            (a, b) => {
                t.same(diffPatch(a, b), b);
            };
}

export function testPatchingPairFactory (t, schema:MuSchema<any>, fn?) {
    const test = fn ? testPatchingFactory(t, schema, fn) : testPatchingFactory(t, schema);

    return (a, b) => {
        test(a, b);
        test(b, a);
    };
}
