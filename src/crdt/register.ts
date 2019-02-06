import { MuStruct } from '../schema/struct';
import { MuSchema } from '../schema/schema';
import { MuUUIDSchema, createUUID, MuUUID } from './uuid';
import { MuCRDT, MuStore } from './crdt';
import { MuArray } from '../schema';

export class MuRegisterNode<State> {
    public uuid:MuUUID;
    public state:State;
    public next:MuRegisterNode<State>|null = null;
    public prev:MuRegisterNode<State>|null = null;

    constructor (id:MuUUID, state:State) {
        this.uuid = id;
        this.state = state;
    }
}

export interface RegisterTypes<StateSchema extends MuSchema<any>> {
    stateSchema:StateSchema;
    state:StateSchema['identity'];

    actionSchema:MuStruct<{
        uuid:typeof MuUUIDSchema;
        state:StateSchema;
    }>;
    action:RegisterTypes<StateSchema>['actionSchema']['identity'];

    storeSchema:MuStruct<{
        uuids:MuArray<typeof MuUUIDSchema>;
        states:MuArray<StateSchema>;
    }>;
    store:RegisterTypes<StateSchema>['storeSchema']['identity'];

    node:MuRegisterNode<RegisterTypes<StateSchema>['state']>;
}

export class MuRegisterStore<StateSchema extends MuSchema<any>>
    implements MuStore<
        RegisterTypes<StateSchema>['stateSchema'],
        RegisterTypes<StateSchema>['actionSchema'],
        RegisterTypes<StateSchema>['storeSchema']> {
    private _stateSchema:StateSchema;
    public head:RegisterTypes<StateSchema>['node']|null;
    public nodes:{ [uuid:string]:RegisterTypes<StateSchema>['node'] } = {};

    constructor (
        stateSchema:StateSchema,
        initial:StateSchema['identity']) {
        this._stateSchema = stateSchema;
        this.head = new MuRegisterNode('', this._stateSchema.clone(initial));
        this.nodes[''] = this.head;
    }

    public state (out:StateSchema['identity']) {
        if (this.head) {
            return this._stateSchema.assign(out, this.head.state);
        } else {
            return this._stateSchema.assign(out, this._stateSchema.identity);
        }
    }

    public apply (action:RegisterTypes<StateSchema>['action']) {
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
            const head = new MuRegisterNode(action.uuid, this._stateSchema.clone(action.state));
            head.prev = this.head;
            if (this.head) {
                this.head.next = head;
            }
            this.head = head;
            this.nodes[action.uuid] = head;
        }
        return true;
    }

    public undo (action:RegisterTypes<StateSchema>['action']) {
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

    public squash (state:StateSchema['identity']) {
        const uuids = Object.keys(this.nodes);
        for (let i = 0; i < uuids.length; ++i) {
            const node = this.nodes[uuids[i]];
            node.next = node.prev = null;
            this._stateSchema.free(node.state);
        }
        this.head = new MuRegisterNode('', this._stateSchema.clone(state));
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

    public serialize (out:RegisterTypes<StateSchema>['store']) : RegisterTypes<StateSchema>['store'] {
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

    public parse (store:RegisterTypes<StateSchema>['store']) {
        if (store.states.length !== store.uuids.length) {
            throw new Error('invalid register store');
        }

        // clear out old state
        this.destroy();

        const ids = store.uuids;
        const states = store.states;
        let lastNode:RegisterTypes<StateSchema>['node']|null = null;
        for (let i = ids.length - 1; i >= 0; --i) {
            const id = ids[i];
            if (id in this.nodes) {
                throw new Error(`duplicate id ${id}`);
            }
            const node = new MuRegisterNode(id, this._stateSchema.clone(states[i]));
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

export class MuRegisterCRDT<StateSchema extends MuSchema<any>>
    implements MuCRDT<
        RegisterTypes<StateSchema>['stateSchema'],
        RegisterTypes<StateSchema>['actionSchema'],
        RegisterTypes<StateSchema>['storeSchema']> {
    public readonly stateSchema:RegisterTypes<StateSchema>['stateSchema'];
    public readonly actionSchema:RegisterTypes<StateSchema>['actionSchema'];
    public readonly storeSchema:RegisterTypes<StateSchema>['storeSchema'];

    constructor (stateSchema:RegisterTypes<StateSchema>['stateSchema']) {
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

    public store (initialState:StateSchema['identity']) {
        return new MuRegisterStore<StateSchema>(this.stateSchema, initialState);
    }

    public actions = {
        set: (nextValue:StateSchema['identity']) => {
            const result = this.actionSchema.alloc();
            result.uuid = createUUID();
            result.state = this.stateSchema.assign(result.state, nextValue);
            return result;
        },
    };
}