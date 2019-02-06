import { MuRegisterCRDT } from '../register';
import { MuStructCRDT } from '../struct';
import { MuUint16, MuUTF8, MuFloat64 } from '../../schema';

const testCRDT = new MuStructCRDT({
    foo: new MuRegisterCRDT(new MuUint16()),
    bar: new MuRegisterCRDT(new MuUTF8()),

    child: new MuStructCRDT({
        a: new MuRegisterCRDT(new MuFloat64(100)),
    }),
});

testCRDT.actions.child.a.set(10);
