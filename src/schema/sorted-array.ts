import { MuWriteStream, MuReadStream } from '../stream';
import { MuSchema } from './schema';
import { MuArray } from './array';

function defaultCompare<T> (a:T, b:T) {
    if (a < b) {
        return -1;
    } else if (a > b) {
        return 1;
    } else {
        return 0;
    }
}

enum SortedOp {
    NONE = -1,
    SKIP = 0,
    PATCH = 1,
    INSERT = 2,
    INSERT_IDENTITY = 3,
    COPY = 4,
}

export class MuSortedArray<ValueSchema extends MuSchema<any>>
        implements MuSchema<ValueSchema['identity'][]> {
    public readonly muType = 'sorted-array';

    public readonly identity:ValueSchema['identity'][];
    public readonly muData:ValueSchema;
    public readonly json:object;
    public readonly compare:(a:ValueSchema['identity'], b:ValueSchema['identity']) => number;
    public readonly capacity:number;

    constructor (
        schema:ValueSchema,
        capacity:number,
        compare?:(a:ValueSchema['identity'], b:ValueSchema['identity']) => number,
        identity?:ValueSchema['identity'][],
    ) {
        this.muData = schema;
        this.capacity = capacity;
        this.compare = compare || defaultCompare;

        const arraySchema = new MuArray(schema, capacity, identity);
        this.identity = arraySchema.identity.sort(this.compare);
        this.json = {
            type: 'sorted-array',
            valueType: schema.json,
            // FIXME: use diff instead
            identity: JSON.stringify(this.identity),
        };

        this.alloc = arraySchema.alloc;
        this.free = arraySchema.free;
        this.equal = arraySchema.equal;
        this.clone = arraySchema.clone;
        this.assign = arraySchema.assign;
        this.toJSON = arraySchema.toJSON;
        this.fromJSON = arraySchema.fromJSON;
    }

    public alloc:() => ValueSchema['identity'][];
    public free:(set:ValueSchema['identity'][]) => void;
    public equal:(a:ValueSchema['identity'][], b:ValueSchema['identity'][]) => boolean;
    public clone:(set:ValueSchema['identity'][]) => ValueSchema['identity'][];
    public assign:(dst:ValueSchema['identity'][], src:ValueSchema['identity'][]) => ValueSchema['identity'][];
    public toJSON:(set:ValueSchema['identity'][]) => any[];
    public fromJSON:(json:any[]) => ValueSchema['identity'][];

    public diff (
        base:ValueSchema['identity'][],
        target:ValueSchema['identity'][],
        out:MuWriteStream,
    ) : boolean {
        if (base.length === 0 && target.length === 0) {
            return false;
        }

        const schema = this.muData;
        const compare = this.compare;

        // console.log(`base:[${base.join()}]\ntarget:[${target.join()}]`);

        // reserve space for op count
        out.grow(8);
        const head = out.offset;
        let opPtr = head;
        let opCount = 0;
        let opCode:number = SortedOp.NONE;
        out.offset += 4;

        let numOps = 0;
        function emitOp() {
            if (opCount > 0) {
                // console.log(`diff: ${SortedOp[opCode]} x ${opCount} @ ${opPtr}`);
                out.writeUint32At(opPtr, (opCount << 3) | opCode);
                numOps++;
            }

            // reserve space for next op
            out.grow(4);
            opPtr = out.offset;
            out.offset += 4;
        }

        // walk list
        let basePtr = 0;
        let targetPtr = 0;
        while (basePtr < base.length && targetPtr < target.length) {
            const baseItem = base[basePtr];
            const targetItem = target[targetPtr];

            const cmp = compare(baseItem, targetItem);
            if (cmp < 0) {
                if (opCode !== SortedOp.SKIP) {
                    emitOp();
                    opCount = 1;
                    opCode = SortedOp.SKIP;
                } else {
                    opCount++;
                }
                basePtr++;
            } else if (0 < cmp) {
                if (opCode === SortedOp.INSERT) {
                    if (schema.diff(schema.identity, targetItem, out)) {
                        opCount++;
                    } else {
                        emitOp();
                        opCode = SortedOp.INSERT_IDENTITY;
                        opCount = 1;
                    }
                } else if (opCode === SortedOp.INSERT_IDENTITY) {
                    const prevOffset = out.offset;
                    out.grow(4);
                    out.offset += 4;
                    if (schema.diff(schema.identity, targetItem, out)) {
                        emitOp();
                        out.offset -= 4;
                        opPtr = prevOffset;
                        opCode = SortedOp.INSERT;
                        opCount = 1;
                    } else {
                        out.offset -= 4;
                        opCount += 1;
                    }
                } else {
                    emitOp();
                    opCount = 1;
                    if (schema.diff(schema.identity, targetItem, out)) {
                        opCode = SortedOp.INSERT;
                    } else {
                        opCode = SortedOp.INSERT_IDENTITY;
                    }
                }
                targetPtr++;
            } else {
                if (opCode === SortedOp.PATCH) {
                    if (schema.diff(baseItem, targetItem, out)) {
                        opCount++;
                    } else {
                        emitOp();
                        opCode = SortedOp.COPY;
                        opCount = 1;
                    }
                } else if (opCode === SortedOp.COPY) {
                    const prevOffset = out.offset;
                    out.grow(4);
                    out.offset += 4;
                    if (schema.diff(baseItem, targetItem, out)) {
                        emitOp();
                        out.offset -= 4;
                        opPtr = prevOffset;
                        opCode = SortedOp.PATCH;
                        opCount = 1;
                    } else {
                        out.offset -= 4;
                        opCount += 1;
                    }
                } else {
                    emitOp();
                    opCount = 1;
                    if (schema.diff(baseItem, targetItem, out)) {
                        opCode = SortedOp.PATCH;
                    } else {
                        opCode = SortedOp.COPY;
                    }
                }
                basePtr++;
                targetPtr++;
            }
        }

        if (basePtr < base.length) {
            if (opCode !== SortedOp.SKIP) {
                emitOp();
                opCount = base.length - basePtr;
                opCode = SortedOp.SKIP;
            } else {
                opCount += base.length - basePtr;
            }
            basePtr++;
        }

        while (targetPtr < target.length) {
            const targetItem = target[targetPtr];
            if (opCode === SortedOp.INSERT) {
                if (schema.diff(schema.identity, targetItem, out)) {
                    opCount++;
                } else {
                    emitOp();
                    opCode = SortedOp.INSERT_IDENTITY;
                    opCount = 1;
                }
            } else if (opCode === SortedOp.INSERT_IDENTITY) {
                const prevOffset = out.offset;
                out.grow(4);
                out.offset += 4;
                if (schema.diff(schema.identity, targetItem, out)) {
                    emitOp();
                    out.offset -= 4;
                    opPtr = prevOffset;
                    opCode = SortedOp.INSERT;
                    opCount = 1;
                } else {
                    out.offset -= 4;
                    opCount += 1;
                }
            } else {
                emitOp();
                opCount = 1;
                if (schema.diff(schema.identity, targetItem, out)) {
                    opCode = SortedOp.INSERT;
                } else {
                    opCode = SortedOp.INSERT_IDENTITY;
                }
            }
            targetPtr++;
        }

        if (numOps === 0 && opCode === SortedOp.COPY && opCount === base.length) {
            out.offset = head;
            return false;
        }

        if (opCode !== SortedOp.SKIP) {
            emitOp();
        }

        // write op count
        out.offset -= 4;
        out.writeUint32At(head, numOps);
        return true;
    }

    public patch (
        base:ValueSchema['identity'][],
        inp:MuReadStream,
    ) : ValueSchema['identity'][] {
        const schema = this.muData;
        const result = this.alloc();
        const numOps = inp.readUint32();
        let ptr = 0;
        let tLength = 0;
        for (let i = 0; i < numOps; ++i) {
            const code = inp.readUint32();
            const count = code >> 3;

            tLength += count;
            if (tLength > this.capacity) {
                throw new RangeError(`target length exceeds capacity ${this.capacity}`);
            }

            const op = code & 0x7;
            // console.log(`patch: ${SortedOp[op]} x ${count} @ ${inp.offset - 4}, ptr=${ptr}`);
            switch (op) {
                case SortedOp.INSERT_IDENTITY:
                    for (let j = 0; j < count; ++j) {
                        result.push(schema.clone(schema.identity));
                    }
                    break;
                case SortedOp.INSERT:
                    for (let j = 0; j < count; ++j) {
                        result.push(schema.patch(schema.identity, inp));
                    }
                    break;
                case SortedOp.PATCH:
                    for (let j = 0; j < count; ++j) {
                        result.push(schema.patch(base[ptr++], inp));
                    }
                    break;
                case SortedOp.COPY:
                    for (let j = 0; j < count; ++j) {
                        result.push(schema.clone(base[ptr++]));
                    }
                    break;
                case SortedOp.SKIP:
                    ptr += count;
                    break;
            }
        }
        return result;
    }
}
