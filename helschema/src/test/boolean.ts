import tape = require('tape');

import HelBoolean from '../boolean';

tape('boolean', function (t) {

    const b = HelBoolean();
    console.log(b._helType);

    t.end();
});