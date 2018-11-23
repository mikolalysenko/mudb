import { MuSchema } from './schema/schema';

export class MuMessageTrace {
    public names:string[];
    public ids:number[];
    public logger:(msg:string) => void;

    constructor (spec:{
        protocols:string[],
        logger?:(msg:string) => void,
    }) {
        this.names = spec.protocols;
        this.ids = new Array(this.names.length);
        this.logger = spec.logger || ((msg) => console.log(msg));
    }

    public getIds (protocols:(string|undefined)[]) {
        for (let i = 0; i < this.names.length; ++i) {
            for (let j = 0; j < protocols.length; ++j) {
                if (protocols[j] === this.names[i]) {
                    this.ids[i] = j;
                    break;
                }
            }
            if (!this.ids[i]) {
                console.error(`mudb/tracing: '${this.names[i]}' doesn't match any protocols`);
            }
        }
    }

    public log (id:number, data:any, schema?:MuSchema<any>) {
        const idx = this.ids.indexOf(id);
        if (idx === -1) {
            return;
        }

        const json = schema ?
            JSON.stringify(schema.toJSON(data)) :
            JSON.stringify(data);
        this.logger(`${this.names[idx]}: ${json}`);
    }
}
