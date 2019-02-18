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

    setActionSchema:MuStruct<{
        id:KeySchema;
        value:ValueRDA['stateSchema'];
    }>;
    updateActionSchema:MuStruct<{
        id:KeySchema;
        action:ValueRDA['actionSchema'];
    }>;
    restoreActionSchema:MuStruct<{
        id:KeySchema;
        store:ValueRDA['storeSchema'];
    }>;
    actionSchema:MuUnion<{
        reset:MuRDAMapTypes<KeySchema, ValueRDA>['storeSchema']
        set:MuRDAMapTypes<KeySchema, ValueRDA>['setActionSchema'];
        update:MuRDAMapTypes<KeySchema, ValueRDA>['updateActionSchema'];
        restore:MuRDAMapTypes<KeySchema, ValueRDA>['restoreActionSchema'];
        remove:KeySchema;
        noop:MuVoid;
    }>;
    action:MuRDAMapTypes<KeySchema, ValueRDA>['actionSchema']['identity'];
    setAction:{
        type:'set';
        data:{
            id:KeySchema['identity'];
            value:ValueRDA['stateSchema']['identity'];
        };
    };
    updateAction:{
        type:'update';
        data:{
            id:KeySchema['identity'];
            action:ValueRDA['actionSchema']['identity'];
        };
    };
    removeAction:{
        type:'remove';
        data:KeySchema['identity'];
    };
    noopAction:{
        type:'noop';
        data:undefined;
    };
    restoreAction:{
        type:'restore';
        data:{
            id:KeySchema['identity'];
            store:ValueRDA['storeSchema']['identity'];
        };
    };
    resetAction:{
        type:'reset';
        data:{
            id:KeySchema['identity'];
            store:ValueRDA['storeSchema']['identity'];
        }[];
    };

    storeSchema:MuSortedArray<MuRDAMapTypes<KeySchema, ValueRDA>['restoreActionSchema']>;
    store:MuRDAMapTypes<KeySchema, ValueRDA>['storeSchema']['identity'];

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

export class MuRDAMapStore<MapRDA extends MuRDAMap<any, any>> implements MuRDAStore<MapRDA> {
    public stores:{
        [id:string]:MuRDATypes<MapRDA['valueRDA']>['store'];
    };

    constructor (initial:{ [id:string]:MuRDATypes<MapRDA['valueRDA']>['store']; }) {
        this.stores = initial;
    }

    public state(rda:MapRDA, out:MuRDATypes<MapRDA>['state']) : MuRDATypes<MapRDA>['state'] {
        const outKeys = Object.keys(out);
        for (let i = 0; i < outKeys.length; ++i) {
            const key = outKeys[i];
            if (key in this.stores) {
                rda.valueRDA.stateSchemea.free(out[key]);
                delete out[key];
            }
        }
        const keys = Object.keys(this.stores);
        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            out[key] = this.stores[key].state(rda.valueRDA, out[key] || rda.valueRDA.alloc());
        }
        return out;
    }

    public apply(rda:MapRDA, action:MuRDATypes<MapRDA>['action']) : boolean {
        const { type, data } = action;
        if (type === 'set') {
            const key = data.id;
            const store = this.stores[key];
            if (store) {
                store.free(rda.valueRDA);
            }
            this.stores[key] = rda.valueRDA.store(data.value);
            return true;
        } else if (action.type === 'update') {
            const key = data.id;
            const store = this.stores[key];
            if (store) {
                return store.apply(rda.valueRDA, data.action);
            }
            return false;
        } else if (action.type === 'remove') {
            const key = data;
            const store = this.stores[key];
            if (store) {
                store.free(rda.valueRDA);
                delete this.stores[key];
                return true;
            } else {
                return false;
            }
        } else if (action.type === 'restore') {
            const key = data.id;
            const store = this.stores[key];
            if (store) {
                store.free(rda.valueRDA);
            }
            this.stores[key] = rda.valueRDA.parse(data.store);
            return true;
        } else if (action.type === 'reset') {
            const keys = Object.keys(this.stores);
            for (let i = 0; i < keys.length; ++i) {
                this.stores[keys[i]].free(rda.valueRDA);
            }
            this.stores = {};
            for (let i = 0; i < data.length; ++i) {
                this.stores[data[i].id] = rda.valueRDA.parse(data[i].store);
            }
            return true;
        } else if (action.type === 'noop') {
            return true;
        }
        return false;
    }

    public inverse(rda:MapRDA, action:MuRDATypes<MapRDA>['action']) {
        const { type, data } = action;
        const result = rda.actionSchema.alloc();
        if (type === 'set' || type === 'restore') {
            const key = data.id;
            const store = this.stores[key];
            if (store) {
                result.type = 'restore';
                result.data = rda.setActionSchema.alloc();
                result.data.id = rda.keySchema.assign(result.data.id, key);
                result.data.value = store.serialize(rda.valueRDA, result.data.value);
                return <MuRDAMapTypes<MapRDA['keySchema'], MapRDA['valueRDA']>['restoreAction']>result;
            } else {
                result.type = 'remove';
                result.data = rda.keySchema.assign(result.data, key);
                return <MuRDAMapTypes<MapRDA['keySchema'], MapRDA['valueRDA']>['removeAction']>result;
            }
        } else if (type === 'update') {
            const key = data.id;
            const store = this.stores[key];
            if (store) {
                result.type = 'update';
                result.data = rda.updateActionSchema.alloc();
                result.data.id = rda.keySchema.assign(result.data.id, key);
                rda.valueRDA.free(result.data.action);
                result.data.action = store.inverse(rda.valueRDA, data.action);
                return <{
                    type:'update';
                    data:{
                        id:MapRDA['keySchema']['identity'];
                        action:(typeof store)['inverse'] extends (rda:MapRDA['valueRDA'], action:(typeof data.action)) => infer RetType
                            ? RetType
                            : MapRDA['valueRDA']['actionSchema']['identity'];
                    };
                }>result;
            }
        } else if (type === 'remove') {
            const key = data.id;
            const store = this.stores[key];
            if (store) {
                result.type = 'restore';
                result.data = rda.setActionSchema.alloc();
                result.data.id = rda.keySchema.assign(result.data.id, key);
                result.data.value = store.serialize(rda.valueRDA, result.data.value);
                return <MuRDAMapTypes<MapRDA['keySchema'], MapRDA['valueRDA']>['restoreAction']>result;
            }
        } else if (type === 'reset') {
            result.type = 'reset';
            result.data = this.serialize(rda, rda.storeSchema.alloc());
            return <MuRDAMapTypes<MapRDA['keySchema'], MapRDA['valueRDA']>['resetAction']>result;
        }
        result.type = 'noop';
        return <MuRDAMapTypes<MapRDA['keySchema'], MapRDA['valueRDA']>['noopAction']>result;
    }

    public serialize (rda:MapRDA, result:MuRDATypes<MapRDA>['serializedStore']) : MuRDATypes<MapRDA>['serializedStore'] {
        const ids = Object.keys(this.stores);
        ids.sort(compareKey);
        while (result.length > ids.length) {
            const element = result.pop();
            if (element) {
                rda.restoreActionSchema.free(element);
            }
        }
        while (result.length < ids.length) {
            result.push(rda.restoreActionSchema.alloc());
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
                    type:'noop';
                    data:void
                } | {
                    type:'update';
                    data:{
                        id:Key;
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

    public readonly setActionSchema:MuRDAMapTypes<KeySchema, ValueRDA>['setActionSchema'];
    public readonly updateActionSchema:MuRDAMapTypes<KeySchema, ValueRDA>['updateActionSchema'];
    public readonly restoreActionSchema:MuRDAMapTypes<KeySchema, ValueRDA>['restoreActionSchema'];

    public readonly stateSchema:MuRDAMapTypes<KeySchema, ValueRDA>['stateSchema'];
    public readonly actionSchema:MuRDAMapTypes<KeySchema, ValueRDA>['actionSchema'];
    public readonly storeSchema:MuRDAMapTypes<KeySchema, ValueRDA>['storeSchema'];

    public readonly actionMeta:MuRDAMapTypes<KeySchema, ValueRDA>['actionMeta'];

    private _savedStore:any = null;
    private _savedElement:any = null;
    private _savedAction:any = null;
    private _savedUpdate:MuRDAMapTypes<KeySchema, ValueRDA>['updateActionSchema']['identity'] = <any>null;
    private _updateDispatcher:any = null;
    private _noopDispatcher:any = null;

    private _actionDispatchers:any = {
        set: (key:KeySchema['identity'], state:ValueRDA['stateSchema']['identity']) => {
            const result = this.actionSchema.alloc();
            result.type = 'set';
            result.data = this.setActionSchema.alloc();
            result.data.id = this.keySchema.assign(result.data.id, key);
            result.data.value = this.valueRDA.stateSchema.assign(result.data.value, state);
            return result;
        },
        remove: (key:KeySchema['identity']) => {
            const result = this.actionSchema.alloc();
            result.type = 'remove';
            result.data = this.keySchema.clone(key);
            return result;
        },
        clear: () => {
            const result = this.actionSchema.alloc();
            result.type = 'reset';
            result.data = this.storeSchema.alloc();
            result.data.length = 0;
            return result;
        },
        reset: (state:MuRDAMapTypes<KeySchema, ValueRDA>['state']) => {
            const result = this.actionSchema.alloc();
            result.type = 'reset';
            result.data = this.storeSchema.alloc();
            result.data.length = 0;
            const ids = Object.keys(state);
            ids.sort(compareKey);
            for (let i = 0; i < ids.length; ++i) {
                const key = ids[i];
                const entry = this.restoreActionSchema.alloc();
                entry.id = this.keySchema.assign(entry.id, key);
                const temp = this.valueRDA.parse(state[key]);
                entry.store = temp.serialize(this.valueRDA, entry.store);
                temp.free(this.valueRDA);
                result.data.push(entry);
            }
            return result;
        },
        update: (key:KeySchema['identity']) => {
            this._savedElement = this._savedStore.stores[key];
            this._savedAction = this.actionSchema.alloc();
            if (this._savedElement) {
                this._savedAction.type = 'update';
                this._savedUpdate = this._savedAction.data = this.updateActionSchema.alloc();
                this._savedAction.data.id = this.keySchema.assign(this._savedAction.data.id, key);
                this.valueRDA.actionSchema.free(this._savedUpdate.action);
                return this._updateDispatcher;
            } else {
                this._savedAction.type = 'noop';
                return this._noopDispatcher;
            }
        },
    };

    public readonly action:(store:MuRDAMapStore<MuRDAMap<KeySchema, ValueRDA>>) => {
        set:(key:KeySchema['identity'], value:ValueRDA['stateSchema']['identity']) => MuRDAMapTypes<KeySchema, ValueRDA>['setAction'];
        remove:(key:KeySchema['identity']) => MuRDAMapTypes<KeySchema, ValueRDA>['removeAction'];
        update:(key:KeySchema['identity']) => StripBindAndWrap<KeySchema['identity'], ValueRDA>;
        clear:() => {
            type:'reset';
            data:[];
        };
        reset:(state:MuRDAMapTypes<KeySchema, ValueRDA>['state']) => MuRDAMapTypes<KeySchema, ValueRDA>['resetAction'];
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

        this.setActionSchema = new MuStruct({
            id: keySchema,
            value: valueRDA.stateSchema,
        });
        this.updateActionSchema = new MuStruct({
            id: keySchema,
            action: valueRDA.actionSchema,
        });
        this.restoreActionSchema = new MuStruct({
            id: keySchema,
            store: valueRDA.storeSchema,
        });

        this.storeSchema = new MuSortedArray(this.restoreActionSchema, Infinity,
            function (a, b) {
                return compareKey(a.id, b.id);
            });

        this.actionSchema = new MuUnion({
            set: this.setActionSchema,
            update: this.updateActionSchema,
            restore: this.restoreActionSchema,
            remove: keySchema,
            reset: this.storeSchema,
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
