import { MuCRDT } from '../crdt/crdt';
import { MuServer, MuServerProtocol } from '../server';
import { CRDTInfo, crdtProtocol } from './schema';

export class MuReplicaServer<CRDT extends MuCRDT<any, any, any>> {
    public protocol:MuServerProtocol<CRDTInfo<CRDT>['protocol']>;
    public crdt:CRDT;
    public store:CRDTInfo<CRDT>['store'];
    private _applyOk:CRDTInfo<CRDT>['validate'];
    private _undoOk:CRDTInfo<CRDT>['validate'];

    constructor (spec:{
        server:MuServer,
        crdt:CRDT,
        applyOk?:CRDTInfo<CRDT>['validate'],
        undoOk?:CRDTInfo<CRDT>['validate'],
        initialState?:CRDTInfo<CRDT>['state'],
        squashOnConnect?:boolean,
    }) {
        this.crdt = spec.crdt;
        this._applyOk = spec.applyOk || (() => true);
        this._undoOk = spec.undoOk || (() => true);

        this.store = <CRDTInfo<CRDT>['store']>this.crdt.store(
            'initialState' in spec ? spec.initialState : this.crdt.stateSchema.identity);

        this.protocol = spec.server.protocol(crdtProtocol(spec.crdt));
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
    public state(out?:CRDTInfo<CRDT>['state']) {
        if (out) {
            return this.store.state(out);
        } else {
            const result = this.crdt.stateSchema.alloc();
            return this.store.state(result);
        }
    }

    // squash all history to current state.  erase history and ability to undo previous actions
    public squash () {
        const head = this.state();
        this.store.squash(head);
        this.protocol.broadcast.squash(head);
        this.crdt.stateSchema.free(head);
    }

    public dispatch (action:CRDTInfo<CRDT>['action']) {
        if (this.store.apply(action)) {
            this.protocol.broadcast.apply(action);
        }
    }

    public save () : CRDTInfo<CRDT>['storeSerialized'] {
        return this.store.serialize(this.crdt.storeSchema.alloc());
    }

    public load (saved:CRDTInfo<CRDT>['storeSerialized']) {
        this.protocol.broadcast.init(saved);
        this.store.parse(saved);
    }
}