import { MuDictionary, MuUint8 } from '../';
import { deltaByteLength, diffPatchDuration } from './_do';

const dict = new MuDictionary(new MuUint8(), Infinity);

deltaByteLength(dict, {}, {a: 0});
deltaByteLength(dict, {}, {a: 0, b: 1});
deltaByteLength(dict, {}, {a: 0, b: 1, c: 2});
deltaByteLength(dict, {}, {pool: 0});
deltaByteLength(dict, {}, {pool: 0, preface: 1});
deltaByteLength(dict, {}, {pool: 0, preface: 1, prefix: 2});
deltaByteLength(dict, {}, {pool: 0, preface: 1, prefix: 2, prefixed: 3});

const d0 = {};
const d1 = {a: 0, b: 0, c: 0};
const d2 = {pool: 0, preface: 1, prefix: 2, prefixed: 3};

diffPatchDuration(dict, d1, d1, 1e3, 'b=t');

diffPatchDuration(dict, d0, d1, 1e3, 'no common prefix');
diffPatchDuration(dict, d0, d1, 1e4, 'no common prefix');
diffPatchDuration(dict, d0, d1, 1e5, 'no common prefix');

diffPatchDuration(dict, d0, d2, 1e3, 'common prefix');
diffPatchDuration(dict, d0, d2, 1e4, 'common prefix');
diffPatchDuration(dict, d0, d2, 1e5, 'common prefix');
