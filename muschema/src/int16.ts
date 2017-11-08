import { MuNumber } from './_number';

export class MuInt16 extends MuNumber {
    public readonly muType = 'int16';
    constructor(value?:number) {
        super((value || 0) | 0);
    }
}
