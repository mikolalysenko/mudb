import { MuRDA, MuRDATypes } from '../rda/rda';
import { MuServer, MuServerProtocol } from '../server';
import { rdaProtocol, RDAProtocol } from './schema';
import { MuSessionId } from '../socket';

export class MuReplicaServer<RDA extends MuRDA<any, any, any>> {
    public protocol:MuServerProtocol<RDAProtocol<RDA>>;
    public rda:RDA;
    public store:MuRDATypes<RDA>['store'];

    constructor (spec:{
        server:MuServer,
        rda:RDA,
        initialState?:MuRDATypes<RDA>['state'],
    }) {
        this.rda = spec.rda;
        this.store = <MuRDATypes<RDA>['store']>this.rda.store(
            'initialState' in spec
                ? spec.initialState
                : this.rda.stateSchema.identity);
        this.protocol = spec.server.protocol(rdaProtocol(spec.rda));
    }

    private _onChange?:(state?:MuRDATypes<RDA>['state']) => void;
    private _changeTimeout:any = null;
    private _handleChange () {
        this._changeTimeout = null;
        if (!this._onChange) {
            return;
        }
        if (this._onChange.length > 0) {
            const state = this.state();
            this._onChange(state);
            this.rda.stateSchema.free(state);
        } else {
            this._onChange();
        }
    }
    private _notifyChange() {
        if (!this._onChange || this._changeTimeout) {
            return;
        }
        this._changeTimeout = setTimeout(this._handleChange, 0);
    }

    public configure(spec:{
        connect?:(sessionId:MuSessionId) => void;
        disconnect?:(sessionId:MuSessionId) => void;
        change?:(state:MuRDATypes<RDA>['state']) => void;
        checkApply?:(action:MuRDATypes<RDA>['action'], sessionId:MuSessionId) => boolean;
        checkUndo?:(action:MuRDATypes<RDA>['action'], sessionId:MuSessionId) => boolean;
    }) {
        this._onChange = spec.change;
        this.protocol.configure({
            connect: (client) => {
                const state = this.save();
                client.message.init(state);
                this.rda.storeSchema.free(state);
                if (spec.connect) {
                    spec.connect(client.sessionId);
                }
            },
            disconnect: (client) => {
                if (spec.disconnect) {
                    spec.disconnect(client.sessionId);
                }
            },
            message: {
                apply: (client, action) => {
                    if (spec.checkApply && !spec.checkApply(action, client.sessionId)) {
                        return;
                    }
                    this.dispatch(action);
                },
                undo: (client, action) => {
                    if (spec.checkUndo && !spec.checkUndo(action, client.sessionId)) {
                        return;
                    }
                    if (this.store.undo(action)) {
                        this.protocol.broadcast.undo(action);
                        this._notifyChange();
                    }
                },
            },
        });
    }

    // polls the current state
    public state(out?:MuRDATypes<RDA>['state']) {
        return this.store.state(out || this.rda.stateSchema.alloc());
    }

    // squash all history to current state.  erase history and ability to undo previous actions
    public squash (state?:MuRDATypes<RDA>['state']) {
        const head = state || this.state();
        this.store.squash(head);
        this.protocol.broadcast.squash(head);
        this.rda.stateSchema.free(head);
        this._notifyChange();
    }

    public dispatch (action:MuRDATypes<RDA>['action']) {
        if (this.store.apply(action)) {
            this.protocol.broadcast.apply(action);
            this._notifyChange();
        }
    }

    public save () : MuRDATypes<RDA>['serializedStore'] {
        return this.store.serialize(this.rda.storeSchema.alloc());
    }

    public load (saved:MuRDATypes<RDA>['serializedStore']) {
        this.protocol.broadcast.init(saved);
        this.store.parse(saved);
        this._notifyChange();
    }
}