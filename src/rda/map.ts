import { MuSchema } from '../schema/schema';
import { MuDictionary } from '../schema/dictionary';
import { MuStruct } from '../schema/struct';
import { MuUnion } from '../schema/union';
import { MuSortedArray } from '../schema/sorted-array';
import { MuVoid } from '../schema/void';
import { MuRDA, MuRDAActionMeta, MuRDABindableActionMeta, MuRDAStore, MuRDATypes } from './rda';

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

    actionSchema:MuStruct<{
        key:KeySchema;
        action:MuUnion<{
            set:ValueRDA['stateSchema'];
            update:ValueRDA['actionSchema'];
            remove:MuVoid;
            noop:MuVoid;
        }>;
    }>;
    action:MuRDAMapTypes<KeySchema, ValueRDA>['actionSchema']['identity'];
    setAction:{
        key:KeySchema['identity'];
        action:{
            type:'set';
            data:ValueRDA['stateSchema']['identity'];
        };
    };
    updateAction:{
        key:KeySchema['identity'];
        action:{
            type:'update';
            data:ValueRDA['actionSchema']['identity'];
        };
    };
    removeAction:{
        key:KeySchema['identity'];
        action:{
            type:'remove';
            data:undefined;
        };
    };
    noopAction:{
        key:KeySchema['identity'];
        action:{
            type:'noop';
            data:undefined;
        };
    };

    storeElementSchema:MuStruct<{
        id:KeySchema;
        store:ValueRDA['storeSchema'];
    }>;
    storeSchema:MuSortedArray<MuRDAMapTypes<KeySchema, ValueRDA>['storeElementSchema']>;
    store:MuRDAMapTypes<KeySchema, ValueRDA>['storeSchema']['identity'];

    actionMeta:{
        type:'store';
        action:{
            type:'table';
            table:{
                set:{
                    type:'unit';
                };
                update:{
                    type:'partial';
                    action:StripBindMeta<ValueRDA['actionMeta']>;
                };
                remove:{
                    type:'unit';
                };
            };
        };
    };
}

function compareKey (a:string, b:string) {
    return a < b ? -1 : (b < a ? 1 : 0);
}

export class MuRDAMapStore<MapRDA extends MuRDAMap<any, any>> implements MuRDAStore<MapRDA> {
    public stores:{
        [id:string]:MuRDATypes<MapRDA['valueRDA']>['store'];
    };

    constructor (initial:{ [id:string]:MuRDATypes<MapRDA['valueRDA']>['store']; }) {
        this.stores = initial;
    }

    public state(rda:MapRDA, out:MuRDATypes<MapRDA>['state']) : MuRDATypes<MapRDA>['state'] {
        return out;
    }

    public apply(rda:MapRDA, action:MuRDATypes<MapRDA>['action']) : boolean {
        const key = action.key;
        const store = this.stores[key];
        switch (action.action.type) {
            case 'set':
                if (store) {
                    store.free(rda.valueRDA);
                }
                this.stores[key] = rda.valueRDA.store(action.action.data);
                return true;
            case 'update':
                if (store) {
                    return store.apply(rda.valueRDA, action.action.data);
                } else {
                    return false;
                }
            case 'remove':
                if (store) {
                    store.free(rda.valueRDA);
                    delete this.stores[key];
                    return true;
                } else {
                    return false;
                }
            case 'noop':
                return true;
        }
        return false;
    }

    public inverse(rda:MapRDA, action:MuRDATypes<MapRDA>['action']) : MuRDATypes<MapRDA>['action'] {
        const result = rda.actionSchema.alloc();
        result.key = rda.keySchema.assign(rda.keySchema, action.key);
        const store = this.stores[result.key];
        switch (action.action.type) {
            case 'set':
                if (store) {
                    result.action.type = 'set';
                    result.action.data = store.state(rda.valueRDA, result.action.data);
                } else {
                    result.action.type = 'remove';
                }
                break;
            case 'update':
                if (store) {
                    result.action.type = 'update';
                    result.action.data = store.inverse(rda.valueRDA, action.action.data);
                } else {
                    result.action.type = 'noop';
                }
                break;
            case 'remove':
                if (store) {
                    result.action.type = 'set';
                    result.action.data = store.state(rda.valueRDA, result.action.data);
                } else {
                    result.action.type = 'noop';
                }
                break;
            case 'noop':
                result.action.type = 'noop';
                break;
        }
        return result;
    }

    public serialize (rda:MapRDA, result:MuRDATypes<MapRDA>['serializedStore']) : MuRDATypes<MapRDA>['serializedStore'] {
        const ids = Object.keys(this.stores);
        ids.sort(compareKey);
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
            const id = ids[i];
            const element = result[i];
            const store = this.stores[id];
            element.id = id;
            element.store = store.serialize(rda.valueRDA, store);
        }
        return result;
    }

    public free (rda:MapRDA) {
        const ids = Object.keys(this.stores);
        for (let i = 0; i < ids.length; ++i) {
            this.stores[ids[i]].free(rda.valueRDA);
        }
    }
}

type WrapAction<Key, Meta, Dispatch> =
    Meta extends { type:'unit' }
        ? Dispatch extends (...args:infer ArgType) => infer RetType
            ?  (...args:ArgType) => {
                    key:Key;
                    action:{
                        type:'noop';
                    } | {
                        type:'update';
                        data:RetType;
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

    public readonly stateSchema:MuRDAMapTypes<KeySchema, ValueRDA>['stateSchema'];
    public readonly actionSchema:MuRDAMapTypes<KeySchema, ValueRDA>['actionSchema'];
    public readonly storeSchema:MuRDAMapTypes<KeySchema, ValueRDA>['storeSchema'];
    public readonly storeElementSchema:MuRDAMapTypes<KeySchema, ValueRDA>['storeElementSchema'];

    public readonly actionMeta:MuRDAMapTypes<KeySchema, ValueRDA>['actionMeta'];

    private _savedStore:any = null;
    private _savedElement:any = null;
    private _savedAction:any = null;
    private _updateDispatcher:any = null;
    private _noopDispatcher:any = null;

    private _actionDispatchers:any = {
        set: (key:KeySchema['identity'], state:ValueRDA['stateSchema']['identity']) => {
            const result = this.actionSchema.alloc();
            result.key = this.keySchema.assign(result.key, key);
            result.action.type = 'set';
            result.action.data = this.valueRDA.stateSchema.clone(state);
            return result;
        },
        remove: (key:KeySchema['identity']) => {
            const result = this.actionSchema.alloc();
            result.key = this.keySchema.assign(result.key, key);
            result.action.type = 'remove';
            return result;
        },
        update: (key:KeySchema['identity']) => {
            this._savedElement = this._savedStore.stores[key];
            this._savedAction = this.actionSchema.alloc();
            this._savedAction.key = this.keySchema.assign(this._savedAction.key, key);
            if (this._savedElement) {
                this._savedAction.action.type = 'update';
                return this._updateDispatcher;
            } else {
                this._savedAction.action.type = 'noop';
                return this._noopDispatcher;
            }
        },
    };

    public readonly action:(store:MuRDAMapStore<MuRDAMap<KeySchema, ValueRDA>>) => {
        set:(key:KeySchema['identity'], value:ValueRDA['stateSchema']['identity']) => MuRDAMapTypes<KeySchema, ValueRDA>['setAction'];
        remove:(key:KeySchema['identity']) => MuRDAMapTypes<KeySchema, ValueRDA>['removeAction'];
        update:(key:KeySchema['identity']) => StripBindAndWrap<KeySchema['identity'], ValueRDA>;
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
                        `return function () {
                            rda._savedAction.action.data = saved.data${index}.apply(null, arguments);
                            return rda._savedAction;
                        }`,
                        'rda',
                        'saved'))(self, savedPartial);
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
                            `return function () {
                                return saved.data${index}.apply(null, arguments);
                            }`,
                            'saved'))(savedPartial));
                }
                return {};
            }
            return (new Function(
                `return function () {
                    savedPartial.data = dispatch.apply(null, arguments);
                    return wrapped;
                }`,
                'savedPartial',
                'dispatch',
                'wrapped',
            ))(savedPartial, dispatcher, wrapPartialRec(root, ''));
        }

        function wrapStore (meta, dispatcher, index) {
            if (meta.type === 'unit') {
                return (new Function(
                    `return function () {
                        rda._savedAction.data = dispatch(rda._savedElement)${index}.apply(null, arguments);
                        return rda._savedAction;
                    }`,
                    'rda',
                    'dispatch',
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
                        `return function () {
                            return dispatch(rda._savedElement)${index}.apply(null, arguments);
                        }`,
                        'rda',
                        'dispatch'))(self, dispatcher));
            }
            return {};
        }

        function wrapAction (meta, dispatcher) {
            if (meta.type === 'unit') {
                return function (...args) {
                    self._savedAction.action.data = dispatcher.apply(null, args);
                    return self._savedAction;
                };
            } else if (meta.type === 'table') {
                const result:any = {};
                const keys = Object.keys(meta.action);
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
        this.actionSchema = new MuStruct({
            key:keySchema,
            action:new MuUnion({
                set:valueRDA.stateSchema,
                update:valueRDA.actionSchema,
                remove:new MuVoid(),
                noop:new MuVoid(),
            }),
        });
        this.storeElementSchema = new MuStruct({
            id:keySchema,
            store:valueRDA.storeSchema,
        });
        this.storeSchema = new MuSortedArray(this.storeElementSchema, Infinity,
            (a, b) => {
                return compareKey(a.id, b.id);
            });
        this.actionMeta = {
            type: 'store',
            action: {
                type: 'table',
                table: {
                    set: { type: 'unit' },
                    remove: { type: 'unit' },
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
    }

    public store(initialState:MuRDAMapTypes<KeySchema, ValueRDA>['state']) : MuRDAMapStore<this> {
        const result:any = {};
        const ids = Object.keys(initialState);
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            result[id] = this.valueRDA.store(initialState[id]);
        }
        return new MuRDAMapStore<this>(result);
    }

    public parse (store:MuRDAMapTypes<KeySchema, ValueRDA>['store']) : MuRDAMapStore<this> {
        const result:any = {};
        for (let i = 0; i < store.length; ++i) {
            const element = store[i];
            result[element.id] = this.valueRDA.parse(element.store);
        }
        return new MuRDAMapStore<this>(result);
    }
}
