import { MuNumber } from './_number';

export class MuInt32 extends MuNumber {
    public readonly muType = 'int32';
    constructor(value?:number) {
        super((value || 0) | 0);
    }
}
