import { MuSchema } from './schema';
import { MuWriteStream, MuReadStream } from 'mustreams';
import { MuUnion } from './union';
import { MuDictionary } from './dictionary';

export interface MuArrayT<ArraySpec extends MuSchema<any>[]> {
    v:[
        [index in keyof ArraySpec]: ArraySpec[index]['identity']
    ];
}

/** Array type schema */
export class MuArray<ArraySpec extends MuSchema<any>[]>
        implements MuSchema<MuArrayT<ArraySpec>['v']> {
    public readonly identity:MuSchema<any>[];

    public readonly muType = 'array';
    public readonly muData:ArraySpec;
    public readonly json:object;

    constructor(array:ArraySpec) {
        this.identity = [];
        this.json = {
            type: 'array',
            identity: this.identity,
        };
    }

    public alloc() { return this.identity; }

    public free() { }

    public clone(array:ArraySpec) : MuSchema<any>[] {
        const result = [];
        return result;
    }

    public diff() { }

    public patch() { return []; }

    // public diffBinary() { return false; }

    // public patchBinary() { return false; }
}
