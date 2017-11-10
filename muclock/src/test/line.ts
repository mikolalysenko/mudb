import tape = require('tape');
import { fitLine } from '../fit-line';

tape('linear regression', (t) => {
    function testLine (slope:number, intercept:number) {
        const x:number[] = [];
        const y:number[] = [];
        for (let i = 0; i < 100; ++i) {
            const v = Math.random() * 100 - 50;
            x.push(v);
            y.push(slope * v + intercept);
        }

        const { a, b } = fitLine(x, y);

        t.ok(Math.abs(a - slope) < 1e-6, `expect slope ${slope}, got ${a}`);
        t.ok(Math.abs(b - intercept) < 1e-6, `expect intercept ${intercept}, got ${b}`);
    }


    testLine(1, 0);
    testLine(0.1, 0);
    testLine(1, 2);
    for (let i = 0; i < 100; ++i) {
        testLine(Math.random() - 0.5, Math.random() - 0.5);
    }

    t.end();
});
