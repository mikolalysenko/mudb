import tape = require('tape');

import HelBoolean = require('../boolean');

tape('boolean', function (t) {
    const b = HelBoolean();
    console.log(b.helType);

    t.end();
});