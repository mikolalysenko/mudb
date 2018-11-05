import {
    MuSortedArray,
    MuUint32,
} from '../';

import {
    calcContentBytes,
    createWriteStreams,
    createReadStreams,
} from './gendata';

console.log('---------- sorted array ----------');
console.log('100Kx targets with 10 elements');

const schema = new MuSortedArray(new MuUint32());

let evens = new Array(10);
for (let i = 0; i < evens.length; ++i) {
    evens[i] = i << 1;
}

let outs = createWriteStreams(1e5);

console.time('with the exact same elements');
for (let i = 0; i < 1e5; ++i) {
    schema.diff(evens, evens, outs[i]);
}
console.timeEnd('with the exact same elements');

let oddsEvens = evens.slice();
for (let i = 1; i < oddsEvens.length; i += 2) {
    --oddsEvens[i];
}

outs = createWriteStreams(1e5);

console.time('sharing some common elements');
for (let i = 0; i < 1e5; ++i) {
    schema.diff(evens, oddsEvens, outs[i]);
}
console.timeEnd('sharing some common elements');

let odds = evens.slice();
for (let i = 0; i < odds.length; ++i) {
    ++odds[i];
}

let meanContentBytes = calcContentBytes(outs);
outs = createWriteStreams(1e5);

console.time('with totally different elements');
for (let i = 0; i < 1e5; ++i) {
    schema.diff(evens, odds, outs[i]);
}
console.timeEnd('with totally different elements');
console.log(`using ${meanContentBytes} bytes`);

console.log('1Kx targets with 1K elements');

evens = new Array(1e3);
for (let i = 0; i < evens.length; ++i) {
    evens[i] = i << 1;
}

outs = createWriteStreams(1e3);

console.time('with the exact same elements');
for (let i = 0; i < 1e3; ++i) {
    schema.diff(evens, evens, outs[i]);
}
console.timeEnd('with the exact same elements');

oddsEvens = evens.slice();
for (let i = 1; i < oddsEvens.length; i += 2) {
    --oddsEvens[i];
}

outs = createWriteStreams(1e3);

console.time('sharing some common elements');
for (let i = 0; i < 1e3; ++i) {
    schema.diff(evens, oddsEvens, outs[i]);
}
console.timeEnd('sharing some common elements');

odds = evens.slice();
for (let i = 0; i < odds.length; ++i) {
    ++odds[i];
}

meanContentBytes = calcContentBytes(outs);
outs = createWriteStreams(1e3);

console.time('with totally different elements');
for (let i = 0; i < 1e3; ++i) {
    schema.diff(evens, odds, outs[i]);
}
console.timeEnd('with totally different elements');
console.log(`using ${meanContentBytes} bytes`);

console.log('10x targets with 100K elements');

evens = new Array(1e5);
for (let i = 0; i < evens.length; ++i) {
    evens[i] = i << 1;
}

outs = createWriteStreams(10);

console.time('with the exact same elements');
for (let i = 0; i < 10; ++i) {
    schema.diff(evens, evens, outs[i]);
}
console.timeEnd('with the exact same elements');

oddsEvens = evens.slice();
for (let i = 1; i < oddsEvens.length; i += 2) {
    --oddsEvens[i];
}

outs = createWriteStreams(10);

console.time('sharing some common elements');
for (let i = 0; i < 10; ++i) {
    schema.diff(evens, oddsEvens, outs[i]);
}
console.timeEnd('sharing some common elements');

odds = evens.slice();
for (let i = 0; i < odds.length; ++i) {
    ++odds[i];
}

meanContentBytes = calcContentBytes(outs);
outs = createWriteStreams(10);

console.time('with totally different elements');
for (let i = 0; i < 10; ++i) {
    schema.diff(evens, odds, outs[i]);
}
console.timeEnd('with totally different elements');

console.log('10x different lengths');

outs = createWriteStreams(10);

console.time('diff short sorted array against long sorted array');
for (let i = 0; i < 10; ++i) {
    schema.diff(evens, evens, outs[i]);
}
console.timeEnd('diff short sorted array against long sorted array');
console.log(`using ${meanContentBytes} bytes`);
