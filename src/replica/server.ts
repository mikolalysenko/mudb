import { MuRDA, MuRDATypes } from '../rda/rda';
import { MuServer, MuServerProtocol } from '../server';
import { rdaProtocol, RDAProtocol } from './schema';

type ValidateAction<RDA extends MuRDA<any, any, any>> = (action:MuRDATypes<RDA>['action']) => boolean;

export class MuReplicaServer<RDA extends MuRDA<any, any, any>> {
    public protocol:MuServerProtocol<RDAProtocol<RDA>>;
    public crdt:RDA;
    public store:MuRDATypes<RDA>['store'];
    private _applyOk:ValidateAction<RDA>;
    private _undoOk:ValidateAction<RDA>;

    constructor (spec:{
        server:MuServer,
        crdt:RDA,
        applyOk?:ValidateAction<RDA>,
        undoOk?:ValidateAction<RDA>,
        initialState?:MuRDATypes<RDA>['state'],
        squashOnConnect?:boolean,
    }) {
        this.crdt = spec.crdt;
        this._applyOk = spec.applyOk || (() => true);
        this._undoOk = spec.undoOk || (() => true);

        this.store = <MuRDATypes<RDA>['store']>this.crdt.store(
            'initialState' in spec ? spec.initialState : this.crdt.stateSchema.identity);

        this.protocol = spec.server.protocol(rdaProtocol(spec.crdt));
        this.protocol.configure({
            connect: (client) => {
                if (spec.squashOnConnect) {
                    this.squash();
                } else {
                    const state = this.save();
                    client.message.init(state);
                    this.crdt.storeSchema.free(state);
                }
            },
            message: {
                apply: (client, action) => {
                    if (!this._applyOk(action)) {
                        return;
                    }
                    this.dispatch(action);
                },
                undo: (client, action) => {
                    if (!this._undoOk(action)) {
                        return;
                    }
                    if (this.store.undo(action)) {
                        this.protocol.broadcast.undo(action);
                    }
                },
            },
        });
    }

    // polls the current state
    public state(out?:MuRDATypes<RDA>['state']) {
        return this.store.state(out || this.crdt.stateSchema.alloc());
    }

    // squash all history to current state.  erase history and ability to undo previous actions
    public squash (state?:MuRDATypes<RDA>['state']) {
        const head = state || this.state();
        this.store.squash(head);
        this.protocol.broadcast.squash(head);
        this.crdt.stateSchema.free(head);
    }

    public dispatch (action:MuRDATypes<RDA>['action']) {
        if (this.store.apply(action)) {
            this.protocol.broadcast.apply(action);
        }
    }

    public save () : MuRDATypes<RDA>['serializedStore'] {
        return this.store.serialize(this.crdt.storeSchema.alloc());
    }

    public load (saved:MuRDATypes<RDA>['serializedStore']) {
        this.protocol.broadcast.init(saved);
        this.store.parse(saved);
    }
}