import tape = require('tape');

import MuBoolean = require('../boolean');

tape('boolean', function (t) {
    const b = MuBoolean();
    console.log(b.muType);

    t.end();
});