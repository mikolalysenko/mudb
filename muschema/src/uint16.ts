import { MuNumber } from './_number';

export class MuUint16 extends MuNumber {
    public readonly muType = 'uint16';
    constructor(value?:number) {
        super((value || 0) >>> 0);
    }
}
