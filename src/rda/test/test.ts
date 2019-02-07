import { MuRDARegister } from '../register';
import { MuRDAStruct } from '../struct';
import { MuUint16, MuUTF8, MuFloat64 } from '../../schema';

const testCRDT = new MuRDAStruct({
    foo: new MuRDARegister(new MuUint16()),
    bar: new MuRDARegister(new MuUTF8()),

    child: new MuRDAStruct({
        a: new MuRDARegister(new MuFloat64(100)),
    }),
});

testCRDT.actions.child.a.set(10);
