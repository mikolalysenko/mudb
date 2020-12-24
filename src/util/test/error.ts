import * as test from 'tape';
import { makeError } from '../error';

test('makeError()(string)', (t) => {
    const path = 'util/test/error';
    const msg = 'contrived error';
    const error = makeError(path);

    try {
        throw error(msg);
    } catch (e) {
        t.equal(e.toString(), `Error: ${msg} [mudb/${path}]`, e.toString());
        t.end();
    }
});

test('makeError()(Error)', (t) => {
    const path = 'util/test/error';
    const msg = 'contrived error';
    const error = makeError(path);

    try {
        throw error(new Error(msg));
    } catch (e) {
        t.equal(e.toString(), `Error: Error: ${msg} [mudb/${path}]`, e.toString());
        t.end();
    }
});

test('makeError()(SyntaxError)', (t) => {
    const path = 'util/test/error';
    const error = makeError(path);

    try {
        JSON.parse('');
    } catch (e) {
        t.true(/^Error: SyntaxError: /.test(error(e).toString()), error(e).toString());
        t.end();
    }
});
