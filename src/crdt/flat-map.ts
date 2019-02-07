import { MuSchema } from '../schema/schema';
import { MuDictionary } from '../schema/dictionary';
import { MuUnion } from '../schema/union';
import { MuStruct } from '../schema/struct';
import { MuArray } from '../schema/array';
import { MuVoid } from '../schema';
import { MuUUID, MuUUIDSchema, createUUID } from './uuid';
import { MuCRDT, MuStore } from './crdt';

export interface MuFlatMapCRDTSpec<
    KeySchema extends MuSchema<string>,
    ValueSchema extends MuSchema<any>> {
    keySchema:KeySchema;
    valueSchema:ValueSchema;
}

export class MuFlatMapNode<Value> {
    public uuid:MuUUID;
    public remove = false;
    public value?:Value;
    public prev:MuFlatMapNode<Value>|null;
    public next:MuFlatMapNode<Value>|null;

    constructor (uuid:MuUUID, next:MuFlatMapNode<Value>|null, prev:MuFlatMapNode<Value>|null, remove:boolean, value?:Value) {
        this.uuid = uuid;
        this.remove = remove;
        this.value = value;
        this.next = next;
        this.prev = prev;
    }
}

export interface FlatMapTypes<Spec extends MuFlatMapCRDTSpec<any, any>> {
    keySchema:Spec['keySchema'];
    key:Spec['keySchema']['identity'];

    valueSchema:Spec['valueSchema'];
    value:Spec['valueSchema']['identity'];

    stateSchema:MuDictionary<FlatMapTypes<Spec>['valueSchema']>;
    state:FlatMapTypes<Spec>['stateSchema']['identity'];

    actionSchema:MuStruct<{
        uuid:typeof MuUUIDSchema;
        key:FlatMapTypes<Spec>['keySchema'];
        action:MuUnion<{
            set:FlatMapTypes<Spec>['valueSchema'];
            remove:MuVoid;
        }>;
    }>;
    action:FlatMapTypes<Spec>['actionSchema']['identity'];
    setAction:{
        uuid:MuUUID;
        key:FlatMapTypes<Spec>['key'];
        action:{
            type:'set';
            data:FlatMapTypes<Spec>['value'];
        };
    };
    removeAction:{
        uuid:MuUUID;
        key:FlatMapTypes<Spec>['key'];
        action:{
            type:'remove';
            data:MuVoid;
        };
    };

    elementActionSchema:MuUnion<{
        set:FlatMapTypes<Spec>['valueSchema'];
        remove:MuVoid;
    }>;
    elementStoreSchema:MuStruct<{
        key:FlatMapTypes<Spec>['keySchema'];
        uuids:MuArray<typeof MuUUIDSchema>;
        actions:MuArray<FlatMapTypes<Spec>['elementActionSchema']>;
    }>;
    storeSchema:MuArray<FlatMapTypes<Spec>['elementStoreSchema']>;
    store:FlatMapTypes<Spec>['storeSchema']['identity'];

    node:MuFlatMapNode<FlatMapTypes<Spec>['value']>;
}

export class MuFlatMapStore<Spec extends MuFlatMapCRDTSpec<any, any>>
    implements MuStore<FlatMapTypes<Spec>['stateSchema'], FlatMapTypes<Spec>['actionSchema'], FlatMapTypes<Spec>['storeSchema']> {

    public map:{ [key:string]:FlatMapTypes<Spec>['node'] } = {};
    public nodes:{ [uuid:string]:FlatMapTypes<Spec>['node'] } = {};

    private _valueSchema:FlatMapTypes<Spec>['valueSchema'];
    private _elementActionSchema:FlatMapTypes<Spec>['elementActionSchema'];
    private _elementStoreSchema:FlatMapTypes<Spec>['elementStoreSchema'];

    constructor(
        valueSchema:FlatMapTypes<Spec>['valueSchema'],
        elementActionSchema:FlatMapTypes<Spec>['elementActionSchema'],
        elementStoreSchema:FlatMapTypes<Spec>['elementStoreSchema'],
        initialState:FlatMapTypes<Spec>['state']) {
        this._valueSchema = valueSchema;
        this._elementActionSchema = elementActionSchema;
        this._elementStoreSchema = elementStoreSchema;
        const keys = Object.keys(initialState);
        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            const uuid = createUUID();
            const node = new MuFlatMapNode<FlatMapTypes<Spec>['value']>(uuid, null, null, false, valueSchema.clone(initialState[key]));
            this.map[key] = node;
            this.nodes[uuid] = node;
        }
    }

    public state (out:FlatMapTypes<Spec>['state']) : FlatMapTypes<Spec>['state'] {
        const ids = Object.keys(this.map);
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            const node = this.map[id];
            if (!node.remove) {
                out[id] = this._valueSchema.clone(node.value);
            }
        }
        return out;
    }

    public apply(action:FlatMapTypes<Spec>['action']) : boolean {
        const { key, uuid } = action;
        const node = this.nodes[uuid];
        if (node) {
            this.undo(action);
        }
        switch (action.action.type) {
            case 'set':
                this.map[key] = this.nodes[uuid] = new MuFlatMapNode(
                    uuid,
                    null,
                    this.map[key] || null,
                    false,
                    this._valueSchema.clone(action.action.data));
                return true;
            case 'remove':
                this.map[key] = this.nodes[uuid] = new MuFlatMapNode(
                    uuid,
                    null,
                    this.map[key] || null,
                    true);
                return true;
        }
        return false;
    }

    public undo(action:FlatMapTypes<Spec>['action']) : boolean {
        // remove node from list
        const { key, uuid } = action;
        const node = this.nodes[uuid];
        if (!node) {
            return false;
        }
        if (this.map[key] === node) {
            if (node.prev) {
                this.map[key] = node.prev;
            } else {
                delete this.map[key];
            }
        }
        if (node.prev) { node.prev.next = node.next; }
        if (node.next) { node.next.prev = node.prev; }
        node.prev = node.next = null;
        if (!node.remove) {
            this._valueSchema.free(node.value);
            node.remove = true;
            node.value = void 0;
        }
        delete this.nodes[uuid];
        return false;
    }

    public squash (state:FlatMapTypes<Spec>['state']) {
        this.destroy();
        const keys = Object.keys(state);
        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            const uuid = createUUID();
            const node = new MuFlatMapNode<FlatMapTypes<Spec>['value']>(uuid, null, null, false, this._valueSchema.clone(state[key]));
            this.map[key] = node;
            this.nodes[uuid] = node;
        }
    }

    public serialize (out:FlatMapTypes<Spec>['store']) : FlatMapTypes<Spec>['store'] {
        out.length = 0;
        const keys = Object.keys(this.map);
        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            const entry = this._elementStoreSchema.alloc();
            out.push(entry);
            entry.key = key;
            const uuids = entry.uuids;
            const actions = entry.actions;
            uuids.length = 0;
            actions.length = 0;
            for (let node:FlatMapTypes<Spec>['node']|null = this.map[key]; node; node = node.prev) {
                uuids.push(node.uuid);
                const action = this._elementActionSchema.alloc();
                actions.push(action);
                if (node.remove) {
                    action.type = 'remove';
                } else {
                    action.type = 'set';
                    action.data = this._valueSchema.clone(node.value);
                }
            }
        }
        return out;
    }

    public parse (data:FlatMapTypes<Spec>['store']) {
        this.destroy();

        for (let i = 0; i < data.length; ++i) {
            const entry = data[i];
            let lastNode:FlatMapTypes<Spec>['node']|null = null;
            for (let j = 0; j < entry.uuids.length; ++j) {
                const uuid = entry.uuids[j];
                const action = entry.actions[j];
                const node = new MuFlatMapNode(
                    uuid,
                    lastNode,
                    null,
                    action.type === 'remove',
                    action.data);
                this.nodes[uuid] = node;
                if (lastNode) { lastNode.prev = node; }
                lastNode = node;
            }
            if (entry.uuids.length > 0) {
                this.map[entry.key] = this.nodes[entry.uuids[0]];
            }
        }
    }

    public destroy() {
        const ids = Object.keys(this.nodes);
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            const node = this.nodes[id];
            if (!node.remove) {
                this._valueSchema.free(node.value);
            }
        }
        this.nodes = {};
        this.map = {};
    }
}

export class MuFlatMapCRDT<Spec extends MuFlatMapCRDTSpec<any, any>>
    implements MuCRDT<FlatMapTypes<Spec>['stateSchema'], FlatMapTypes<Spec>['actionSchema'], FlatMapTypes<Spec>['storeSchema']> {
    public readonly keySchema:FlatMapTypes<Spec>['keySchema'];
    public readonly valueSchema:FlatMapTypes<Spec>['valueSchema'];
    public readonly stateSchema:FlatMapTypes<Spec>['stateSchema'];
    public readonly actionSchema:FlatMapTypes<Spec>['actionSchema'];
    public readonly storeSchema:FlatMapTypes<Spec>['storeSchema'];
    public readonly elementActionSchema:FlatMapTypes<Spec>['elementActionSchema'];
    public readonly elementStoreSchema:FlatMapTypes<Spec>['elementStoreSchema'];

    constructor (spec:Spec) {
        this.keySchema = spec.keySchema;
        this.valueSchema = spec.valueSchema;
        this.stateSchema = new MuDictionary(spec.valueSchema, Infinity, {});
        this.elementActionSchema = new MuUnion({
            set:spec.valueSchema,
            remove:new MuVoid(),
        });
        this.actionSchema = new MuStruct({
            uuid: MuUUIDSchema,
            key: spec.keySchema,
            action: this.elementActionSchema,
        });
        this.elementStoreSchema = new MuStruct({
            key:spec.keySchema,
            uuids:new MuArray(MuUUIDSchema, Infinity, []),
            actions:new MuArray(this.elementActionSchema, Infinity, []),
        });
        this.storeSchema = new MuArray(this.elementStoreSchema, Infinity, []);
    }

    public store (intialState:FlatMapTypes<Spec>['state']) : MuFlatMapStore<Spec> {
        return new MuFlatMapStore(
            this.valueSchema,
            this.elementActionSchema,
            this.elementStoreSchema,
            intialState);
    }

    public actions = {
        set: (key:FlatMapTypes<Spec>['key'], value:FlatMapTypes<Spec>['value']) : FlatMapTypes<Spec>['setAction'] => {
            const result = <FlatMapTypes<Spec>['setAction']>this.actionSchema.alloc();
            result.uuid = createUUID();
            result.key = this.keySchema.assign(result.key, key);
            result.action.type = 'set';
            result.action.data = this.valueSchema.clone(value);
            return result;
        },
        remove: (key:FlatMapTypes<Spec>['key']) : FlatMapTypes<Spec>['removeAction'] => {
            const result = <FlatMapTypes<Spec>['removeAction']>this.actionSchema.alloc();
            result.uuid = createUUID();
            result.key = this.keySchema.assign(result.key, key);
            result.action.type = 'remove';
            return result;
        },
    };
}