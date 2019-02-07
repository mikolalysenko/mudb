import { MuFixedASCII } from '../schema/fixed-ascii';

export const MuUUIDSchema = new MuFixedASCII(12);
export type MuUUID = typeof MuUUIDSchema['identity'];

export const OBSERVED_UUIDS:{ [uuid:string]:boolean } = {};

// Prefer secure random sources if they exist
const secureRandom:(bytes:Uint8Array) => void = typeof window !== 'undefined' && (
    (window.crypto && window.crypto.getRandomValues) ||
    (window['msCrypto'] && window['msCrypto'].getRandomValues)
) || function (data:Uint8Array) {
    for (let i = 0; i < data.length; ++i) {
        data[i] = Math.random() * 256;
    }
};

function encodeTriplet (a:number, b:number, c:number) {
    return (
        String.fromCharCode((a & 63) + 33) +
        String.fromCharCode((a >> 6) + (b & 15) + 33) +
        String.fromCharCode((b >> 4) + (c >> 6) + 33) +
        String.fromCharCode((c & 63) + 33)
    );
}

const bytes = new Uint8Array(9);
export function createUUID () {
    secureRandom(bytes);
    return (
        encodeTriplet(bytes[0], bytes[1], bytes[2]) +
        encodeTriplet(bytes[3], bytes[4], bytes[5]) +
        encodeTriplet(bytes[6], bytes[7], bytes[8]));
}