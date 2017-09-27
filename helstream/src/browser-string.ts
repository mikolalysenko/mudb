let encodeString:(str:string) => Uint8Array;
let decodeString:(bytes:Uint8Array) => string;

if ('TextEncoder' in window) {
    const encoder = new (<any>window).TextEncoder();
    encodeString = (str:string) => encoder.encode(str);
} else {
    // TODO
    encodeString = (str:string) => new Uint8Array(0);
}

if ('TextDecoder' in window) {
    const decoder = new (<any>window).TextDecoder();
    decodeString = (bytes:Uint8Array) => decoder.decode(bytes);
} else {
    // TODO
    decodeString = (bytes:Uint8Array) => '';
}

export = {
    encodeString,
    decodeString,
};