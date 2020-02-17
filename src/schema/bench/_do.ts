import { performance, PerformanceObserver } from 'perf_hooks';
import { MuWriteStream, MuReadStream } from '../../stream';
import { MuSchema } from '../schema';

export function deltaByteLength<T> (schema:MuSchema<T>, a:T, b:T) {
    const ws = new MuWriteStream(1);
    schema.diff(a, b, ws);
    console.log(`${JSON.stringify(a)} -> ${JSON.stringify(b)}: ${ws.bytes().length}`);
}

export function diffPatchDuration<T> (schema:MuSchema<T>, a:T, b:T, rounds:number, id='', sampleSize=9) {
    function diffPair (ws:MuWriteStream) {
        schema.diff(schema.identity, a, ws);
        schema.diff(schema.identity, b, ws);
        schema.diff(a, schema.identity, ws);
        schema.diff(b, schema.identity, ws);
        schema.diff(a, b, ws);
        schema.diff(b, a, ws);
    }

    function patchPair (rs:MuReadStream) {
        (rs.offset < rs.length) && schema.patch(schema.identity, rs);
        (rs.offset < rs.length) && schema.patch(schema.identity, rs);
        (rs.offset < rs.length) && schema.patch(a, rs);
        (rs.offset < rs.length) && schema.patch(b, rs);
        (rs.offset < rs.length) && schema.patch(a, rs);
        (rs.offset < rs.length) && schema.patch(b, rs);
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
                console.log(`${id} diff ${rounds} rounds: ${diffSample[sampleSize >>> 1]}`);
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
                console.log(`${id} patch ${rounds} rounds: ${patchSample[sampleSize >>> 1]}`);
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
