import tape = require('tape');

import { MuBoolean } from '../boolean';

tape('boolean', function (t) {
    const b = new MuBoolean();
    console.log(b.muType);

    t.end();
});