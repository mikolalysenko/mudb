import { MuSchema } from './schema/schema';

export class MuTrace {
    public names:string[];
    public ids:number[];
    public logger:(log:string) => void;

    constructor (spec:{
        protocols:string[],
        logger?:(log:string) => void,
    }) {
        this.names = spec.protocols;
        this.ids = new Array(this.names.length);
        this.logger = spec.logger || ((log) => console.log(log));
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

    public logError (errorMsg:string) {
        this.logger(`error: ${errorMsg}`);
    }

    public logMessage (id:number, msg:any, schema?:MuSchema<any>) {
        const idx = this.ids.indexOf(id);
        if (idx === -1) {
            return;
        }

        const json = JSON.stringify(
            schema ? schema.toJSON(msg) : msg,
        );
        this.logger(`message: ${this.names[idx]}: ${json}`);
    }
}
