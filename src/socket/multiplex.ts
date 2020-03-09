import {
    MuSocketServer,
    MuSocketServerState,
    MuSocketServerSpec,
    MuSocket,
    MuCloseHandler,
} from './socket';

export class MuMultiSocketServer implements MuSocketServer {
    private _state = MuSocketServerState.INIT;

    public state () : MuSocketServerState {
        return this._state;
    }

    // currently not in use
    public clients:MuSocket[] = [];

    private _servers:MuSocketServer[];
    private _numLiveServers = 0;

    private _onclose:MuCloseHandler = () => { };

    constructor (servers:MuSocketServer[]) {
        this._servers = servers;
    }

    public start (spec:MuSocketServerSpec) {
        this._onclose = spec.close;

        for (let i = 0; i < this._servers.length; ++i) {
            this._servers[i].start({
                ready: () => ++this._numLiveServers,
                connection: spec.connection,
                close: () => --this._numLiveServers,
            });
        }

        const startHandle = setInterval(
            () => {
                if (this._numLiveServers < this._servers.length) {
                    return;
                }

                clearInterval(startHandle);

                this._state = MuSocketServerState.RUNNING;
                spec.ready();
            },
            300,
        );
    }

    public close () {
        for (let i = 0; i < this._servers.length; ++i) {
            this._servers[i].close();
        }

        const closeHandle = setInterval(
            () => {
                if (this._numLiveServers > 0) {
                    return;
                }

                clearInterval(closeHandle);

                this._state = MuSocketServerState.SHUTDOWN;
                this._onclose();
            },
            300,
        );
    }
}
