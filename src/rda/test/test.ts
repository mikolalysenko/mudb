import { MuRDARegister } from '../register';
import { MuRDAStruct } from '../struct';
import { MuUint16, MuUTF8, MuFloat64, MuUint8 } from '../../schema';
import { MuRDAConstant } from '..';

const testRDA = new MuRDAStruct({
    foo: new MuRDARegister(new MuUint16()),
    bar: new MuRDARegister(new MuUTF8()),

    child: new MuRDAStruct({
        x: new MuRDARegister(new MuFloat64(100)),
        b: new MuRDAStruct({
            gamma: new MuRDAConstant(new MuUint8(1)),
            butt: new MuRDARegister(new MuUint8(1)),
        }),
    }),
});

const store = testRDA.store(testRDA.stateSchema.identity);

const state = store.state(testRDA, testRDA.stateSchema.alloc());

const setFoo = testRDA.action(store).child.x(1);
const undoSetFoo = store.inverse(testRDA, setFoo);

store.apply(testRDA, setFoo);
store.apply(testRDA, undoSetFoo);
