import { MuRDA, MuRDATypes, MuRDAActionMeta } from '../rda/rda';
import { MuServer, MuServerProtocol } from '../server';
import { rdaProtocol, RDAProtocol } from './schema';
import { MuSessionId } from '../socket';

export class MuReplicaServer<RDA extends MuRDA<any, any, any, any>> {
    public protocol:MuServerProtocol<RDAProtocol<RDA>>;
    public rda:RDA;
    public store:MuRDATypes<RDA>['store'];

    constructor (spec:{
        server:MuServer,
        rda:RDA,
        savedStore?:MuRDATypes<RDA>['serializedStore'],
        initialState?:MuRDATypes<RDA>['state'],
    }) {
        this.rda = spec.rda;
        if ('savedStore' in spec) {
            this.store = <MuRDATypes<RDA>['store']>this.rda.parse(spec.savedStore);
        } else {
            this.store = <MuRDATypes<RDA>['store']>this.rda.createStore(
                'initialState' in spec
                    ? spec.initialState
                    : this.rda.stateSchema.identity);
        }
        this.protocol = spec.server.protocol(rdaProtocol(spec.rda));

        const self = this;
        function wrapAction (meta:MuRDAActionMeta, index:string) {
            if (meta.type === 'unit' || meta.type === 'partial') {
                return (new Function(
                    'self',
                    `return function () { return self.rda.action(self.store)${index}.apply(null, arguments); }`,
                ))(self);
            } else if (meta.type === 'table') {
                const result:any = {};
                const ids = Object.keys(meta.table);
                for (let i = 0; i < ids.length; ++i) {
                    const id = ids[i];
                    result[id] = wrapAction(meta.table[id], `${index}["${id}"]`);
                }
                return result;
            }
            return {};
        }

        if (spec.rda.actionMeta.type === 'store') {
            this.action = wrapAction(spec.rda.actionMeta.action, '');
        } else {
            this.action = spec.rda.action;
        }
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
            },
        });
    }

    // polls the current state
    public state(out?:MuRDATypes<RDA>['state']) {
        return this.store.state(this.rda, out || this.rda.stateSchema.alloc());
    }

    // dispatch an action
    public dispatch (action:MuRDATypes<RDA>['action']) {
        if (this.store.apply(this.rda, action)) {
            this.protocol.broadcast.apply(action);
            this._notifyChange();
        }
    }

    public action () : RDA['actionMeta'] extends { type:'store' } ? ReturnType<RDA['action']> : RDA['action'] {
        if (this.rda.actionMeta.type === 'store') {
            return this.rda.action(this.store);
        }
        return this.rda.action;
    }

    // squash all history to current state.  erase history and ability to undo previous actions
    public reset (state?:MuRDATypes<RDA>['state']) {
        const head = state || this.rda.stateSchema.identity;
        this.store.free(this.rda);
        this.store = <MuRDATypes<RDA>['store']>this.rda.createStore(head);
        this.protocol.broadcast.squash(head);
        this._notifyChange();
    }

    // save store
    public save () : MuRDATypes<RDA>['serializedStore'] {
        return this.store.serialize(this.rda, this.rda.storeSchema.alloc());
    }

    // load store
    public load (saved:MuRDATypes<RDA>['serializedStore']) {
        this.protocol.broadcast.init(saved);
        this.store.free(this.rda);
        this.store = <MuRDATypes<RDA>['store']>this.rda.parse(saved);
        this._notifyChange();
    }
}
