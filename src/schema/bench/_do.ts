import { performance, PerformanceObserver } from 'perf_hooks';
import { MuWriteStream, MuReadStream } from '../../stream';
import { MuSchema } from '../schema';

export function deltaByteLength<T> (schema:MuSchema<T>, a:T, b:T) {
    const ws = new MuWriteStream(1);
    schema.diff(a, b, ws);
    console.log(`${JSON.stringify(a)} -> ${JSON.stringify(b)}: ${ws.bytes().length}`);
}

export function diffPatchDuration<T> (schema:MuSchema<T>, a:T, b:T, rounds:number, id='', sampleSize=9) {
    const diffSample:number[] = [];
    const diffObserver = new PerformanceObserver((list) => {
        const entry = list.getEntriesByName(`diff`)[0];
        if (entry) {
            performance.clearMarks();
            diffSample.push(entry.duration);
            if (diffSample.length === sampleSize) {
                diffObserver.disconnect();
                diffSample.sort((x, y) => x - y);
                const median = diffSample[sampleSize >>> 1];
                console.log((id && `${id}: `) + `diff ${rounds} rounds: ${median}`);
            }
        }
    });
    diffObserver.observe({ entryTypes: ['measure'] });

    const wss:MuWriteStream[] = new Array(sampleSize * rounds);
    for (let i = 0; i < wss.length; ++i) {
        wss[i] = new MuWriteStream(1);
    }

    for (let i = 0; i < sampleSize; ++i) {
        performance.mark('A');
        for (let j = 0; j < rounds; ++j) {
            const ws = wss[i * rounds + j];
            schema.diff(a, b, ws);
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
                const median = patchSample[sampleSize >>> 1];
                console.log((id && `${id}: `) + `patch ${rounds} rounds: ${median}`);
            }
        }
    });
    patchObserver.observe({ entryTypes: ['measure'] });

    const rss:MuReadStream[] = wss.map((ws) => new MuReadStream(ws.bytes()));

    for (let i = 0; i < sampleSize; ++i) {
        performance.mark('C');
        for (let j = 0; j < rounds; ++j) {
            const rs = rss[i * rounds + j];
            (rs.offset < rs.length) && schema.patch(a, rs);
        }
        performance.mark('D');
        performance.measure(`patch`, 'C', 'D');
    }
}
