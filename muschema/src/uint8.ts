import { MuNumber } from './_number';

export class MuUint8 extends MuNumber {
    public readonly muType = 'uint8';
    constructor(value?:number) {
        super((value || 0) >>> 0);
    }
}
