import { MuSchema } from '../schema/schema';
import { MuDictionary } from '../schema/dictionary';
import { MuStruct } from '../schema/struct';
import { MuUnion } from '../schema/union';
import { MuSortedArray } from '../schema/sorted-array';
import { MuVoid } from '../schema/void';
import { MuRDA, MuRDAActionMeta, MuRDABindableActionMeta, MuRDAStore, MuRDATypes } from './rda';
import { MuVarint } from '../schema/varint';
import { MuBoolean } from '../schema/boolean';

type StripBindMeta<Meta extends MuRDABindableActionMeta> =
    Meta extends { type:'store'; action:MuRDAActionMeta; }
        ? Meta['action']
    : Meta extends MuRDAActionMeta
        ? Meta
        : never;

export interface MuRDAMapTypes<
    KeySchema extends MuSchema<string>,
    ValueRDA extends MuRDA<any, any, any, any>> {
    value:ValueRDA['stateSchema']['identity'];

    stateSchema:MuDictionary<ValueRDA['stateSchema']>;
    state:MuRDAMapTypes<KeySchema, ValueRDA>['stateSchema']['identity'];

    storeElementSchema:MuStruct<{
        id:MuVarint;
        sequence:MuVarint;
        deleted:MuBoolean;
        key:KeySchema;
        value:ValueRDA['storeSchema'];
    }>;
    storeSchema:MuSortedArray<MuRDAMapTypes<KeySchema, ValueRDA>['storeElementSchema']>;
    store:MuRDAMapTypes<KeySchema, ValueRDA>['storeSchema']['identity'];

    upsertActionSchema:MuRDAMapTypes<KeySchema, ValueRDA>['storeSchema'];
    updateActionSchema:MuStruct<{
        id:MuVarint;
        action:ValueRDA['actionSchema'];
    }>;
    moveActionSchema:MuStruct<{
        id:MuVarint;
        sequence:MuVarint;
        key:KeySchema;
    }>;
    setDeletedActionSchema:MuStruct<{
        id:MuVarint;
        deleted:MuBoolean;
    }>;

    actionSchema:MuUnion<{
        upsert:MuRDAMapTypes<KeySchema, ValueRDA>['upsertActionSchema'];
        update:MuRDAMapTypes<KeySchema, ValueRDA>['updateActionSchema'];
        move:MuRDAMapTypes<KeySchema, ValueRDA>['moveActionSchema'];
        setDeleted:MuRDAMapTypes<KeySchema, ValueRDA>['setDeletedActionSchema'];
        noop:MuVoid;
    }>;
    action:MuRDAMapTypes<KeySchema, ValueRDA>['actionSchema']['identity'];
    upsertAction:{
        type:'upsert';
        data:MuRDAMapTypes<KeySchema, ValueRDA>['upsertActionSchema']['identity'];
    };
    updateAction:{
        type:'update';
        data:MuRDAMapTypes<KeySchema, ValueRDA>['updateActionSchema']['identity'];
    };
    moveAction:{
        type:'move';
        data:MuRDAMapTypes<KeySchema, ValueRDA>['moveActionSchema']['identity'];
    };
    setDeletedAction:{
        type:'setDeleted';
        data:MuRDAMapTypes<KeySchema, ValueRDA>['setDeletedActionSchema']['identity'];
    };
    noopAction:{
        type:'noop';
        data:undefined;
    };
    actionMeta:{
        type:'store';
        action:{
            type:'table';
            table:{
                set:{
                    type:'unit';
                };
                remove:{
                    type:'unit';
                };
                clear:{
                    type:'unit';
                };
                reset:{
                    type:'unit';
                };
                move:{
                    type:'unit';
                };
                update:{
                    type:'partial';
                    action:StripBindMeta<ValueRDA['actionMeta']>;
                };
            };
        };
    };
}

function compareKey (a:string, b:string) {
    return a < b ? -1 : (b < a ? 1 : 0);
}

export class MuRDAMapStoreElement<MapRDA extends MuRDAMap<any, any>> {
    constructor (
        public id:number,
        public sequence:number,
        public deleted:boolean,
        public key:MapRDA['keySchema']['identity'],
        public value:MuRDATypes<MapRDA['valueRDA']>['store'],
    ) {}
}

function compareStoreElements<T extends MuRDAMapStoreElement<any>> (a:T, b:T) {
    return (
        a.sequence - b.sequence ||
        a.id - b.id
    );
}

export class MuRDAMapStore<MapRDA extends MuRDAMap<any, any>> implements MuRDAStore<MapRDA> {
    public keyIndex:{ [key:string]:MuRDAMapStoreElement<MapRDA>[]; } = {};
    public idIndex:{ [id:string]:MuRDAMapStoreElement<MapRDA>; } = {};

    constructor (elements:MuRDAMapStoreElement<MapRDA>[]) {
        const { keyIndex, idIndex } = this;
        for (let i = 0; i < elements.length; ++i) {
            const element = elements[i];
            const { id, key } = element;
            if (id in idIndex) {
                continue;
            }
            idIndex[id] = element;
            this._insertElement(element);
        }
    }

    public state(rda:MapRDA, out:MuRDATypes<MapRDA>['state']) : MuRDATypes<MapRDA>['state'] {
        const keyIndex = this.keyIndex;
        const outKeys = Object.keys(out);
        for (let i = 0; i < outKeys.length; ++i) {
            const key = outKeys[i];
            if (!(key in keyIndex)) {
                rda.valueRDA.stateSchema.free(out[key]);
                delete out[key];
            }
        }
        const keys = Object.keys(keyIndex);
        const valueRDA = rda.valueRDA;
        const valueSchema = valueRDA.stateSchema;
        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            const row = keyIndex[key];
            row.sort(compareStoreElements);
            const final = row[row.length - 1];
            if (!final.deleted) {
                (<any>out)[key] = final.value.state(valueRDA, out[key] || valueSchema.alloc());
            }
        }
        return out;
    }

    private _moveElement (element:MuRDAMapStoreElement<MapRDA>, key:string) {
        if (key === element.key) {
            return;
        }

        // remove from old bucket
        const prevBucket = this.keyIndex[element.key];
        prevBucket.splice(prevBucket.indexOf(element), 1);
        if (prevBucket.length === 0) {
            delete this.keyIndex[element.key];
        }

        // insert into new bucket
        this._insertElement(element);
    }

    private _insertElement (element:MuRDAMapStoreElement<MapRDA>) {
        const key = element.key;
        const bucket = this.keyIndex[key];
        if (bucket) {
            bucket.push(element);
        } else {
            this.keyIndex[key] = [ element ];
        }
    }

    public apply(rda:MapRDA, action:MuRDATypes<MapRDA>['action']) : boolean {
        const { type, data } = action;
        const idIndex = this.idIndex;
        if (type === 'upsert') {
            const upsertAction = <MapRDA['upsertActionSchema']['identity']>data;
            for (let i = 0; i < upsertAction.length; ++i) {
                const upsert = upsertAction[i];
                const prev = idIndex[upsert.id];
                if (prev) {
                    prev.id = upsert.id;
                    prev.deleted = upsert.deleted;
                    prev.sequence = upsert.sequence;
                    this._moveElement(prev, upsert.key);
                    prev.value.free(rda.valueRDA);
                    prev.value = rda.valueRDA.parse(upsert.value);
                } else {
                    const element = new MuRDAMapStoreElement<MapRDA>(
                        upsert.id,
                        upsert.sequence,
                        upsert.deleted,
                        upsert.key,
                        rda.valueRDA.parse(upsert.value));
                    this.idIndex[element.id] = element;
                    this._insertElement(element);
                }
            }
            return true;
        } else if (type === 'update') {
            const updateAction = <MapRDA['updateActionSchema']['identity']>data;
            const element = this.idIndex[updateAction.id];
            if (!element) {
                return false;
            }
            element.value.apply(rda.valueRDA, updateAction.action);
            return true;
        } else if (type === 'move') {
            const moveAction = <MapRDA['moveActionSchema']['identity']>data;
            const element = this.idIndex[moveAction.id];
            if (!element) {
                return false;
            }
            element.sequence = moveAction.sequence;
            this._moveElement(element, moveAction.key);
            return true;
        } else if (type === 'setDeleted') {
            const setDeletedAction = <MapRDA['setDeletedActionSchema']['identity']>data;
            const element = this.idIndex[setDeletedAction.id];
            if (!element) {
                return false;
            }
            element.deleted = setDeletedAction.deleted;
            return true;
        } else if (type === 'noop') {
            return true;
        }
        return false;
    }

    public inverse(rda:MapRDA, action:MuRDATypes<MapRDA>['action']) {
        const { type, data } = action;
        const idIndex = this.idIndex;
        const result = rda.actionSchema.alloc();
        result.type = 'noop';
        result.data = undefined;
        if (type === 'upsert') {
            result.type = 'upsert';
            const inverseUpsert = result.data = rda.upsertActionSchema.alloc();
            const upsertAction = <MapRDA['upsertActionSchema']['identity']>data;
            inverseUpsert.length = 0;
            for (let i = 0; i < upsertAction.length; ++i) {
                const id = upsertAction[i].id;
                const prev = idIndex[id];
                const inv = rda.storeElementSchema.alloc();
                if (prev) {
                    inv.key = prev.key;
                    inv.deleted = prev.deleted;
                    inv.sequence = prev.sequence;
                    inv.value = prev.value.serialize(rda.valueRDA, inv.value);
                } else {
                    rda.storeElementSchema.assign(inv, rda.storeElementSchema.identity);
                }
                inv.id = id;
                inverseUpsert.push(inv);
            }
            inverseUpsert.sort(rda.upsertActionSchema.compare);
        } else if (type === 'update') {
            const updateAction = <MapRDA['updateActionSchema']['identity']>data;
            const id = updateAction.id;
            const prev = idIndex[id];
            if (prev) {
                result.type = 'update';
                const inverseUpdate = result.data = rda.updateActionSchema.alloc();
                inverseUpdate.id = id;
                inverseUpdate.action = prev.value.inverse(rda.valueRDA, updateAction.action);
            }
        } else if (type === 'move') {
            result.type = 'move';
            const inverseMove = result.data = rda.moveActionSchema.alloc();
            const moveAction = <MapRDA['moveActionSchema']['identity']>data;
            const id = moveAction.id;
            const prev = idIndex[id];
            inverseMove.id = id;
            if (prev) {
                inverseMove.key = prev.key;
                inverseMove.sequence = prev.sequence;
            } else {
                inverseMove.key = '';
                inverseMove.sequence = 0;
            }
        } else if (type === 'setDeleted') {
            result.type = 'setDeleted';
            const inverseDelete = result.data = rda.setDeletedActionSchema.alloc();
            const setDeletedAction = <MapRDA['setDeletedActionSchema']['identity']>data;
            const id = setDeletedAction.id;
            const prev = idIndex[id];
            inverseDelete.id = id;
            if (prev) {
                inverseDelete.deleted = prev.deleted;
            } else {
                inverseDelete.deleted = true;
            }
        }
        return <any>result;
    }

    public serialize (rda:MapRDA, result:MuRDATypes<MapRDA>['serializedStore']) : MuRDATypes<MapRDA>['serializedStore'] {
        const idIndex = this.idIndex;
        const ids = Object.keys(idIndex);
        while (result.length > ids.length) {
            const element = result.pop();
            if (element) {
                rda.storeElementSchema.free(element);
            }
        }
        while (result.length < ids.length) {
            result.push(rda.storeElementSchema.alloc());
        }

        for (let i = 0; i < ids.length; ++i) {
            const element = idIndex[ids[i]];
            const store = result[i];

            store.id = element.id;
            store.key = element.key;
            store.sequence = element.sequence;
            store.deleted = element.deleted;
            store.value = element.value.serialize(rda.valueRDA, store.value);
        }

        return result;
    }

    public free (rda:MapRDA) {
        const idIndex = this.idIndex;
        const ids = Object.keys(idIndex);
        const valueRDA = rda.valueRDA;
        for (let i = 0; i < ids.length; ++i) {
            const element = idIndex[ids[i]];
            element.value.free(valueRDA);
        }
        this.idIndex = {};
        this.keyIndex = {};
    }

    public getKey (key:string) {
        const bucket = this.keyIndex[key];
        if (!bucket) {
            return null;
        }
        let result = bucket[0];
        for (let i = 0; i < bucket.length; ++i) {
            if (result.sequence < bucket[i].sequence) {
                result = bucket[i];
            }
        }
        return result;
    }
}

type WrapAction<Key, Meta, Dispatch> =
    Meta extends { type:'unit' }
        ? Dispatch extends (...args:infer ArgType) => infer RetType
            ?  (...args:ArgType) => {
                    type:'noop';
                    data:MuVoid['identity'];
                } | {
                    type:'update';
                    data:{
                        id:number;
                        action:RetType;
                    };
                }
            : never
    : Meta extends { action:MuRDAActionMeta }
        ? Dispatch extends (...args:infer ArgType) => infer RetType
            ? (...args:ArgType) => WrapAction<Key, Meta['action'], RetType>
            : never
    : Meta extends { table:{ [id in keyof Dispatch]:MuRDAActionMeta } }
        ? Dispatch extends { [id in keyof Meta['table']]:any }
            ? { [id in keyof Meta['table']]:WrapAction<Key, Meta['table'][id], Dispatch[id]>; }
            : never
    : never;

type StripBindAndWrap<Key, ValueRDA extends MuRDA<any, any, any, any>> =
    ValueRDA['actionMeta'] extends { type:'store'; action:MuRDAActionMeta; }
        ? ValueRDA['action'] extends (store) => infer RetAction
            ? WrapAction<Key, ValueRDA['actionMeta']['action'], RetAction>
            : never
    : WrapAction<Key, ValueRDA['actionMeta'], ValueRDA['action']>;

export class MuRDAMap<
    KeySchema extends MuSchema<any>,
    ValueRDA extends MuRDA<any, any, any, any>>
    implements MuRDA<
        MuRDAMapTypes<KeySchema, ValueRDA>['stateSchema'],
        MuRDAMapTypes<KeySchema, ValueRDA>['actionSchema'],
        MuRDAMapTypes<KeySchema, ValueRDA>['storeSchema'],
        MuRDAMapTypes<KeySchema, ValueRDA>['actionMeta']> {
    public readonly keySchema:KeySchema;
    public readonly valueRDA:ValueRDA;

    public readonly upsertActionSchema:MuRDAMapTypes<KeySchema, ValueRDA>['upsertActionSchema'];
    public readonly updateActionSchema:MuRDAMapTypes<KeySchema, ValueRDA>['updateActionSchema'];
    public readonly moveActionSchema:MuRDAMapTypes<KeySchema, ValueRDA>['moveActionSchema'];
    public readonly setDeletedActionSchema:MuRDAMapTypes<KeySchema, ValueRDA>['setDeletedActionSchema'];

    public readonly stateSchema:MuRDAMapTypes<KeySchema, ValueRDA>['stateSchema'];
    public readonly actionSchema:MuRDAMapTypes<KeySchema, ValueRDA>['actionSchema'];
    public readonly storeElementSchema:MuRDAMapTypes<KeySchema, ValueRDA>['storeElementSchema'];
    public readonly storeSchema:MuRDAMapTypes<KeySchema, ValueRDA>['storeSchema'];

    public readonly actionMeta:MuRDAMapTypes<KeySchema, ValueRDA>['actionMeta'];

    public readonly emptyStore:MuRDAMapStore<this>;

    private _savedStore:MuRDAMapStore<this> = <any>null;
    private _savedElement:MuRDATypes<ValueRDA>['store'] = <any>null;
    private _savedAction:MuRDAMapTypes<KeySchema, ValueRDA>['action'] = <any>null;
    private _savedUpdate:MuRDAMapTypes<KeySchema, ValueRDA>['updateActionSchema']['identity'] = <any>null;
    private _updateDispatcher:any = null;
    private _noopDispatcher:any = null;

    private _actionDispatchers:any = {
        set: (key:KeySchema['identity'], state:ValueRDA['stateSchema']['identity']) => {
            const result = this.actionSchema.alloc();
            result.type = 'upsert';
            const upsertAction = result.data = this.upsertActionSchema.alloc();
            const storeAction = this.storeElementSchema.alloc();
            upsertAction.push(storeAction);
            const prev = this._savedStore.getKey(key);
            storeAction.key = key;
            storeAction.deleted = false;
            const tmp = this.valueRDA.createStore(state);
            storeAction.value = tmp.serialize(this.valueRDA, storeAction.value);
            tmp.free(this.valueRDA);
            if (prev) {
                storeAction.id = prev.id;
                storeAction.sequence = prev.sequence;
            } else {
                storeAction.id = this.uuid();
                storeAction.sequence = 1;
            }
            return result;
        },
        remove: (key:KeySchema['identity']) => {
            const result = this.actionSchema.alloc();
            const prev = this._savedStore.getKey(key);
            if (prev && !prev.deleted) {
                result.type = 'setDeleted';
                const action = result.data = this.setDeletedActionSchema.alloc();
                action.id = prev.id;
                action.deleted = true;
            } else {
                result.type = 'noop';
                result.data = undefined;
            }
            return result;
        },
        move: (from:KeySchema['identity'], to:KeySchema['identity']) => {
            const result = this.actionSchema.alloc();
            const prev = this._savedStore.getKey(from);
            if (prev && !prev.deleted) {
                result.type = 'move';
                const moveAction = result.data = this.moveActionSchema.alloc();
                moveAction.id = prev.id;
                moveAction.key = prev.key;
                const target = this._savedStore.getKey(to);
                if (target) {
                    moveAction.sequence = target.sequence + 1;
                } else {
                    moveAction.sequence = 1;
                }
            } else {
                result.type = 'noop';
                result.data = undefined;
            }
            return result;
        },
        clear: () => {
            const result = this.actionSchema.alloc();
            result.type = 'upsert';
            const upserts = result.data = this.upsertActionSchema.alloc();
            const keys = Object.keys(this._savedStore.keyIndex);
            for (let i = 0; i < keys.length; ++i) {
                const prev = this._savedStore.getKey(keys[i]);
                if (!prev || prev.deleted) {
                    continue;
                }
                const element = this.storeElementSchema.alloc();
                element.id = prev.id;
                element.deleted = true;
                element.sequence = prev.sequence;
                element.key = prev.key;
                element.value = prev.value.serialize(this.valueRDA, element.value);
                upserts.push(element);
            }
            upserts.sort(this.upsertActionSchema.compare);
            return result;
        },
        reset: (state:MuRDAMapTypes<KeySchema, ValueRDA>['state']) => {
            const result = this.actionSchema.alloc();
            result.type = 'upsert';
            const upsertAction = result.data = this.upsertActionSchema.alloc();
            const keys = Object.keys(state);
            for (let i = 0; i < keys.length; ++i) {
                const key = keys[i];
                const prev = this._savedStore.getKey(key);
                const upsert = this.storeElementSchema.alloc();
                upsertAction.push(upsert);
                upsert.key = key;
                const tmp = this.valueRDA.createStore(state[key]);
                upsert.value = tmp.serialize(this.valueRDA, upsert.value);
                tmp.free(this.valueRDA);
                upsert.deleted = false;
                if (prev) {
                    upsert.id = prev.id;
                    upsert.sequence = prev.sequence;
                } else {
                    upsert.id = this.uuid();
                    upsert.sequence = 1;
                }
            }
            const prevKeys = Object.keys(this._savedStore.keyIndex);
            for (let i = 0; i < prevKeys.length; ++i) {
                const key = prevKeys[i];
                if (key in state) {
                    continue;
                }
                const prev = this._savedStore.getKey(key);
                if (!prev || prev.deleted) {
                    continue;
                }
                const upsert = this.storeElementSchema.alloc();
                upsertAction.push(upsert);
                upsert.id = prev.id;
                upsert.sequence = prev.sequence;
                upsert.key = key;
                upsert.value = prev.value.serialize(this.valueRDA, upsert.value);
                upsert.deleted = true;
                upsertAction.push(upsert);
            }
            upsertAction.sort(this.upsertActionSchema.compare);
            return result;
        },
        update: (key:KeySchema['identity']) => {
            const prev = this._savedStore.getKey(key);
            this._savedAction = this.actionSchema.alloc();
            if (prev) {
                this._savedElement = prev.value;
                this._savedAction.type = 'update';
                this._savedUpdate = this._savedAction.data = this.updateActionSchema.alloc();
                this._savedUpdate.id = prev.id;
                this.valueRDA.actionSchema.free(this._savedUpdate.action);
                return this._updateDispatcher;
            } else {
                this._savedAction.type = 'noop';
                this._savedAction.data = undefined;
                return this._noopDispatcher;
            }
        },
    };

    public readonly action:(store:MuRDAMapStore<this>) => {
        set:(key:KeySchema['identity'], value:ValueRDA['stateSchema']['identity']) => MuRDAMapTypes<KeySchema, ValueRDA>['upsertAction'];
        remove:(key:KeySchema['identity']) => MuRDAMapTypes<KeySchema, ValueRDA>['setDeletedAction'];
        update:(key:KeySchema['identity']) => StripBindAndWrap<KeySchema['identity'], ValueRDA>;
        move:(key:KeySchema['identity'], rename:KeySchema['identity']) => MuRDAMapTypes<KeySchema, ValueRDA>['moveAction']
        clear:() => MuRDAMapTypes<KeySchema, ValueRDA>['upsertAction'];
        reset:(state:MuRDAMapTypes<KeySchema, ValueRDA>['state']) => MuRDAMapTypes<KeySchema, ValueRDA>['upsertAction'];
    } = (store) => {
        this._savedStore = store;
        return this._actionDispatchers;
    }

    private _constructUpdateDispatcher () {
        const self = this;

        function wrapPartial (root, dispatcher) {
            const savedPartial = { data:<any>null };
            function wrapPartialRec (meta, index:string) {
                if (meta.type === 'unit') {
                    return (new Function(
                        'rda',
                        'saved',
                        `return function () { rda._savedUpdate.action = saved.data${index}.apply(null, arguments); return rda._savedAction; }`,
                    ))(self, savedPartial);
                } else if (meta.type === 'table') {
                    const result = {};
                    const keys = Object.keys(meta.table);
                    for (let i = 0; i < keys.length; ++i) {
                        const key = keys[i];
                        result[key] = wrapPartialRec(meta.table[key], `${index}["${key}"]`);
                    }
                    return result;
                } else if (meta.type === 'partial') {
                    return wrapPartial(
                        meta.action,
                        (new Function(
                            'saved',
                            `return function () { return saved.data${index}.apply(null, arguments); }`,
                        ))(savedPartial));
                }
                return {};
            }
            return (new Function(
                'savedPartial',
                'dispatch',
                'wrapped',
                `return function () { savedPartial.data = dispatch.apply(null, arguments); return wrapped; }`,
            ))(savedPartial, dispatcher, wrapPartialRec(root, ''));
        }

        function wrapStore (meta, dispatcher, index) {
            if (meta.type === 'unit') {
                return (new Function(
                    'rda',
                    'dispatch',
                    `return function () { rda._savedUpdate.action = dispatch(rda._savedElement)${index}.apply(null, arguments); return rda._savedAction; }`,
                ))(self, dispatcher);
            } else if (meta.type === 'table') {
                const result:any = {};
                const keys = Object.keys(meta.table);
                for (let i = 0; i < keys.length; ++i) {
                    const key = keys[i];
                    result[key] = wrapStore(meta.table[key], dispatcher, `${index}["${key}"]`);
                }
                return result;
            } else if (meta.type === 'partial') {
                return wrapPartial(
                    meta.action,
                    (new Function(
                        'rda',
                        'dispatch',
                        `return function () { return dispatch(rda._savedElement)${index}.apply(null, arguments); }`,
                    ))(self, dispatcher));
            }
            return {};
        }

        function wrapAction (meta, dispatcher) {
            if (meta.type === 'unit') {
                return function (...args) {
                    self._savedUpdate.action = dispatcher.apply(null, args);
                    return self._savedAction;
                };
            } else if (meta.type === 'table') {
                const result:any = {};
                const keys = Object.keys(meta.table);
                for (let i = 0; i < keys.length; ++i) {
                    const key = keys[i];
                    result[key] = wrapAction(meta.table[key], dispatcher[key]);
                }
                return result;
            } else if (meta.type === 'partial') {
                return wrapPartial(meta.action, dispatcher);
            }
            return {};
        }

        if (this.valueRDA.actionMeta.type === 'store') {
            return wrapStore(this.valueRDA.actionMeta.action, this.valueRDA.action, '');
        } else {
            return wrapAction(this.valueRDA.actionMeta, this.valueRDA.action);
        }
    }

    private _constructNoopDispatcher () {
        const self = this;
        function mockDispatcher (meta) {
            if (meta.type === 'unit') {
                return function () { return self._savedAction; };
            } else if (meta.type === 'partial') {
                const child = mockDispatcher(meta.action);
                return function () { return child; };
            } else if (meta.type === 'table') {
                const result:any = {};
                const keys = Object.keys(meta.table);
                for (let i = 0; i < keys.length; ++i) {
                    const key = keys[i];
                    result[key] = mockDispatcher(meta.table[key]);
                }
                return result;
            }
            return {};
        }
        if (this.valueRDA.actionMeta.type === 'store') {
            return mockDispatcher(this.valueRDA.actionMeta.action);
        } else {
            return mockDispatcher(this.valueRDA.actionMeta);
        }
    }

    constructor(keySchema:KeySchema, valueRDA:ValueRDA) {
        this.keySchema = keySchema;
        this.valueRDA = valueRDA;

        this.stateSchema = new MuDictionary(valueRDA.stateSchema, Infinity);
        this.storeElementSchema = new MuStruct({
            id: new MuVarint(0),
            sequence: new MuVarint(0),
            deleted: new MuBoolean(true),
            key: keySchema,
            value: valueRDA.storeSchema,
        });
        this.storeSchema = new MuSortedArray(this.storeElementSchema, Infinity,
            function (a, b) {
                return (
                    compareKey(a.key, b.key) ||
                    a.sequence - b.sequence ||
                    a.id - b.id ||
                    (+a.deleted) - (+b.deleted));
            });

        this.upsertActionSchema = this.storeSchema;
        this.updateActionSchema = new MuStruct({
            id: new MuVarint(),
            action: valueRDA.actionSchema,
        });
        this.moveActionSchema = new MuStruct({
            id: new MuVarint(),
            sequence: new MuVarint(),
            key: keySchema,
        });
        this.setDeletedActionSchema = new MuStruct({
            id: new MuVarint(),
            deleted: new MuBoolean(false),
        });

        this.actionSchema = new MuUnion({
            upsert: this.upsertActionSchema,
            update: this.updateActionSchema,
            move: this.moveActionSchema,
            setDeleted: this.setDeletedActionSchema,
            noop: new MuVoid(),
        });

        this.actionMeta = {
            type: 'store',
            action: {
                type: 'table',
                table: {
                    set: { type: 'unit' },
                    remove: { type: 'unit' },
                    clear: { type: 'unit' },
                    reset: { type: 'unit' },
                    move: { type: 'unit' },
                    update: {
                        type: 'partial',
                        action:
                            valueRDA.actionMeta.type === 'store'
                                ? valueRDA.actionMeta.action
                                : valueRDA.actionMeta,
                    },
                },
            },
        };
        this._updateDispatcher = this._constructUpdateDispatcher();
        this._noopDispatcher = this._constructNoopDispatcher();

        this.emptyStore = new MuRDAMapStore<this>([]);
    }

    public createStore (initialState:MuRDAMapTypes<KeySchema, ValueRDA>['state']) {
        const keys = Object.keys(initialState);
        const elements:MuRDAMapStoreElement<this>[] = new Array(keys.length);
        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            const value = initialState[key];
            elements[i] = new MuRDAMapStoreElement<this>(
                this.uuid(),
                1,
                false,
                key,
                <any>this.valueRDA.createStore(value));
        }
        return new MuRDAMapStore<this>(elements);
    }

    public parse (store:MuRDAMapTypes<KeySchema, ValueRDA>['store']) {
        const elements:MuRDAMapStoreElement<this>[] = new Array(store.length);
        const valueRDA = this.valueRDA;
        for (let i = 0; i < elements.length; ++i) {
            const e = store[i];
            elements[i] = new MuRDAMapStoreElement<this>(
                e.id,
                e.sequence,
                e.deleted,
                e.key,
                <any>valueRDA.parse(e.value));
        }
        return new MuRDAMapStore<this>(elements);
    }

    private _uuidBase = (Math.random() * (1 << 32)) >>> 0;
    private _uuidCount = 0;
    public uuid() {
        return this._uuidBase ^ (this._uuidCount++);
    }
}
