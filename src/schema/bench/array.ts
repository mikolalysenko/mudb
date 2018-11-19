import {
    MuArray,
    MuUint32,
} from '../';

import {
    calcContentBytes,
    createWriteStreams,
    createReadStreams,
    genArray,
} from './gendata';

console.log('---------- array ----------');
console.log('100Kx targets with 10 elements');

const u32Schema = new MuArray(new MuUint32());

const ten1 = genArray('uint32', 10);
const ten2 = genArray('uint32', 10);
let half = genArray('uint32', 5);
let doubled = genArray('uint32', 20);

let outs = createWriteStreams(1e5);

console.time('diff same length');
for (let i = 0; i < 1e5; ) {
    u32Schema.diff(ten1, ten2, outs[i++]);
    u32Schema.diff(ten2, ten1, outs[i++]);
}
console.timeEnd('diff same length');

let meanContentBytes = calcContentBytes(outs);
outs = createWriteStreams(1e5);

console.time('diff shorter against longer');
for (let i = 0; i < 1e5; ++i) {
    u32Schema.diff(half, ten1, outs[i]);
}
console.timeEnd('diff shorter against longer');

outs = createWriteStreams(1e5);

console.time('diff longer against shorter');
for (let i = 0; i < 1e5; ++i) {
    u32Schema.diff(doubled, ten1, outs[i]);
}
console.timeEnd('diff longer against shorter');
console.log(`using ${meanContentBytes} bytes`);

console.log('1Kx targets with 1K elements');

const k1 = genArray('uint32', 1e3);
const k2 = genArray('uint32', 1e3);
half = genArray('uint32', 500);
doubled = genArray('uint32', 2e3);

outs = createWriteStreams(1e3);

console.time('diff same length');
for (let i = 0; i < 1e3; ) {
    u32Schema.diff(k1, k2, outs[i++]);
    u32Schema.diff(k2, k1, outs[i++]);
}
console.timeEnd('diff same length');

meanContentBytes = calcContentBytes(outs);
let inps = createReadStreams(outs);

console.time('patch same length');
for (let i = 0; i < 1e3; ) {
    u32Schema.patch(k1, inps[i++]);
    u32Schema.patch(k2, inps[i++]);
}
console.timeEnd('patch same length');

outs = createWriteStreams(1e3);

console.time('diff shorter against longer');
for (let i = 0; i < 1e3; ++i) {
    u32Schema.diff(half, k1, outs[i]);
}
console.timeEnd('diff shorter against longer');

inps = createReadStreams(outs);

console.time('patch shorter to longer');
for (let i = 0; i < 1e3; ++i) {
    u32Schema.patch(half, inps[i++]);
}
console.timeEnd('patch shorter to longer');

outs = createWriteStreams(1e3);

console.time('diff longer against shorter');
for (let i = 0; i < 1e3; ++i) {
    u32Schema.diff(doubled, k1, outs[i]);
}
console.timeEnd('diff longer against shorter');

inps = createReadStreams(outs);

console.time('patch longer to shorter');
for (let i = 0; i < 1e3; ++i) {
    u32Schema.patch(doubled, inps[i]);
}
console.timeEnd('patch longer to shorter');
console.log(`using ${meanContentBytes} bytes`);

console.log('10x targets with 100K elements');

const tenK1 = genArray('uint32', 1e5);
const tenK2 = genArray('uint32', 1e5);
half = genArray('uint32', 5e4);
doubled = genArray('uint32', 2e5);

outs = createWriteStreams(10);

console.time('diff same length');
for (let i = 0; i < 10; ) {
    u32Schema.diff(tenK1, tenK2, outs[i++]);
    u32Schema.diff(tenK2, tenK1, outs[i++]);
}
console.timeEnd('diff same length');

meanContentBytes = calcContentBytes(outs);
outs = createWriteStreams(10);

console.time('diff shorter against longer');
for (let i = 0; i < 10; ++i) {
    u32Schema.diff(half, tenK1, outs[i]);
}
console.timeEnd('diff shorter against longer');

outs = createWriteStreams(10);

console.time('diff longer against shorter');
for (let i = 0; i < 10; ++i) {
    u32Schema.diff(doubled, tenK1, outs[i]);
}
console.timeEnd('diff longer against shorter');
console.log(`using ${meanContentBytes} bytes`);
