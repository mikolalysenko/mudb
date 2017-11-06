import { MuClient, MuClientProtocol } from 'mudb/client';
import { MuStateSchema, MuAnySchema, MuStateSet, MuDefaultStateSchema, MuStateReplica } from './state';

export class MuRemoteServerState<Schema extends MuAnySchema> implements MuStateReplica<Schema> {
    public tick:number;
    public state:Schema['identity'];
    public history:MuStateSet<Schema['identity']>;
    public windowSize:number;
}

export class MuClientState<Schema extends MuStateSchema<MuAnySchema, MuAnySchema>> implements MuStateReplica<Schema['client']> {
    public readonly sessionId:string;
    public readonly schema:Schema;
    public readonly client:MuClient;
    public server:MuRemoteServerState<Schema['server']>;

    // state history
    public tick:number = 0;
    public history:MuStateSet<Schema['client']>;
    public state:Schema['client']['identity'];
    public windowSize:number = Infinity;

    // underlying protocol
    private protocol:MuClientProtocol<typeof MuDefaultStateSchema>;

    constructor (spec:{
        schema:Schema,
        client:MuClient,
        windowSize?:number,
    }) {
        this.schema = spec.schema;
        this.client = spec.client;
        if (typeof spec.windowSize === 'number') {
            this.windowSize = spec.windowSize;
        }
        this.protocol = spec.client.protocol(MuDefaultStateSchema);
    }

    public configure(spec:{
        ready?:() => void,
        state?:(state:Schema['server']['identity'], tick:number, reliable:boolean) => void,
        close?:() => void,
    }) {
        this.protocol.configure({
            message: {},
            raw: (bytes, reliable) => {
            },
            ready: () => {
                if (spec.ready) {
                    spec.ready();
                }
            },
            close: () => {
                if (spec.close) {
                    spec.close();
                }
            },
        });
    }

    public commit (reliable?:boolean) {
    }
}
