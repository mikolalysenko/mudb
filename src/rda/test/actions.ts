import test = require('tape');
import { MuInt32 } from '../../schema';

import { MuRDAConstant } from '../constant';
import { MuRDARegister } from '../register';
import { MuRDAMap } from '../map';
import { MuRDAStruct } from '../struct';

test('constants', (t) => {
    const C = new MuRDAConstant(new MuInt32(1));
    t.end();
});

test('registers', (t) => {
    t.end();
});

test('maps', (t) => {
    t.end();
});

test('structs', (t) => {
    t.end();
});
