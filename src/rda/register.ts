import { MuStruct } from '../schema/struct';
import { MuSchema } from '../schema/schema';
import { MuUUIDSchema, createUUID, MuUUID } from './uuid';
import { MuRDA, MuRDAStore } from './rda';
import { MuArray } from '../schema';

export class MuRDARegisterNode<State> {
    public uuid:MuUUID;
    public state:State;
    public next:MuRDARegisterNode<State>|null = null;
    public prev:MuRDARegisterNode<State>|null = null;

    constructor (id:MuUUID, state:State) {
        this.uuid = id;
        this.state = state;
    }
}

export interface MuRDARegisterTypes<StateSchema extends MuSchema<any>> {
    stateSchema:StateSchema;
    state:StateSchema['identity'];

    actionSchema:MuStruct<{
        uuid:typeof MuUUIDSchema;
        state:StateSchema;
    }>;
    action:MuRDARegisterTypes<StateSchema>['actionSchema']['identity'];

    storeSchema:MuStruct<{
        uuids:MuArray<typeof MuUUIDSchema>;
        states:MuArray<StateSchema>;
    }>;
    store:MuRDARegisterTypes<StateSchema>['storeSchema']['identity'];

    node:MuRDARegisterNode<MuRDARegisterTypes<StateSchema>['state']>;
}

export class MuRDARegisterStore<StateSchema extends MuSchema<any>>
    implements MuRDAStore<
        MuRDARegisterTypes<StateSchema>['stateSchema'],
        MuRDARegisterTypes<StateSchema>['actionSchema'],
        MuRDARegisterTypes<StateSchema>['storeSchema']> {
    private _stateSchema:StateSchema;
    public head:MuRDARegisterTypes<StateSchema>['node']|null;
    public nodes:{ [uuid:string]:MuRDARegisterTypes<StateSchema>['node'] } = {};

    constructor (
        stateSchema:StateSchema,
        initial:MuRDARegisterTypes<StateSchema>['state']) {
        this._stateSchema = stateSchema;
        this.head = new MuRDARegisterNode('', this._stateSchema.clone(initial));
        this.nodes[''] = this.head;
    }

    public state (out:MuRDARegisterTypes<StateSchema>['state']) {
        if (this.head) {
            return this._stateSchema.assign(out, this.head.state);
        } else {
            return this._stateSchema.assign(out, this._stateSchema.identity);
        }
    }

    public apply (action:MuRDARegisterTypes<StateSchema>['action']) {
        const node = this.nodes[action.uuid];
        if (node) {
            if (node !== this.head) {
                // disconnect pointers
                if (node.next) { node.next.prev = node.prev; }
                if (node.prev) { node.prev.next = node.next; }

                // move to head
                node.next = null;
                node.prev = this.head;
                this.head = node;
            }
        } else {
            // insert into front of list
            const head = new MuRDARegisterNode(action.uuid, this._stateSchema.clone(action.state));
            head.prev = this.head;
            if (this.head) {
                this.head.next = head;
            }
            this.head = head;
            this.nodes[action.uuid] = head;
        }
        return true;
    }

    public undo (action:MuRDARegisterTypes<StateSchema>['action']) {
        const node = this.nodes[action.uuid];
        if (node) {
            if (node.prev) {
                if (node === this.head) { this.head = node.prev; }
                node.prev.next = node.next;
            }
            if (node.next) { node.next.prev = node.prev; }
            node.next = node.prev = null;
            return true;
        } else {
            return false;
        }
    }

    public squash (state:MuRDARegisterTypes<StateSchema>['state']) {
        const uuids = Object.keys(this.nodes);
        for (let i = 0; i < uuids.length; ++i) {
            const node = this.nodes[uuids[i]];
            node.next = node.prev = null;
            this._stateSchema.free(node.state);
        }
        this.head = new MuRDARegisterNode('', this._stateSchema.clone(state));
        this.nodes = {};
    }

    public destroy () {
        const uuids = Object.keys(this.nodes);
        for (let i = 0; i < uuids.length; ++i) {
            const node = this.nodes[uuids[i]];
            node.next = node.prev = null;
            this._stateSchema.free(node.state);
        }
        this.nodes = {};
    }

    public serialize (out:MuRDARegisterTypes<StateSchema>['store']) : MuRDARegisterTypes<StateSchema>['store'] {
        const ids = out.uuids;
        const states = out.states;
        ids.length = 0;
        states.length = 0;
        for (let node = this.head; node; node = node.prev) {
            ids.push(node.uuid);
            states.push(this._stateSchema.clone(node.state));
        }
        return out;
    }

    public parse (store:MuRDARegisterTypes<StateSchema>['store']) {
        if (store.states.length !== store.uuids.length) {
            throw new Error('invalid register store');
        }

        // clear out old state
        this.destroy();

        const ids = store.uuids;
        const states = store.states;
        let lastNode:MuRDARegisterTypes<StateSchema>['node']|null = null;
        for (let i = ids.length - 1; i >= 0; --i) {
            const id = ids[i];
            if (id in this.nodes) {
                throw new Error(`duplicate id ${id}`);
            }
            const node = new MuRDARegisterNode(id, this._stateSchema.clone(states[i]));
            this.nodes[id] = node;
            if (lastNode) {
                lastNode.next = node;
            }
            node.prev = lastNode;
            lastNode = node;
        }
        this.head = lastNode;
    }
}

export class MuRDARegister<StateSchema extends MuSchema<any>>
    implements MuRDA<
        MuRDARegisterTypes<StateSchema>['stateSchema'],
        MuRDARegisterTypes<StateSchema>['actionSchema'],
        MuRDARegisterTypes<StateSchema>['storeSchema']> {
    public readonly stateSchema:MuRDARegisterTypes<StateSchema>['stateSchema'];
    public readonly actionSchema:MuRDARegisterTypes<StateSchema>['actionSchema'];
    public readonly storeSchema:MuRDARegisterTypes<StateSchema>['storeSchema'];

    constructor (stateSchema:MuRDARegisterTypes<StateSchema>['stateSchema']) {
        this.stateSchema = stateSchema;
        this.actionSchema = new MuStruct({
            uuid: MuUUIDSchema,
            state: stateSchema,
        });
        this.storeSchema = new MuStruct({
            uuids: new MuArray(MuUUIDSchema, Infinity, []),
            states: new MuArray(stateSchema, Infinity, []),
        });
    }

    public store (initialState:MuRDARegisterTypes<StateSchema>['state']) {
        return new MuRDARegisterStore<StateSchema>(this.stateSchema, initialState);
    }

    public actions = {
        set: (nextValue:MuRDARegisterTypes<StateSchema>['state']) => {
            const result = this.actionSchema.alloc();
            result.uuid = createUUID();
            result.state = this.stateSchema.assign(result.state, nextValue);
            return result;
        },
    };
}