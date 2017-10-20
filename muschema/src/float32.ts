import {MuNumber} from './_number';

export class MuFloat32 extends MuNumber {
    public readonly muType = 'float32';

    constructor(value?:number) {
        super(+(value || 0));
    }
};