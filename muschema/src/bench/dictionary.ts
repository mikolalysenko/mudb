import {
    MuDictionary,
    MuUint32,
    MuFloat64,
} from '../';

import {
    createWriteStreams,
    createReadStreams,
    genDictionary,
    changeValues,
    shallowMerge,
} from './gendata';

const schema = new MuDictionary(new MuUint32());

const emptyDict = {};
const dict1 = genDictionary('uint32', 1e3);
const dict2 = changeValues(dict1, 'uint32');

let outs = createWriteStreams(1e3);

console.log('1Kx targets with 1K props');
console.time('diff more props');
for (let i = 0; i < 1e3; ++i) {
    schema.diff(emptyDict, dict1, outs[i]);
}
console.timeEnd('diff more props');

let inps = createReadStreams(outs);

console.time('patch more props');
for (let i = 0; i < 1e3; ++i) {
    schema.patch(emptyDict, inps[i]);
}
console.timeEnd('patch more props');

outs = createWriteStreams(1e3);

console.time('diff same set of props');
for (let i = 0; i < 1e3; ) {
    schema.diff(dict1, dict2, outs[i++]);
    schema.diff(dict2, dict1, outs[i++]);
}
console.timeEnd('diff same set of props');

inps = createReadStreams(outs);

console.time('patch same set of props');
for (let i = 0; i < 1e3; ) {
    schema.patch(dict1, inps[i++]);
    schema.patch(dict2, inps[i++]);
}
console.timeEnd('patch same set of props');

const dict3 = genDictionary('uint32', 1e3);

outs = createWriteStreams(1e3);

console.time('diff all props replaced');
for (let i = 0; i < 1e3; ) {
    schema.diff(dict1, dict3, outs[i++]);
    schema.diff(dict3, dict1, outs[i++]);
}
console.timeEnd('diff all props replaced');

inps = createReadStreams(outs);

console.time('patch all props replaced');
for (let i = 0; i < 1e3; ) {
    schema.patch(dict1, inps[i++]);
    schema.patch(dict2, inps[i++]);
}
console.timeEnd('patch all props replaced');

const dict4 = shallowMerge(dict1, dict3);

outs = createWriteStreams(1e3);

console.time('diff half of all props removed');
for (let i = 0; i < 1e3; ++i) {
    schema.diff(dict4, dict2, outs[i]);
}
console.timeEnd('diff half of all props removed');

inps = createReadStreams(outs);

console.time('patch half of all props removed');
for (let i = 0; i < 1e3; ++i) {
    schema.patch(dict4, inps[i]);
}
console.timeEnd('patch half of all props removed');
