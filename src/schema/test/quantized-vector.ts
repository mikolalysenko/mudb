import tape = require('tape');
import { vec2, vec3, vec4 } from 'gl-matrix';
import { MuWriteStream, MuReadStream } from '../../stream';
import { MuQuantizedVec2, MuQuantizedVec3, MuQuantizedVec4 } from '../index';

tape('quantized-vec2', function (t) {
    function testDiffPatch (x:vec2, y:vec2, schema:MuQuantizedVec2) {
        const write = new MuWriteStream(100);
        if (!schema.diff(x, y, write)) {
            t.equal(write.offset, 0, 'did not write bytes');
            return t.ok(schema.equal(x, y), 'equal');
        }
        const read = new MuReadStream(write.buffer.uint8);
        const z = schema.patch(x, read);
        t.ok(schema.equal(z, y), `diff-patch: ${vec2.str(x)} -> $${vec2.str(y)} got: ${vec2.str(z)} @ precision ${schema.precision}`);
        t.equal(read.offset, write.offset, 'used all of stream');
    }

    function testRound (x:vec2, schema:MuQuantizedVec2) {
        const z = schema.alloc();
        t.equals(schema.assign(z, x), z, 'assign returns correct value');

        for (let i = 0; i < 2; ++i) {
            t.ok(Math.abs(z[i] - x[i]) <= schema.precision, 'round');
        }
        t.ok(schema.equal(x, z), 'equals method works');
    }

    function testPair (x:vec2, y:vec2, schema:MuQuantizedVec2) {
        testRound(x, schema);
        testRound(y, schema);
        testDiffPatch(x, y, schema);
        testDiffPatch(y, x, schema);
        testDiffPatch(schema.identity, x, schema);
        testDiffPatch(schema.identity, y, schema);
        testDiffPatch(x, schema.identity, schema);
        testDiffPatch(y, schema.identity, schema);
    }

    function makeTestSchema (precision:number, identity:vec2) {
        const schema = new MuQuantizedVec2(precision, identity);
        t.equal(schema.precision, precision, 'precision');
        testRound(identity, schema);
        t.ok(schema.equal(identity, schema.identity), 'identity');
        return schema;
    }

    function randVec () {
        return vec2.fromValues(
            10 * (Math.random() - 0.5),
            10 * (Math.random() - 0.5));
    }

    for (let scale = 0.25; scale <= 2; scale += 0.25) {
        const schema0 = makeTestSchema(scale, vec2.create());
        const schema1 = makeTestSchema(scale, vec2.fromValues(1, 1));
        for (let i = 0; i < 40; ++i) {
            const x = randVec();
            const y = randVec();
            testPair(x, y, schema0);
            testPair(x, y, schema1);

            x[0] = y[0];
            testPair(x, y, schema0);
            testPair(x, y, schema1);

            x[1] = y[1];
            testPair(x, y, schema0);
            testPair(x, y, schema1);

            x[0] = 10. * Math.random();
            testPair(x, y, schema0);
            testPair(x, y, schema1);
        }
    }

    t.end();
});

tape('quantized-vec3', function (t) {
    function testDiffPatch (x:vec3, y:vec3, schema:MuQuantizedVec3) {
        const write = new MuWriteStream(100);
        if (!schema.diff(x, y, write)) {
            t.equal(write.offset, 0, 'did not write bytes');
            return t.ok(schema.equal(x, y), 'equal');
        }
        const read = new MuReadStream(write.buffer.uint8);
        const z = schema.patch(x, read);
        t.ok(schema.equal(z, y), `diff-patch: ${vec3.str(x)} -> $${vec3.str(y)} got: ${vec3.str(z)} @ precision ${schema.precision}`);
        t.equal(read.offset, write.offset, 'used all of stream');
    }

    function testRound (x:vec3, schema:MuQuantizedVec3) {
        const z = schema.alloc();
        t.equals(schema.assign(z, x), z, 'assign returns correct value');

        for (let i = 0; i < 3; ++i) {
            t.ok(Math.abs(z[i] - x[i]) <= schema.precision, 'round');
        }
        t.ok(schema.equal(x, z), 'equals method works');
    }

    function testPair (x:vec3, y:vec3, schema:MuQuantizedVec3) {
        testRound(x, schema);
        testRound(y, schema);
        testDiffPatch(x, y, schema);
        testDiffPatch(y, x, schema);
        testDiffPatch(schema.identity, x, schema);
        testDiffPatch(schema.identity, y, schema);
        testDiffPatch(x, schema.identity, schema);
        testDiffPatch(y, schema.identity, schema);
    }

    function makeTestSchema (precision:number, identity:vec3) {
        const schema = new MuQuantizedVec3(precision, identity);
        t.equal(schema.precision, precision, 'precision');
        testRound(identity, schema);
        t.ok(schema.equal(identity, schema.identity), 'identity');
        return schema;
    }

    function randVec () {
        return vec3.fromValues(
            10 * (Math.random() - 0.5),
            10 * (Math.random() - 0.5),
            10 * (Math.random() - 0.5));
    }

    for (let scale = 0.25; scale <= 2; scale += 0.25) {
        const schema0 = makeTestSchema(scale, vec3.create());
        const schema1 = makeTestSchema(scale, vec3.fromValues(1, 1, 1));
        for (let i = 0; i < 40; ++i) {
            const x = randVec();
            const y = randVec();
            testPair(x, y, schema0);
            testPair(x, y, schema1);

            x[0] = y[0];
            testPair(x, y, schema0);
            testPair(x, y, schema1);

            x[1] = y[1];
            testPair(x, y, schema0);
            testPair(x, y, schema1);

            x[0] = 10. * Math.random();
            testPair(x, y, schema0);
            testPair(x, y, schema1);

            x[2] = y[2];
            testPair(x, y, schema0);
            testPair(x, y, schema1);

            x[1] = 10. * Math.random();
            testPair(x, y, schema0);
            testPair(x, y, schema1);

            x[0] = y[0];
            x[1] = 10. * Math.random();
            testPair(x, y, schema0);
            testPair(x, y, schema1);
        }
    }

    t.end();
});

tape('quantized-vec4', function (t) {
    function testDiffPatch (x:vec4, y:vec4, schema:MuQuantizedVec4) {
        const write = new MuWriteStream(100);
        if (!schema.diff(x, y, write)) {
            t.equal(write.offset, 0, 'did not write bytes');
            return t.ok(schema.equal(x, y), 'equal');
        }
        const read = new MuReadStream(write.buffer.uint8);
        const z = schema.patch(x, read);
        t.ok(schema.equal(z, y), `diff-patch: ${vec4.str(x)} -> $${vec4.str(y)} got: ${vec4.str(z)} @ precision ${schema.precision}`);
        t.equal(read.offset, write.offset, 'used all of stream');
    }

    function testRound (x:vec4, schema:MuQuantizedVec4) {
        const z = schema.alloc();
        t.equals(schema.assign(z, x), z, 'assign returns correct value');

        for (let i = 0; i < 4; ++i) {
            t.ok(Math.abs(z[i] - x[i]) <= schema.precision, 'round');
        }
        t.ok(schema.equal(x, z), 'equals method works');
    }

    function testPair (x:vec4, y:vec4, schema:MuQuantizedVec4) {
        testRound(x, schema);
        testRound(y, schema);
        testDiffPatch(x, y, schema);
        testDiffPatch(y, x, schema);
        testDiffPatch(schema.identity, x, schema);
        testDiffPatch(schema.identity, y, schema);
        testDiffPatch(x, schema.identity, schema);
        testDiffPatch(y, schema.identity, schema);
    }

    function makeTestSchema (precision:number, identity:vec4) {
        const schema = new MuQuantizedVec4(precision, identity);
        t.equal(schema.precision, precision, 'precision');
        testRound(identity, schema);
        t.ok(schema.equal(identity, schema.identity), 'identity');
        return schema;
    }

    function randVec () {
        return vec4.fromValues(
            10 * (Math.random() - 0.5),
            10 * (Math.random() - 0.5),
            10 * (Math.random() - 0.5),
            10 * (Math.random() - 0.5));
    }

    for (let scale = 0.25; scale <= 2; scale += 0.25) {
        const schema0 = makeTestSchema(scale, vec4.create());
        const schema1 = makeTestSchema(scale, vec4.fromValues(1, 1, 1, 1));
        for (let i = 0; i < 40; ++i) {
            for (let k = 0; k << (1 << 4); ++k) {
                const nx = randVec();
                const ny = randVec();
                for (let j = 0; j < 4; ++j) {
                    if (k & (1 << j)) {
                        ny[j] = nx[j];
                    }
                }
                testPair(nx, ny, schema0);
                testPair(nx, ny, schema1);
            }
        }
    }

    t.end();
});
