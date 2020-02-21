import { MuWriteStream, MuReadStream } from '../stream';
import { MuSchema } from './schema';

export class MuDate implements MuSchema<Date> {
    public readonly muType = 'date';
    public readonly identity:Date;
    public readonly json;
    public pool:Date[] = [];

    constructor (identity?:Date) {
        this.identity = new Date(0);
        if (identity) {
            this.identity.setTime(identity.getTime());
        }
        this.json = {
            type: 'date',
            identity: this.identity.toISOString(),
        };
    }

    public alloc () : Date {
        return this.pool.pop() || new Date();
    }

    public free (date:Date) : void {
        this.pool.push(date);
    }

    public equal (a:Date, b:Date) : boolean {
        return a.getTime() === b.getTime();
    }

    public clone (date_:Date) : Date {
        const date = this.alloc();
        date.setTime(date_.getTime());
        return date;
    }

    public assign (dst:Date, src:Date) : Date {
        dst.setTime(src.getTime());
        return dst;
    }

    public diff (base:Date, target:Date, out:MuWriteStream) : boolean {
        const bt = base.getTime();
        const tt = target.getTime();
        if (bt !== tt) {
            out.grow(10);
            out.writeVarint(tt % 0x10000000);
            out.writeVarint(tt / 0x10000000 | 0);
            return true;
        }
        return false;
    }

    public patch (base:Date, inp:MuReadStream) : Date {
        const date = this.alloc();
        const lo = inp.readVarint();
        const hi = inp.readVarint();
        date.setTime(lo + 0x10000000 * hi);
        return date;
    }

    public toJSON (date:Date) : string {
        return date.toISOString();
    }

    public fromJSON (x:string) : Date {
        if (typeof x === 'string') {
            const ms = Date.parse(x);
            if (ms) {
                const date = this.alloc();
                date.setTime(ms);
                return date;
            }
        }
        return this.clone(this.identity);
    }
}
