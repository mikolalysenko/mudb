import {
    MuVector,
    MuUint32,
} from '../';

import {
    calcContentBytes,
    createWriteStreams,
    createReadStreams,
    genVector,
} from './gendata';

console.log('---------- vector ----------');
console.log('100Kx targets with 10 elements');

const schema1 = new MuVector(new MuUint32(), 10);

const ten1 = genVector('uint32', 10);
const ten2 = genVector('uint32', 10);

let outs = createWriteStreams(1e5);

console.time('diff vectors of uint32');
for (let i = 0; i < 1e5; ) {
    schema1.diff(ten1, ten2, outs[i++]);
    schema1.diff(ten2, ten1, outs[i++]);
}
console.timeEnd('diff vectors of uint32');

let meanContentBytes = calcContentBytes(outs);
let inps = createReadStreams(outs);

console.time('patch vectors of uint32');
for (let i = 0; i < 1e5; ) {
    schema1.patch(ten1, inps[i++]);
    schema1.patch(ten2, inps[i++]);
}
console.timeEnd('patch vectors of uint32');
console.log(`using ${meanContentBytes} bytes`);

console.log('1Kx targets with 1K elements');

const schema2 = new MuVector(new MuUint32(), 1e3);

const k1 = genVector('uint32', 1e3);
const k2 = genVector('uint32', 1e3);

outs = createWriteStreams(1e3);

console.time('diff vectors of uint32');
for (let i = 0; i < 1e3; ) {
    schema2.diff(k1, k2, outs[i++]);
    schema2.diff(k2, k1, outs[i++]);
}
console.timeEnd('diff vectors of uint32');

meanContentBytes = calcContentBytes(outs);
inps = createReadStreams(outs);

console.time('patch vectors of uint32');
for (let i = 0; i < 1e3; ) {
    schema2.patch(k1, inps[i++]);
    schema2.patch(k2, inps[i++]);
}
console.timeEnd('patch vectors of uint32');
console.log(`using ${meanContentBytes} bytes`);

console.log('10x targets with 100K elements');

const schema3 = new MuVector(new MuUint32(), 1e5);

const tenK1 = genVector('uint32', 1e5);
const tenK2 = genVector('uint32', 1e5);

outs = createWriteStreams(10);

console.time('diff vectors of uint32');
for (let i = 0; i < 10; ) {
    schema3.diff(tenK1, tenK2, outs[i++]);
    schema3.diff(tenK2, tenK1, outs[i++]);
}
console.timeEnd('diff vectors of uint32');

meanContentBytes = calcContentBytes(outs);
inps = createReadStreams(outs);

console.time('patch vectors of uint32');
for (let i = 0; i < 10; ) {
    schema3.patch(tenK1, inps[i++]);
    schema3.patch(tenK2, inps[i++]);
}
console.timeEnd('patch vectors of uint32');
console.log(`using ${meanContentBytes} bytes`);
