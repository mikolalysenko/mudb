import { MuNumber } from './_number';

export class MuFloat64 extends MuNumber {
    public readonly muType = 'float64';

    constructor(value?:number) {
        super(+(value || 0));
    }
}
