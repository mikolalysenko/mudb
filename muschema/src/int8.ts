import {MuNumber} from './_number';

export class MuInt8 extends MuNumber {
    public readonly muType = 'int8';
    constructor(value?:number) {
        super((value || 0) | 0);
    }
};