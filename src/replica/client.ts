import { MuCRDT } from '../crdt/crdt';
import { MuClient, MuClientProtocol } from '../client';
import { CRDTInfo, crdtProtocol } from './schema';

export class MuReplicaClient<CRDT extends MuCRDT<any, any, any>> {
    public protocol:MuClientProtocol<CRDTInfo<CRDT>['protocol']>;
    public crdt:CRDT;
    public store:CRDTInfo<CRDT>['store'];
    public history:CRDTInfo<CRDT>['action'][] = [];

    constructor (spec:{
        client:MuClient,
        crdt:CRDT,
    }) {
        this.crdt = spec.crdt;
        this.store = <CRDTInfo<CRDT>['store']>spec.crdt.store(spec.crdt.stateSchema.identity);
        this.protocol = spec.client.protocol(crdtProtocol(spec.crdt));
        this.protocol.configure({
            message: {
                init: (store) => {
                    this.store.parse(store);
                },
                squash: (state) => {
                    this.store.squash(state);
                    for (let i = 0; i < this.history.length; ++i) {
                        this.crdt.actionSchema.free(this.history[i]);
                    }
                    this.history.length = 0;
                },
                apply: (action) => {
                    this.store.apply(action);
                },
                undo: (action) => {
                    this.store.undo(action);
                },
            },
        });
    }

    public state (out?:CRDTInfo<CRDT>['state']) {
        return this.store.state(out || this.crdt.stateSchema.alloc());
    }

    public dispatch (action:CRDTInfo<CRDT>['action'], allowUndo:boolean=true) {
        if (this.store.apply(action)) {
            if (allowUndo) {
                this.history.push(this.crdt.actionSchema.clone(action));
            }
            this.protocol.server.message.apply(action);
        }
    }

    public dispatchUndo () {
        const action = this.history.pop();
        if (action) {
            if (this.store.undo(action)) {
                this.protocol.server.message.undo(action);
            }
            this.crdt.actionSchema.free(action);
        }
    }
}