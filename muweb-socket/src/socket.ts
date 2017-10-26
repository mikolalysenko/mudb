import { MuSessionId, MuSocket, MuSocketSpec } from 'mudb/socket';

export class MuWebSocket implements MuSocket {
    public readonly sessionId:MuSessionId;
    public open:boolean = false;

    private _started:boolean = false;
    private _closed:boolean = false;

    private _url:string;
    private _reliableSocket:WebSocket;
    private _unreliableSockets:WebSocket[] = [];
    private _maxSockets:number = 5;

    private _lastSocketSend:number = 0;

    constructor (spec:{
        sessionId:MuSessionId,
        url:string,
        query?:{ [arg:string]:string },
        maxSockets?:number,
    }) {
        this.sessionId = spec.sessionId;
        
        // generate query url
        const query = spec.query || {}
        const queryString = Object.keys(query).map((arg) => encodeURIComponent(arg) + '=' + encodeURIComponent(query[arg]))
        queryString.push(`sessionID=${encodeURIComponent(spec.sessionId)}`);
        this._url = `${encodeURI(spec.url)}?${queryString.join('&')}`;

        if (spec.maxSockets) {
            this._maxSockets = Math.max(1, spec.maxSockets | 0);
        }
    }

    public start(spec:MuSocketSpec) {
        if (this._started) {
            throw new Error('socket already started');
        }
        if (this._closed) {
            throw new Error('socket already closed');
        }
        this._started = true;
        for (let i = 0; i <= this._maxSockets; ++i) {
            // open a socket
        }

        // once at least one unreliable socket and one reliable socket is opened then we can start
    }

    public send(data:Uint8Array, unreliable?:boolean) {
        if (!this.open) {
            return;
        }
        if (unreliable) {
            const id = (this._lastSocketSend++) % this._unreliableSockets.length;
        } else {

        }
    }

    public close() {
        if (this._closed) {
            return;
        }
        this._closed = true;
        if (this._reliableSocket) {
            this._reliableSocket.close();
        }
        for (let i = 0; i < this._unreliableSockets.length; ++i) {
            this._unreliableSockets[i].close();
        }
    }
}