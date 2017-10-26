import StringEncode = require('./string');

let encodeString:(str:string) => Uint8Array;
let decodeString:(bytes:Uint8Array) => string;

if ('TextEncoder' in window) {
    const encoder = new (<any>window).TextEncoder();
    encodeString = (str) => encoder.encode(str);

    const decoder = new (<any>window).TextDecoder();
    decodeString = (bytes) => decoder.decode(bytes);
} else {
    encodeString = StringEncode.encodeString;
    decodeString = StringEncode.decodeString;
}

export = {
    encodeString,
    decodeString,
};
