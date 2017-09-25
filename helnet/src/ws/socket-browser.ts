/*
import {
    HelSessionId,
    HelSocket,
    HelSocketSpec,
    HelMessageHandler,
    HelCloseHandler,
    HelData,
} from '../net';

export class HelWebSocketDOM implements HelSocket {
    public readonly sessionId:HelSessionId;

    private _started:boolean = false;
    private _closed:boolean = false;

    private _reliableSocket:WebSocket;
    private _unreliableSockets:WebSocket[];
    private _currentSocket:number = 0;

    private _url:string;
    private _numUnreliable:number;

    public open:boolean = false;

    private _onMessage:HelMessageHandler;
    private _onUnreliableMessage:HelMessageHandler;
    private _onClose:HelCloseHandler;

    constructor (
        sessionId:HelSessionId,
        url:string,
        numUnreliable:number,
    ) {
        this.sessionId = sessionId;
        this._url = url;
        this._numUnreliable = numUnreliable;
    }

    public start (spec:HelSocketSpec) {
        if (this._started) {
            setTimeout(
                () => {
                    spec.onReady('socket already started');
                },
                0);
            return;
        }

        this._started = true;

        let reliableCount = 1;
        let unreliableCount = this._numUnreliable;
        let firedReady = false;

        const abortConnect = () => {
            if (!firedReady) {
                firedReady = true;
                spec.onReady('connection failed');
            }
            if (this._closed) {
                return;
            }
            this._closed = true;
            this._reliableSocket.close();
            for (let i = 0; i < this._unreliableSockets.length; ++i) {
                this._unreliableSockets[i].close();
            }
        };

        const checkSocketStatus = () => {
            if (reliableCount !== 0 ||
                unreliableCount !== 0 ||
                this._closed) {
                return;
            }

            const close = () => this.close();
            this._reliableSocket.onclose = close;
            this._reliableSocket.onmessage = ({data}) => this._onMessage(data);

            const onUnreliableMessage = ({data}) => this._onUnreliableMessage(data);
            for (let i = 0; i < this._unreliableSockets.length; ++i) {
                this._unreliableSockets[i].onclose = close;
                this._unreliableSockets[i].onmessage = onUnreliableMessage;
            }

            this.open = true;
            this._onMessage = spec.onMessage;
            this._onUnreliableMessage = spec.onUnreliableMessage;
            this._onClose = spec.onClose;
            firedReady = true;
            spec.onReady();
        };

        this._reliableSocket = new WebSocket(this._url);
        this._reliableSocket.onopen = () => {
            this._reliableSocket.send(JSON.stringify({
                role: 'reliable',
                sessionId: this.sessionId,
                numUnreliable: this._numUnreliable,
            }));
            --reliableCount;
            checkSocketStatus();
        };
        this._reliableSocket.onclose = abortConnect;

        const unreliable:WebSocket[] = [];
        for (let i = 0; i < this._numUnreliable; ++i) {
            const ws = new WebSocket(this._url);
            unreliable.push(ws);
            ws.onopen = ((ws_:WebSocket) =>
                () => {
                    ws_.send(JSON.stringify({
                        role: 'unreliable',
                        sessionId: this.sessionId,
                    }));
                    --unreliableCount;
                    checkSocketStatus();
                })(ws);
            ws.onclose = abortConnect;
        }
        this._unreliableSockets = unreliable;
    }

    public send (message:HelData) {
        if (this.open) {
            this._reliableSocket.send(message);
        }
    }

    public sendUnreliable (message:HelData) {
        if (this.open) {
            this._unreliableSockets[this._currentSocket++ % this._unreliableSockets.length].send(message);
        }
    }

    public close () {
    }
}

export function connectToServer (spec:{
    sessionId:HelSessionId;
    url:string;
    numUnreliable?:number;
}) : HelWebSocketDOM {
    return new HelWebSocketDOM(
        spec.sessionId,
        spec.url,
        spec.numUnreliable || 5);
}
*/