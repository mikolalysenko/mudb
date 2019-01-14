import { MuSchema } from './schema/schema';

export class MuTrace {
    public protocols:string[];
    public ids:number[];
    public logger:(log:string) => void;

    constructor (spec?:{
        protocols?:string[],
        logger?:(log:string) => void,
    }) {
        this.protocols = (spec && spec.protocols) || [];
        this.ids = new Array(this.protocols.length);
        this.logger = (spec && spec.logger) || ((log) => console.log(log));
    }

    public getIds (protocols:(string|undefined)[]) {
        for (let i = 0; i < this.protocols.length; ++i) {
            for (let j = 0; j < protocols.length; ++j) {
                if (this.protocols[i] === protocols[j]) {
                    this.ids[i] = j;
                    break;
                }
            }
            if (!this.ids[i]) {
                console.error(`'${this.protocols[i]}' doesn't match any protocols`);
            }
        }
    }

    public log (msg:string) {
        this.logger(`mudb: ${msg}`);
    }

    public logError (errorMsg:string) {
        this.logger(`mudb error: ${errorMsg}`);
    }

    // "message" as in "message passing"
    public logMessage (protocolId:number, msg:any, schema?:MuSchema<any>) {
        const idx = this.ids.indexOf(protocolId);
        if (idx === -1) {
            return;
        }

        const json = JSON.stringify(
            schema ? schema.toJSON(msg) : msg,
        );
        this.logger(`mudb message: ${this.protocols[idx]}: ${json}`);
    }
}
