import { MuReadStream, MuWriteStream } from '../stream';
import { MuString } from './_string';

export class MuUTF8 extends MuString<'utf8'> {
    constructor (identity?:string) {
        super(identity || '', 'utf8');
    }

    public diff (base:string, target:string, stream:MuWriteStream) : boolean {
        if (base !== target) {
            stream.writeString(target);
            return true;
        }
        return false;
    }

    public patch (base:string, stream:MuReadStream) : string {
        return stream.readString();
    }
}
