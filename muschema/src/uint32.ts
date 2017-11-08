import { MuNumber } from './_number';

export class MuUint32 extends MuNumber {
    public readonly muType = 'uint32';

    constructor(value?:number) {
        super((value || 0) >>> 0);
    }
}
