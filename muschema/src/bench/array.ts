import {
    MuArray,
    MuUint32,
    MuFloat64,
    MuString,
} from '../';

import {
    createWriteStreams,
    createReadStreams,
    genArray,
} from './gendata';

const u32Schema = new MuArray(new MuUint32());

console.log('1Kx 1K elements');

const oneK1 = genArray('uint32', 1e3);
const oneK2 = genArray('uint32', 1e3);
let half = genArray('uint32', 500);
let doubled = genArray('uint32', 2e3);

let outs = createWriteStreams(1e3);

console.time('diff same length');
for (let i = 0; i < 1e3; ) {
    u32Schema.diff(oneK1, oneK2, outs[i++]);
    u32Schema.diff(oneK2, oneK1, outs[i++]);
}
console.timeEnd('diff same length');

let inps = createReadStreams(outs);

console.time('patch same length');
for (let i = 0; i < 1e3; ) {
    u32Schema.patch(oneK1, inps[i++]);
    u32Schema.patch(oneK2, inps[i++]);
}
console.timeEnd('patch same length');

outs = createWriteStreams(1e3);

console.time('diff shorter against longer');
for (let i = 0; i < 1e3; ++i) {
    u32Schema.diff(half, oneK1, outs[i]);
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
    u32Schema.diff(doubled, oneK1, outs[i]);
}
console.timeEnd('diff longer against shorter');

inps = createReadStreams(outs);

console.time('patch longer to shorter');
for (let i = 0; i < 1e3; ++i) {
    u32Schema.patch(doubled, inps[i]);
}
console.timeEnd('patch longer to shorter');

console.log('100Kx 10 elements');

const ten1 = genArray('uint32', 10);
const ten2 = genArray('uint32', 10);
half = genArray('uint32', 5);
doubled = genArray('uint32', 20);

outs = createWriteStreams(1e5);

console.time('diff same length');
for (let i = 0; i < 1e5; ) {
    u32Schema.diff(ten1, ten2, outs[i++]);
    u32Schema.diff(ten2, ten1, outs[i++]);
}
console.timeEnd('diff same length');

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

console.log('10x 100K elements');

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
