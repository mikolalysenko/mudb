import { MuDictionary, MuUint8 } from '../';
import { deltaByteLength, diffPatchDuration } from './_do';

const uint8Dictionary = new MuDictionary(new MuUint8(), Infinity);

deltaByteLength(uint8Dictionary, {}, {});
deltaByteLength(uint8Dictionary, {a: 0}, {a: 0});

deltaByteLength(uint8Dictionary, {}, {a: 0});
deltaByteLength(uint8Dictionary, {}, {a: 0, b: 1});
deltaByteLength(uint8Dictionary, {}, {a: 0, b: 1, c: 2});
deltaByteLength(uint8Dictionary, {a: 0}, {a: 0, b: 1});
deltaByteLength(uint8Dictionary, {b: 1}, {a: 0, b: 1});
deltaByteLength(uint8Dictionary, {a: 1}, {a: 0, b: 1});
deltaByteLength(uint8Dictionary, {b: 0}, {a: 0, b: 1});

deltaByteLength(uint8Dictionary, {a: 0}, {});
deltaByteLength(uint8Dictionary, {a: 0, b: 1}, {});
deltaByteLength(uint8Dictionary, {a: 0, b: 1, c: 2}, {});
deltaByteLength(uint8Dictionary, {a: 0, b: 1}, {a: 0});
deltaByteLength(uint8Dictionary, {a: 0, b: 1}, {b: 1});
deltaByteLength(uint8Dictionary, {a: 0, b: 1, c: 2}, {a: 0, b: 1});

deltaByteLength(uint8Dictionary, {a: 0}, {a: 1});
deltaByteLength(uint8Dictionary, {a: 0, b: 1}, {a: 1, b: 2});

deltaByteLength(uint8Dictionary, {a: 0}, {b: 0});
deltaByteLength(uint8Dictionary, {a: 0, b: 0}, {c: 0, d: 0});

const d1 = {a: 0, b: 0, c: 0};
const d2 = {d: 1, e: 2, f: 3};

diffPatchDuration(uint8Dictionary, d1, d1, 1);
diffPatchDuration(uint8Dictionary, d1, d1, 10);
diffPatchDuration(uint8Dictionary, d1, d1, 100);
diffPatchDuration(uint8Dictionary, d1, d1, 1e3);

diffPatchDuration(uint8Dictionary, d1, d2, 10);
diffPatchDuration(uint8Dictionary, d1, d2, 100);
diffPatchDuration(uint8Dictionary, d1, d2, 1e3);
diffPatchDuration(uint8Dictionary, d1, d2, 1e4);
diffPatchDuration(uint8Dictionary, d1, d2, 1e5);
