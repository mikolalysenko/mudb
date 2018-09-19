import { MuServer, MuServerProtocol, MuRemoteClient } from 'mudb/server';
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

    private _client:MuRemoteClient<typeof MuDefaultStateSchema['client']>;

    constructor(client:MuRemoteClient<typeof MuDefaultStateSchema['client']>, schema:Schema, windowSize:number) {
        this._client = client;
        this.sessionId = client.sessionId;
        this.windowSize = windowSize;
        this.state = schema.clone(schema.identity);
        this.history = new MuStateSet(this.state);
    }

    public close () {
        this._client.close();
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
    public tick = 0;
    public state:Schema['server']['identity'];
    public history:MuStateSet<Schema['server']['identity']>;
    public windowSize = 0;
    public maxHistorySize = Infinity;

    private _protocol:MuServerProtocol<typeof MuDefaultStateSchema>;
    private _observedStates:number[][] = [];

    constructor(spec:{
        server:MuServer,
        schema:Schema,
        windowSize?:number,
        maxHistorySize?:number,
    }) {
        this.server = spec.server;
        this.schema = spec.schema;
        if (typeof spec.windowSize === 'number') {
            this.windowSize = spec.windowSize;
        }
        if (typeof spec.maxHistorySize === 'number') {
            this.maxHistorySize = spec.maxHistorySize;
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
                    const index = findClient(this.clients, client.sessionId);
                    addObservation(this._observedStates[index], tick);
                },
                forgetState: (client, tick) => {
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
                if (parseState(data, this.schema.client, client, client_.message.ackState, client_.message.forgetState)) {
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

                publishState(
                    this.schema.server,
                    this._observedStates,
                    this,
                    client_.sendRaw,
                    true,
                );
            },
            disconnect: (client_) => {
                const clientId = findClient(this.clients, client_.sessionId);
                if (spec && spec.disconnect) {
                    spec.disconnect(this.clients[clientId]);
                }
                const client = this.clients[clientId];
                garbageCollectStates(this.schema.client, client.history, Infinity);
                removeItem(this.clients, clientId);
                removeItem(this._observedStates, clientId);
            },
        });
    }

    public commit(reliable?:boolean) {
        const observedStates = this._observedStates;
        const mostRecentCommonTick = publishState(
            this.schema.server,
            observedStates,
            this,
            this._protocol.broadcastRaw,
            !!reliable,
        );

        for (let i = 0; i < observedStates.length; ++i) {
            const ticks = observedStates[i];

            // kick client if the latest acked state is stale
            if (this.tick - ticks[ticks.length - 1] >= this.maxHistorySize) {
                this.clients[i].close();
                continue;
            }

            // remove ticks smaller than mostRecentCommonTick
            let ptr = 1;
            while (ptr < ticks.length && ticks[ptr] < mostRecentCommonTick) {
                ++ptr;
            }
            let optr = 1;
            while (ptr < ticks.length) {
                ticks[optr++] = ticks[ptr++];
            }
            ticks.length = optr;
        }
    }
}
