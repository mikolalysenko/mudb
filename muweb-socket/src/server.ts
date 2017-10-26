import {
    MuSessionId,
    MuSocket,
    MuSocketSpec,
    MuSocketServer,
    MuSocketServerSpec
} from 'mudb/socket';
import ws = require('uws');

export class MuWebSocketClient implements MuSocket {
    public readonly sessionId:MuSessionId;
    public open:boolean;

    private _reliableConnection:object;
    private _unreliableConnections:object[];

    private _pendingReliableMessages:Uint8Array[];
    private _pendingUnreliableMessages:Uint8Array[];

    constructor () {
    }

    public start(spec:MuSocketSpec) {
        process.nextTick(() => {

            // drain all messages

        });
    }

    public send(data:Uint8Array, unreliable?:boolean) {
    }

    public close() {
    }
}

export class MuWebSocketServer implements MuSocketServer {
    public clients:MuWebSocketClient[];
    public open:boolean;

    constructor (spec:{
        host?:string,
        port?:number,
        backlog?:number,
        server?:object,
        maxPayload?:number,
        perMessageDeflate?:boolean,
    }) {
    }

    public start(spec:MuSocketServerSpec) {
    }

    public close() {
    }
}