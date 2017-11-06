import { MuServer, MuServerProtocol } from 'mudb/server';
import { MuStateSchema, MuAnySchema, MuStateSet, MuDefaultStateSchema, MuStateReplica } from './state';

export class MuRemoteClientState<Schema extends MuAnySchema> implements MuStateReplica<Schema> {
    public sessionId:string;

    // replica stuff
    public tick:number;
    public state:Schema['identity'];
    public history:MuStateSet<Schema['identity']>;
    public windowSize:number;
}

export class MuServerState<Schema extends MuStateSchema<MuAnySchema, MuAnySchema>> implements MuStateReplica<Schema['server']> {
    public readonly clients:MuRemoteClientState<Schema['client']>[] = [];
    public readonly schema:Schema;
    public server:MuServer;

    // replica stuff
    public tick:number;
    public state:Schema['server']['identity'];
    public history:MuStateSet<Schema['server']['identity']>;
    public windowSize:number = Infinity;

    private protocol:MuServerProtocol<typeof MuDefaultStateSchema>;

    constructor(spec:{
        server:MuServer,
        schema:Schema,
        windowSize?:number,
    }) {
        this.server = spec.server;
        this.schema = spec.schema;
        if (typeof spec.windowSize === 'number') {
            this.windowSize = spec.windowSize;
        }
        this.protocol = spec.server.protocol(MuDefaultStateSchema);
    }

    public configure(spec:{
        ready?:() => void,
        connect?:(client:MuRemoteClientState<Schema['client']>) => void,
        disconnect?:(client:MuRemoteClientState<Schema['client']>) => void,
        state?:(client:MuRemoteClientState<Schema['client']>, state:Schema['client']['identity'], tick:number, reliable:boolean) => void,
    }) {
        this.protocol.configure({
            message: {},
            raw: (client, bytes) => {

            },
            ready: () => {
                if (spec.ready) {
                    spec.ready();
                }
            },
        });
    }

    public commit(reliable?:boolean) {
    }
}
