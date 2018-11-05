import * as StringCodec from './string';

let encodeString:(str:string) => Uint8Array;
let decodeString:(bytes:Uint8Array) => string;

// @ts-ignore: No implicit this
if (this.TextEncoder) {
    // @ts-ignore: No implicit this
    const encoder = new this.TextEncoder();
    encodeString = (str) => encoder.encode(str);

    // @ts-ignore: No implicit this
    const decoder = new this.TextDecoder();
    decodeString = (bytes) => decoder.decode(bytes);
} else {
    encodeString = StringCodec.encodeString;
    decodeString = StringCodec.decodeString;
}

export {
    encodeString,
    decodeString,
};
