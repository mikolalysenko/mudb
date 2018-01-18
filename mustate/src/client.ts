import { MuClient, MuClientProtocol } from 'mudb/client';
import {
    MuStateSchema,
    MuAnySchema,
    MuStateSet,
    MuDefaultStateSchema,
    MuStateReplica,
    addObservation,
    forgetObservation,
    parseState,
    publishState,
    garbageCollectStates,
} from './state';

export class MuRemoteServerState<Schema extends MuAnySchema> implements MuStateReplica<Schema> {
    public tick:number = 0;
    public state:Schema['identity'];
    public history:MuStateSet<Schema['identity']>;
    public windowSize:number;

    constructor(schema:MuAnySchema, windowSize:number) {
        this.history = new MuStateSet(schema.identity);
        this.state = this.history.states[0];
        this.windowSize = windowSize;
    }
}

export class MuClientState<Schema extends MuStateSchema<MuAnySchema, MuAnySchema>> implements MuStateReplica<Schema['client']> {
    public readonly sessionId:string;
    public readonly schema:Schema;
    public readonly client:MuClient;
    public server:MuRemoteServerState<Schema['server']>;

    // state history
    public tick:number = 0;
    public history:MuStateSet<Schema['client']['identity']>;
    public state:Schema['client']['identity'];
    public windowSize:number = Infinity;

    // underlying protocol
    private _protocol:MuClientProtocol<typeof MuDefaultStateSchema>;
    private _observedStates:number[][] = [[0]];

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
        this._protocol = spec.client.protocol(MuDefaultStateSchema);
        this.state = spec.schema.client.clone(spec.schema.client.identity);
        this.history = new MuStateSet(spec.schema.client.identity);
        this.server = new MuRemoteServerState(spec.schema.server, this.windowSize);
    }

    public configure(spec?:{
        ready?:() => void,
        state?:(state:Schema['server']['identity'], tick:number, reliable:boolean) => void,
        close?:() => void,
    }) {
        this._protocol.configure({
            message: {
                ackState: (tick) => {
                    addObservation(this._observedStates[0], tick);
                },
                forgetState: (horizon) => {
                    forgetObservation(this._observedStates[0], horizon);
                },
            },
            raw: (data, unreliable) => {
                if (!(data instanceof Uint8Array)) {
                    return;
                }
                if (parseState(data, this.schema.server, this.server, this._protocol.server.message.ackState)) {
                    if (spec && spec.state) {
                        spec.state(this.server.state, this.server.tick, !unreliable);
                    }
                }
            },
            ready: () => {
                if (spec && spec.ready) {
                    spec.ready();
                }
            },
            close: () => {
                garbageCollectStates(this.schema.client, this.history, 0);
                garbageCollectStates(this.schema.server, this.history, 0);
                if (spec && spec.close) {
                    spec.close();
                }
            },
        });
    }

    public commit (reliable?:boolean) {
        publishState(
            this.schema.client,
            this._observedStates,
            this,
            this._protocol.server.sendRaw,
            this._protocol.server.message.forgetState,
            !!reliable);
    }
}
