import { MuServer, MuServerProtocol, MuRemoteClientProtocol } from 'mudb/server';
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

export class MuRemoteClientState<Schema extends MuAnySchema> implements MuStateReplica<Schema> {
    public sessionId:string;

    // replica stuff
    public tick:number = 0;
    public state:Schema['identity'];
    public history:MuStateSet<Schema['identity']>;
    public windowSize:number;

    private _client:MuRemoteClientProtocol<typeof MuDefaultStateSchema['client']>;

    constructor(client:MuRemoteClientProtocol<typeof MuDefaultStateSchema['client']>, schema:Schema, windowSize:number) {
        this._client = client;
        this.sessionId = client.sessionId;
        this.windowSize = windowSize;
        this.state = schema.clone(schema.identity);
        this.history = new MuStateSet(this.state);
    }
}

function findClient<ClientType extends MuRemoteClientState<MuAnySchema>>(clients:ClientType[], id:string) {
    for (let i = 0; i < clients.length; ++i) {
        if (clients[i].sessionId === id) {
            return i;
        }
    }
    return -1;
}

function removeItem (array:any[], index:number) {
    array[index] = array[array.length - 1];
    array.pop();
}

export class MuServerState<Schema extends MuStateSchema<MuAnySchema, MuAnySchema>> implements MuStateReplica<Schema['server']> {
    public readonly clients:MuRemoteClientState<Schema['client']>[] = [];
    public readonly schema:Schema;
    public server:MuServer;

    // replica stuff
    public tick:number = 0;
    public state:Schema['server']['identity'];
    public history:MuStateSet<Schema['server']['identity']>;
    public windowSize:number = Infinity;

    private _protocol:MuServerProtocol<typeof MuDefaultStateSchema>;
    private _observedStates:number[][] = [];

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
        this.state = this.schema.server.clone(this.schema.server.identity);
        this.history = new MuStateSet(this.schema.server.identity);
        this._protocol = spec.server.protocol(MuDefaultStateSchema);
    }

    public configure(spec?:{
        ready?:() => void,
        connect?:(client:MuRemoteClientState<Schema['client']>) => void,
        disconnect?:(client:MuRemoteClientState<Schema['client']>) => void,
        state?:(client:MuRemoteClientState<Schema['client']>, state:Schema['client']['identity'], tick:number, reliable:boolean) => void,
    }) {
        this._protocol.configure({
            message: {
                ackState: (client, tick) => {
                    if (tick > this.tick || tick !== tick >>> 0) {
                        return;
                    }
                    const index = findClient(this.clients, client.sessionId);
                    addObservation(this._observedStates[index], tick);
                },
                forgetState: (client, tick) => {
                    if (tick >= this.tick || tick !== tick >>> 0) {
                        return;
                    }
                    const index = findClient(this.clients, client.sessionId);
                    forgetObservation(this._observedStates[index], tick);
                },
            },
            ready: () => {
                if (spec && spec.ready) {
                    spec.ready();
                }
            },
            raw: (client_, data, unreliable) => {
                if (!(data instanceof Uint8Array)) {
                    return;
                }
                const client = this.clients[findClient(this.clients, client_.sessionId)];
                if (parseState(data, this.schema.client, client, client_.message.ackState)) {
                    if (spec && spec.state) {
                        spec.state(client, client.state, client.tick, !unreliable);
                    }
                }
            },
            connect: (client_) => {
                const client = new MuRemoteClientState(client_, this.schema.client, this.windowSize);
                this.clients.push(client);
                this._observedStates.push([0]);
                if (spec && spec.connect) {
                    spec.connect(client);
                }
                // TODO send initial state packet to client

            },
            disconnect: (client_) => {
                const clientId = findClient(this.clients, client_.sessionId);
                if (spec && spec.disconnect) {
                    spec.disconnect(this.clients[clientId]);
                }
                const client = this.clients[clientId];
                garbageCollectStates(this.schema.client, client.history, 0);
                removeItem(this.clients, clientId);
                removeItem(this._observedStates, clientId);
            },
        });
    }

    public commit(reliable?:boolean) {
        publishState(
            this.schema.server,
            this._observedStates,
            this,
            this._protocol.broadcastRaw,
            this._protocol.broadcast.forgetState,
            !!reliable);
    }
}
