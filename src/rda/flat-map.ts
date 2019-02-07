import { MuSchema } from '../schema/schema';
import { MuDictionary } from '../schema/dictionary';
import { MuUnion } from '../schema/union';
import { MuStruct } from '../schema/struct';
import { MuArray } from '../schema/array';
import { MuVoid } from '../schema/void';
import { MuUUID, MuUUIDSchema, createUUID } from './uuid';
import { MuRDA, MuRDAStore } from './rda';

export interface MuRDAFlatMapSpec<
    KeySchema extends MuSchema<string>,
    ValueSchema extends MuSchema<any>> {
    keySchema:KeySchema;
    valueSchema:ValueSchema;
}

export class MuRDAFlatMapNode<Value> {
    public uuid:MuUUID;
    public remove = false;
    public value?:Value;
    public prev:MuRDAFlatMapNode<Value>|null;
    public next:MuRDAFlatMapNode<Value>|null;

    constructor (uuid:MuUUID, next:MuRDAFlatMapNode<Value>|null, prev:MuRDAFlatMapNode<Value>|null, remove:boolean, value?:Value) {
        this.uuid = uuid;
        this.remove = remove;
        this.value = value;
        this.next = next;
        this.prev = prev;
    }
}

export interface MuRDAFlatMapTypes<Spec extends MuRDAFlatMapSpec<any, any>> {
    keySchema:Spec['keySchema'];
    key:Spec['keySchema']['identity'];

    valueSchema:Spec['valueSchema'];
    value:Spec['valueSchema']['identity'];

    stateSchema:MuDictionary<MuRDAFlatMapTypes<Spec>['valueSchema']>;
    state:MuRDAFlatMapTypes<Spec>['stateSchema']['identity'];

    actionSchema:MuStruct<{
        uuid:typeof MuUUIDSchema;
        key:MuRDAFlatMapTypes<Spec>['keySchema'];
        action:MuUnion<{
            set:MuRDAFlatMapTypes<Spec>['valueSchema'];
            remove:MuVoid;
        }>;
    }>;
    action:MuRDAFlatMapTypes<Spec>['actionSchema']['identity'];
    setAction:{
        uuid:MuUUID;
        key:MuRDAFlatMapTypes<Spec>['key'];
        action:{
            type:'set';
            data:MuRDAFlatMapTypes<Spec>['value'];
        };
    };
    removeAction:{
        uuid:MuUUID;
        key:MuRDAFlatMapTypes<Spec>['key'];
        action:{
            type:'remove';
            data:MuVoid;
        };
    };

    elementActionSchema:MuUnion<{
        set:MuRDAFlatMapTypes<Spec>['valueSchema'];
        remove:MuVoid;
    }>;
    elementStoreSchema:MuStruct<{
        key:MuRDAFlatMapTypes<Spec>['keySchema'];
        uuids:MuArray<typeof MuUUIDSchema>;
        actions:MuArray<MuRDAFlatMapTypes<Spec>['elementActionSchema']>;
    }>;
    storeSchema:MuArray<MuRDAFlatMapTypes<Spec>['elementStoreSchema']>;
    store:MuRDAFlatMapTypes<Spec>['storeSchema']['identity'];

    node:MuRDAFlatMapNode<MuRDAFlatMapTypes<Spec>['value']>;
}

export class MuRDAFlatMapStore<Spec extends MuRDAFlatMapSpec<any, any>>
    implements MuRDAStore<MuRDAFlatMapTypes<Spec>['stateSchema'], MuRDAFlatMapTypes<Spec>['actionSchema'], MuRDAFlatMapTypes<Spec>['storeSchema']> {

    public map:{ [key:string]:MuRDAFlatMapTypes<Spec>['node'] } = {};
    public nodes:{ [uuid:string]:MuRDAFlatMapTypes<Spec>['node'] } = {};

    private _valueSchema:MuRDAFlatMapTypes<Spec>['valueSchema'];
    private _elementActionSchema:MuRDAFlatMapTypes<Spec>['elementActionSchema'];
    private _elementStoreSchema:MuRDAFlatMapTypes<Spec>['elementStoreSchema'];
    private _stateSchema:MuRDAFlatMapTypes<Spec>['stateSchema'];

    constructor(
        valueSchema:MuRDAFlatMapTypes<Spec>['valueSchema'],
        elementActionSchema:MuRDAFlatMapTypes<Spec>['elementActionSchema'],
        elementStoreSchema:MuRDAFlatMapTypes<Spec>['elementStoreSchema'],
        stateSchema:MuRDAFlatMapTypes<Spec>['stateSchema'],
        initialState:MuRDAFlatMapTypes<Spec>['state']) {
        this._valueSchema = valueSchema;
        this._elementActionSchema = elementActionSchema;
        this._elementStoreSchema = elementStoreSchema;
        this._stateSchema = stateSchema;
        const keys = Object.keys(initialState);
        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            const uuid = createUUID();
            const node = new MuRDAFlatMapNode<MuRDAFlatMapTypes<Spec>['value']>(uuid, null, null, false, valueSchema.clone(initialState[key]));
            this.map[key] = node;
            this.nodes[uuid] = node;
        }
    }

    public state (out:MuRDAFlatMapTypes<Spec>['state']) : MuRDAFlatMapTypes<Spec>['state'] {
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

    public apply(action:MuRDAFlatMapTypes<Spec>['action']) : boolean {
        const { key, uuid } = action;
        const node = this.nodes[uuid];
        if (node) {
            this.undo(action);
        }
        switch (action.action.type) {
            case 'set':
                this.map[key] = this.nodes[uuid] = new MuRDAFlatMapNode(
                    uuid,
                    null,
                    this.map[key] || null,
                    false,
                    this._valueSchema.clone(action.action.data));
                return true;
            case 'remove':
                this.map[key] = this.nodes[uuid] = new MuRDAFlatMapNode(
                    uuid,
                    null,
                    this.map[key] || null,
                    true);
                return true;
        }
        return false;
    }

    public undo(action:MuRDAFlatMapTypes<Spec>['action']) : boolean {
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

    public squash (state:MuRDAFlatMapTypes<Spec>['state']) {
        this.destroy();
        const keys = Object.keys(state);
        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            const uuid = createUUID();
            const node = new MuRDAFlatMapNode<MuRDAFlatMapTypes<Spec>['value']>(uuid, null, null, false, this._valueSchema.clone(state[key]));
            this.map[key] = node;
            this.nodes[uuid] = node;
        }
    }

    public serialize (out:MuRDAFlatMapTypes<Spec>['store']) : MuRDAFlatMapTypes<Spec>['store'] {
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
            for (let node:MuRDAFlatMapTypes<Spec>['node']|null = this.map[key]; node; node = node.prev) {
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

    public parse (data:MuRDAFlatMapTypes<Spec>['store']) {
        this.destroy();

        for (let i = 0; i < data.length; ++i) {
            const entry = data[i];
            let lastNode:MuRDAFlatMapTypes<Spec>['node']|null = null;
            for (let j = 0; j < entry.uuids.length; ++j) {
                const uuid = entry.uuids[j];
                const action = entry.actions[j];
                const node = new MuRDAFlatMapNode(
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

export class MuRDAFlatMap<Spec extends MuRDAFlatMapSpec<any, any>>
    implements MuRDA<MuRDAFlatMapTypes<Spec>['stateSchema'], MuRDAFlatMapTypes<Spec>['actionSchema'], MuRDAFlatMapTypes<Spec>['storeSchema']> {
    public readonly keySchema:MuRDAFlatMapTypes<Spec>['keySchema'];
    public readonly valueSchema:MuRDAFlatMapTypes<Spec>['valueSchema'];
    public readonly stateSchema:MuRDAFlatMapTypes<Spec>['stateSchema'];
    public readonly actionSchema:MuRDAFlatMapTypes<Spec>['actionSchema'];
    public readonly storeSchema:MuRDAFlatMapTypes<Spec>['storeSchema'];
    public readonly elementActionSchema:MuRDAFlatMapTypes<Spec>['elementActionSchema'];
    public readonly elementStoreSchema:MuRDAFlatMapTypes<Spec>['elementStoreSchema'];

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

    public store (intialState:MuRDAFlatMapTypes<Spec>['state']) : MuRDAFlatMapStore<Spec> {
        return new MuRDAFlatMapStore(
            this.valueSchema,
            this.elementActionSchema,
            this.elementStoreSchema,
            this.stateSchema,
            intialState);
    }

    public actions = {
        set: (key:MuRDAFlatMapTypes<Spec>['key'], value:MuRDAFlatMapTypes<Spec>['value']) : MuRDAFlatMapTypes<Spec>['setAction'] => {
            const result = <MuRDAFlatMapTypes<Spec>['setAction']>this.actionSchema.alloc();
            result.uuid = createUUID();
            result.key = this.keySchema.assign(result.key, key);
            result.action.type = 'set';
            result.action.data = this.valueSchema.clone(value);
            return result;
        },
        remove: (key:MuRDAFlatMapTypes<Spec>['key']) : MuRDAFlatMapTypes<Spec>['removeAction'] => {
            const result = <MuRDAFlatMapTypes<Spec>['removeAction']>this.actionSchema.alloc();
            result.uuid = createUUID();
            result.key = this.keySchema.assign(result.key, key);
            result.action.type = 'remove';
            return result;
        },
    };
}