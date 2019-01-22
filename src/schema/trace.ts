import { MuSchema } from './schema';
import { MuWriteStream, MuReadStream } from '../stream';

export class MuSchemaLogger<BaseSchema extends MuSchema<any>> {
    public name:string;
    public allocCount:number = 0;
    public freeCount:number = 0;

    private _schema:MuSchemaTrace<BaseSchema>;
    private _savedAlloc:number = 0;
    private _savedFree:number = 0;

    constructor (schema:MuSchemaTrace<BaseSchema>, name:string) {
        this._schema = schema;
        this.name = name;
    }

    public begin () {
        this._savedAlloc = this._schema.allocCount;
        this._savedFree = this._schema.freeCount;
    }

    public end () {
        this.allocCount += this._schema.allocCount - this._savedAlloc;
        this.freeCount += this._schema.freeCount - this._savedFree;
    }
}

export class MuSchemaTrace<BaseSchema extends MuSchema<any>>
    implements MuSchema<BaseSchema['identity']> {
    public schema:BaseSchema;
    public identity:BaseSchema['identity'];
    public muType:BaseSchema['muType'];
    public muData:BaseSchema['muData'];
    public json;

    public logs:MuSchemaLogger<BaseSchema>[] = [];

    public allocCount:number = 0;
    public freeCount:number = 0;

    public createLog (name:string) : MuSchemaLogger<BaseSchema> {
        const x = new MuSchemaLogger(this, name);
        this.logs.push(x);
        return x;
    }

    public printLog () {
        const x = this.logs.map(({ name, allocCount, freeCount }) => {
            return {
                name,
                alloc: allocCount,
                free: freeCount,
                object: allocCount - freeCount,
            };
        });
        x.push({
            name: 'total',
            alloc: this.allocCount,
            free: this.freeCount,
            object: this.allocCount - this.freeCount,
        });
        if (console.table) {
            console.table(x);
        } else {
            console.log(x.map((y) => JSON.stringify(y)).join('\n'));
        }
    }

    constructor (base:BaseSchema) {
        this.schema = base;
        this.identity = base.identity;
        this.muType = base.muType;
        this.muData = base.muData;
        this.json = base.json;
    }

    public alloc () : BaseSchema['identity'] {
        this.allocCount++;
        return this.schema.alloc();
    }

    public free (x:BaseSchema['identity']) : void {
        this.freeCount++;
        return this.schema.free(x);
    }

    public equal(
        a:BaseSchema['identity'],
        b:BaseSchema['identity'],
    ) : boolean {
        return this.schema.equal(a, b);
    }

    public clone (x:BaseSchema['identity']) : BaseSchema['identity'] {
        this.allocCount++;
        return this.schema.clone(x);
    }

    public assign (
        dst:BaseSchema['identity'],
        src:BaseSchema['identity'],
    ) : BaseSchema['identity'] {
        return this.schema.assign(dst, src);
    }

    public diff (
        base:BaseSchema['identity'],
        target:BaseSchema['identity'],
        out:MuWriteStream,
    ) : boolean {
        return this.schema.diff(base, target, out);
    }

    public patch (
        base:BaseSchema['identity'],
        inp:MuReadStream,
    ) : BaseSchema['identity'] {
        this.allocCount++;
        return this.schema.patch(base, inp);
    }

    public toJSON (x:BaseSchema['identity']) : any {
        return this.schema.toJSON(x);
    }

    public fromJSON (json:any) : BaseSchema['identity'] {
        return this.schema.fromJSON(json);
    }
}
