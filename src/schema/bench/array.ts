import { performance, PerformanceObserver } from 'perf_hooks';
import { MuWriteStream, MuReadStream } from '../../stream';
import { MuSchema, MuArray, MuUint8 } from '../';

function deltaByteLength<T> (schema:MuSchema<T>, a:T, b:T) {
    const ws = new MuWriteStream(1);
    schema.diff(a, b, ws);
    console.log(`${JSON.stringify(a)} -> ${JSON.stringify(b)}: ${ws.bytes().length}`);
}

const uint8Array = new MuArray(new MuUint8(), Infinity);

deltaByteLength(uint8Array, [], []);
deltaByteLength(uint8Array, [1], [1]);

deltaByteLength(uint8Array, [], [1]);
deltaByteLength(uint8Array, [], [1, 2]);
deltaByteLength(uint8Array, [], [1, 2, 3]);
deltaByteLength(uint8Array, [1], [1, 2]);
deltaByteLength(uint8Array, [2], [1, 2]);

deltaByteLength(uint8Array, [1], []);
deltaByteLength(uint8Array, [1, 2], []);
deltaByteLength(uint8Array, [1, 2], [1]);
deltaByteLength(uint8Array, [1, 2, 3], [1]);

deltaByteLength(uint8Array, [1], [2]);
deltaByteLength(uint8Array, [1, 2], [2, 1]);

function diffPatchDuration<T> (schema:MuSchema<T>, a:T, b:T, rounds:number, sampleSize=9) {
    function diffPair (ws:MuWriteStream) {
        schema.diff(schema.identity, a, ws);
        schema.diff(schema.identity, b, ws);
        schema.diff(a, schema.identity, ws);
        schema.diff(b, schema.identity, ws);
        schema.diff(a, b, ws);
        schema.diff(b, a, ws);
    }

    function patchPair (rs:MuReadStream) {
        schema.patch(schema.identity, rs);
        schema.patch(schema.identity, rs);
        schema.patch(a, rs);
        schema.patch(b, rs);
        schema.patch(a, rs);
        schema.patch(b, rs);
    }

    const diffSample:number[] = [];
    const diffObserver = new PerformanceObserver((list) => {
        const entry = list.getEntriesByName(`diff`)[0];
        if (entry) {
            performance.clearMarks();
            diffSample.push(entry.duration);
            if (diffSample.length === sampleSize) {
                diffObserver.disconnect();
                diffSample.sort((x, y) => x - y);
                console.log(`diff ${rounds} rounds: ${diffSample[sampleSize >>> 1]}`);
            }
        }
    });
    diffObserver.observe({ entryTypes: ['measure'] });

    const wss:MuWriteStream[] = new Array(rounds);
    for (let i = 0; i < wss.length; ++i) {
        wss[i] = new MuWriteStream(1);
    }

    for (let i = 0; i < sampleSize; ++i) {
        performance.mark('A');
        for (let j = 0; j < rounds; ++j) {
            diffPair(wss[j]);
        }
        performance.mark('B');
        performance.measure(`diff`, 'A', 'B');
    }

    const patchSample:number[] = [];
    const patchObserver = new PerformanceObserver((list) => {
        const entry = list.getEntriesByName(`patch`)[0];
        if (entry) {
            performance.clearMarks();
            patchSample.push(entry.duration);
            if (patchSample.length === sampleSize) {
                patchObserver.disconnect();
                patchSample.sort((x, y) => x - y);
                console.log(`patch ${rounds} rounds: ${patchSample[sampleSize >>> 1]}`);
            }
        }
    });
    patchObserver.observe({ entryTypes: ['measure'] });

    const rss:MuReadStream[] = wss.map((ws) => new MuReadStream(ws.bytes()));

    for (let i = 0; i < sampleSize; ++i) {
        performance.mark('C');
        for (let j = 0; j < rounds; ++j) {
            patchPair(rss[j]);
        }
        performance.mark('D');
        performance.measure(`patch`, 'C', 'D');
    }
}

const a1 = [1, 1, 1, 1, 1];
const a2 = [2, 2, 2, 2, 2];

diffPatchDuration(uint8Array, a1, a2, 1);
diffPatchDuration(uint8Array, a1, a2, 10);
diffPatchDuration(uint8Array, a1, a2, 100);
diffPatchDuration(uint8Array, a1, a2, 1000);
diffPatchDuration(uint8Array, a1, a2, 1e4);
diffPatchDuration(uint8Array, a1, a2, 1e5);
