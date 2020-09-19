import { MuSchema } from './schema';
import { MuWriteStream, MuReadStream } from '../stream';

const SCHROEPPEL2 = 0xAAAAAAAA;

function readSchroeppel (stream:MuReadStream) {
    const x = stream.readVarint();
    return ((SCHROEPPEL2 ^ x) - SCHROEPPEL2) >> 0;
}

export class MuQuantizedFloat implements MuSchema<number> {
    public invPrecision = 1;
    public identity = 0;
    public json:{
        type:'quantized-float';
        precision:number;
        identity:number;
    };
    public muData:{
        type:'quantized-float';
        precision:number;
        identity:number;
    } = {
        type: 'quantized-float',
        precision: 0,
        identity: 0,
    };
    public readonly muType = 'quantized-float';

    constructor (
        public precision:number,
        identity?:number) {
        this.invPrecision = 1 / this.precision;
        if (identity) {
            this.identity = this.precision * (Math.round(this.invPrecision * identity) >> 0);
        }
        this.json = this.muData = {
            type: 'quantized-float',
            precision: this.precision,
            identity: this.identity,
        };
    }

    public assign(x:number, y:number) {
        return (Math.round(this.invPrecision * y) >> 0) * this.precision;
    }

    public clone (y:number) {
        return (Math.round(this.invPrecision * y) >> 0) * this.precision;
    }

    public alloc () {
        return this.identity;
    }

    public free () {}

    public toJSON (x:number) {
        return this.precision * (Math.round(this.invPrecision * x) >> 0);
    }

    public fromJSON (x:any) {
        if (typeof x === 'number') {
            return this.clone(x);
        }
        return this.identity;
    }

    public equal (x:number, y:number) {
        const sf = this.invPrecision;
        return (Math.round(sf * x) >> 0) === (Math.round(sf * y) >> 0);
    }

    public diff (base:number, target:number, stream:MuWriteStream) {
        const sf = this.invPrecision;
        const b = Math.round(sf * base) >> 0;
        const t = Math.round(sf * target) >> 0;
        if (b === t) {
            return false;
        }
        stream.grow(5);
        stream.writeVarint((SCHROEPPEL2 + (t - b) ^ SCHROEPPEL2) >>> 0);
        return true;
    }

    public patch (base:number, stream:MuReadStream) {
        const b = Math.round(this.invPrecision * base) >> 0;
        const d = readSchroeppel(stream);
        return (b + d) * this.precision;
    }
}
