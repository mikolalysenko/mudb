import { MuRDA, MuRDATypes } from '../rda/rda';
import { MuServer, MuServerProtocol } from '../server';
import { rdaProtocol, RDAProtocol } from './schema';
import { MuSessionId } from '../socket/socket';
import { MuScheduler } from '../scheduler/scheduler';
import { MuSystemScheduler } from '../scheduler/system';
import { MuLogger, MuDefaultLogger } from '../logger';

export class MuReplicaServer<RDA extends MuRDA<any, any, any, any>> {
    public protocol:MuServerProtocol<RDAProtocol<RDA>>;
    public rda:RDA;
    public store:MuRDATypes<RDA>['store'];

    public scheduler:MuScheduler;

    private _logger:MuLogger;

    constructor (spec:{
        server:MuServer,
        rda:RDA,
        savedStore?:MuRDATypes<RDA>['serializedStore'],
        initialState?:MuRDATypes<RDA>['state'],
        scheduler?:MuScheduler,
        logger?:MuLogger,
    }) {
        this._logger = spec.logger || MuDefaultLogger;
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

        this.scheduler = spec.scheduler || MuSystemScheduler;
    }

    private _pendingChangeCallback:((state:MuRDATypes<RDA>['state']) => void)[] = [];
    private _onChange = (state:MuRDATypes<RDA>['state']) => {};
    private _changeTimeout:any = null;
    private _handleChange = () => {
        this._changeTimeout = null;
        const state = this.state();
        this._onChange(state);
        for (let i = 0; i < this._pendingChangeCallback.length; ++i) {
            this._pendingChangeCallback[i].call(null, state);
        }
        this._pendingChangeCallback.length = 0;
        this.rda.stateSchema.free(state);
    }
    private _notifyChange () {
        if (this._changeTimeout) {
            return;
        }
        this._changeTimeout = this.scheduler.setTimeout(this._handleChange, 0);
    }

    public configure(spec:{
        connect?:(sessionId:MuSessionId) => void;
        disconnect?:(sessionId:MuSessionId) => void;
        change?:(state:MuRDATypes<RDA>['state']) => void;
        checkApply?:(action:MuRDATypes<RDA>['action'], sessionId:MuSessionId) => boolean;
        checkUndo?:(action:MuRDATypes<RDA>['action'], sessionId:MuSessionId) => boolean;
    }) {
        if (spec.change) {
            this._onChange = spec.change;
        }
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
                        this._logger.log(`invalid action ${JSON.stringify} from ${client.sessionId}`);
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
    public dispatch (action:MuRDATypes<RDA>['action'], cb?:(state:MuRDATypes<RDA>['state']|null) => void) {
        if (this.store.apply(this.rda, action)) {
            this.protocol.broadcast.apply(action);
            if (cb) {
                this._pendingChangeCallback.push(cb);
            }
            this._notifyChange();
        } else if (cb) {
            this.scheduler.setTimeout(() => cb(null), 0);
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
