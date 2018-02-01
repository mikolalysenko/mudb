import {
    MuStruct,
    MuFloat32,
    MuFloat64,
    MuInt8,
    MuInt16,
    MuInt32,
    MuUint8,
    MuUint16,
    MuUint32,
} from '../';

import {
    createWriteStreams,
    createReadStreams,
    genStruct,
} from './gendata';

const spec1 = {
    a: new MuUint32(),
    b: new MuUint32(),
    c: new MuUint32(),
    d: new MuUint32(),
    e: new MuUint32(),
    f: new MuUint32(),
    g: new MuUint32(),
    h: new MuUint32(),
};
const schema1 = new MuStruct(spec1);

const struct1 = genStruct(spec1);
const struct2 = genStruct(spec1);

let outs = createWriteStreams(1e5);

console.time('diff structs of uint32');
for (let i = 0; i < 1e5; ) {
    schema1.diff(struct1, struct2, outs[i++]);
    schema1.diff(struct2, struct1, outs[i++]);
}
console.timeEnd('diff structs of uint32');

let inps = createReadStreams(outs);

console.time('patch structs of uint32');
for (let i = 0; i < 1e5; ) {
    schema1.patch(struct1, inps[i++]);
    schema1.patch(struct2, inps[i++]);
}
console.timeEnd('patch structs of uint32');

const spec2 = {
    a: new MuFloat32(),
    b: new MuFloat64(),
    c: new MuInt8(),
    d: new MuInt16(),
    e: new MuInt32(),
    f: new MuUint8(),
    g: new MuUint16(),
    h: new MuUint32(),
};
const schema2 = new MuStruct(spec2);

const struct3 = genStruct(spec2);
const struct4 = genStruct(spec2);

outs = createWriteStreams(1e5);

console.time('diff structs with props of various types');
for (let i = 0; i < 1e5; ) {
    schema2.diff(struct3, struct4, outs[i++]);
    schema2.diff(struct4, struct3, outs[i++]);
}
console.timeEnd('diff structs with props of various types');

inps = createReadStreams(outs);

console.time('patch structs with props of various types');
for (let i = 0; i < 1e5; ) {
    schema2.patch(struct3, inps[i++]);
    schema2.patch(struct4, inps[i++]);
}
console.timeEnd('patch structs with props of various types');
