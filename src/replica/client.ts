import { MuRDA, MuRDATypes } from '../rda/rda';
import { MuClient, MuClientProtocol } from '../client';
import { MuStruct } from '../schema/struct';
import { rdaProtocol, RDAProtocol } from './schema';
import { MuScheduler } from '../scheduler/scheduler';
import { MuSystemScheduler } from '../scheduler/system';

export class MuReplicaClient<RDA extends MuRDA<any, any, any, any>> {
    public protocol:MuClientProtocol<RDAProtocol<RDA>>;
    public rda:RDA;
    public store:MuRDATypes<RDA>['store'];

    private _undoRedoSchema:MuStruct<{
        undo:RDA['actionSchema'],
        redo:RDA['actionSchema'],
    }>;

    private _undoActions:MuReplicaClient<RDA>['_undoRedoSchema']['identity'][] = [];
    private _redoActions:MuRDATypes<RDA>['action'][] = [];

    public scheduler:MuScheduler;

    constructor (spec:{
        client:MuClient,
        rda:RDA,
        scheduler?:MuScheduler,
    }) {
        this.rda = spec.rda;
        this.store = <MuRDATypes<RDA>['store']>spec.rda.createStore(spec.rda.stateSchema.identity);
        this.protocol = spec.client.protocol(rdaProtocol(spec.rda));
        this._undoRedoSchema = new MuStruct({
            undo: spec.rda.actionSchema,
            redo: spec.rda.actionSchema,
        });
        this.scheduler = spec.scheduler || MuSystemScheduler;
    }

    // change listener stuff
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
        ready?:() => void,
        change?:(state:MuRDATypes<RDA>['state']) => void,
        close?:() => void,
    }) {
        if (spec.change) {
            this._onChange = spec.change;
        }
        this.protocol.configure({
            message: {
                init: (store) => {
                    this.store.free(this.rda);
                    this.store = <MuRDATypes<RDA>['store']>this.rda.parse(store);
                    if (spec.ready) {
                        spec.ready();
                    }
                    this._notifyChange();
                },
                squash: (state) => {
                    this.store.free(this.rda);
                    this.store = <MuRDATypes<RDA>['store']>this.rda.createStore(state);
                    for (let i = 0; i < this._undoActions.length; ++i) {
                        this._undoRedoSchema.free(this._undoActions[i]);
                    }
                    this._undoActions.length = 0;
                    for (let i = 0; i < this._redoActions.length; ++i) {
                        this.rda.actionSchema.free(this._redoActions[i]);
                    }
                    this._redoActions.length = 0;
                    this._notifyChange();
                },
                apply: (action) => {
                    if (this.store.apply(this.rda, action)) {
                        this._notifyChange();
                    }
                },
            },
            close: () => {
                if (spec.close) {
                    spec.close();
                }
                this.store.free(this.rda);
                for (let i = 0; i < this._undoActions.length; ++i) {
                    this._undoRedoSchema.free(this._undoActions[i]);
                }
                this._undoActions.length = 0;
                for (let i = 0; i < this._redoActions.length; ++i) {
                    this.rda.actionSchema.free(this._redoActions[i]);
                }
                this._redoActions.length = 0;
                if (this._changeTimeout) {
                    this.scheduler.clearTimeout(this._changeTimeout);
                    this._changeTimeout = null;
                }
            },
        });
    }

    public state (out?:MuRDATypes<RDA>['state']) {
        return this.store.state(this.rda, out || this.rda.stateSchema.alloc());
    }

    public dispatch (action:MuRDATypes<RDA>['action'], allowUndo:boolean=true, cb?:(state:MuRDATypes<RDA>['state']|null) => void) {
        if (allowUndo) {
            const inverse = this.store.inverse(this.rda, action);
            const undo = this._undoRedoSchema.alloc();
            undo.undo = this.rda.actionSchema.assign(undo.undo, inverse);
            undo.redo = this.rda.actionSchema.assign(undo.redo, action);
            this._undoActions.push(undo);
            this.rda.actionSchema.free(inverse);
        }
        if (this.store.apply(this.rda, action)) {
            this.protocol.server.message.apply(action);
            if (cb) {
                this._pendingChangeCallback.push(cb);
            }
            this._notifyChange();
        } else if (cb) {
            this.scheduler.setTimeout(() => { cb(null); }, 0);
        }
    }

    public undo () {
        const action = this._undoActions.pop();
        if (action) {
            this._redoActions.push(this.rda.actionSchema.clone(action.redo));
            if (this.store.apply(this.rda, action.undo)) {
                this.protocol.server.message.apply(action.undo);
            }
            this.rda.actionSchema.free(action);
            this._notifyChange();
        }
    }

    public redo () {
        const action = this._redoActions.pop();
        if (action) {
            this.dispatch(action, true);
            this.rda.actionSchema.free(action);
        }
    }

    public action () : RDA['actionMeta'] extends { type:'store' } ? ReturnType<RDA['action']> : RDA['action'] {
        if (this.rda.actionMeta.type === 'store') {
            return this.rda.action(this.store);
        }
        return this.rda.action;
    }
}
