import { MuRDA, MuRDATypes } from '../rda/rda';
import { MuClient, MuClientProtocol } from '../client';
import { rdaProtocol, RDAProtocol } from './schema';

export class MuReplicaClient<RDA extends MuRDA<any, any, any>> {
    public protocol:MuClientProtocol<RDAProtocol<RDA>>;
    public crdt:RDA;
    public store:MuRDATypes<RDA>['store'];
    public history:MuRDATypes<RDA>['action'][] = [];

    constructor (spec:{
        client:MuClient,
        rda:RDA,
    }) {
        this.crdt = spec.rda;
        this.store = <MuRDATypes<RDA>['store']>spec.rda.store(spec.rda.stateSchema.identity);
        this.protocol = spec.client.protocol(rdaProtocol(spec.rda));
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

    public state (out?:MuRDATypes<RDA>['state']) {
        return this.store.state(out || this.crdt.stateSchema.alloc());
    }

    public dispatch (action:MuRDATypes<RDA>['action'], allowUndo:boolean=true) {
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