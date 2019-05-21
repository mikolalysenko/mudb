import { MuSchema } from '../schema/schema';
import { MuDictionary } from '../schema/dictionary';
import { MuStruct } from '../schema/struct';
import { MuUnion } from '../schema/union';
import { MuSortedArray } from '../schema/sorted-array';
import { MuBoolean } from '../schema';
import { MuASCII } from '../schema/ascii';
import { MuUint32 } from '../schema/uint32';
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
    moveActionSchema:MuStruct<{
        src:KeySchema;
        dst:KeySchema;
    }>;
    unmoveActionSchema:MuStruct<{
        overwritten:MuBoolean;
        dst:KeySchema;
        src:KeySchema;
        dstVersion:MuUint32;
    }>;
    restoreActionSchema:MuStruct<{
        id:KeySchema;
        attr:MuASCII;
        value:MuUint32;
    }>;
    actionSchema:MuUnion<{
        set:MuRDAMapTypes<KeySchema, ValueRDA>['setActionSchema'];
        update:MuRDAMapTypes<KeySchema, ValueRDA>['updateActionSchema'];
        move:MuRDAMapTypes<KeySchema, ValueRDA>['moveActionSchema'];
        remove:KeySchema;
        unmove:MuRDAMapTypes<KeySchema, ValueRDA>['unmoveActionSchema'];
        restore:MuRDAMapTypes<KeySchema, ValueRDA>['restoreActionSchema'];
        reset:MuRDAMapTypes<KeySchema, ValueRDA>['storeSchema']
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
    moveAction:{
        type:'move';
        data:{
            src:KeySchema['identity'];
            dst:KeySchema['identity'];
        };
    };
    unmoveAction:{
        type:'unmove';
        data:{
            overwritten:boolean;
            dst:KeySchema['identity'];
            src:KeySchema['identity'];
            dstVersion:number;
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
            id:string;
            attr:string;
            value:number;
        };
    };
    resetAction:{
        type:'reset';
        data:{
            id:KeySchema['identity'];
            store:ValueRDA['storeSchema']['identity'];
        }[];
    };

    valueStoreSchema:MuStruct<{
        id:KeySchema;
        store:ValueRDA['storeSchema'];
    }>;
    storeSchema:MuSortedArray<MuRDAMapTypes<KeySchema, ValueRDA>['valueStoreSchema']>;
    store:MuRDAMapTypes<KeySchema, ValueRDA>['storeSchema']['identity'];

    actionMeta:{
        type:'store';
        action:{
            type:'table';
            table:{
                set:{
                    type:'unit';
                };
                move:{
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

const uniqueId:() => string = (() => {
    let counter = 0;
    return () => {
        ++counter;
        return Date.now().toString(36).substring(2) + counter.toString(36);
    };
})();

export class MuRDAMapStore<MapRDA extends MuRDAMap<any, any>> implements MuRDAStore<MapRDA> {
    public stores:{
        [id:string]:MuRDATypes<MapRDA['valueRDA']>['store'];
    } = {};
    public keyToIds:{
        [key:string]:{
            valid:boolean;
            version:number;
            ids:string[];
        };
    } = {};

    constructor (initial:{ [key:string]:MuRDATypes<MapRDA['valueRDA']>['store']; }) {
        const keys = Object.keys(initial);
        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            const id = uniqueId();
            this.stores[id] = initial[key];
            this.keyToIds[key] = {
                valid: true,
                version: 0,
                ids: [ id ],
            };
        }
    }

    public state (rda:MapRDA, out:MuRDATypes<MapRDA>['state']) : MuRDATypes<MapRDA>['state'] {
        const outKeys = Object.keys(out);
        for (let i = 0; i < outKeys.length; ++i) {
            const key = outKeys[i];
            const ids = this.keyToIds[key];
            if (ids && ids.valid) {
                rda.valueRDA.stateSchema.free(out[key]);
                delete out[key];
            }
        }
        const keys = Object.keys(this.keyToIds);
        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            const ids = this.keyToIds[key];
            if (ids.valid) {
                const id = ids.ids[ids.version];
                out[key] = this.stores[id].state(rda.valueRDA, out[key] || rda.valueRDA.stateSchema.alloc());
            }
        }
        return out;
    }

    public apply(rda:MapRDA, action:MuRDATypes<MapRDA>['action']) : boolean {
        const { type, data } = action;
        if (type === 'set') {
            const key = data.id;
            const id = uniqueId();
            this.stores[id] = rda.valueRDA.createStore(data.value);
            if (!(key in this.keyToIds)) {
                this.keyToIds[key] = {
                    valid: true,
                    version: -1,
                    ids: [],
                };
            }
            const ids = this.keyToIds[key];
            ids.valid = true;
            ids.ids.push(id);
            ids.version = ids.ids.length - 1;
            return true;
        } else if (type === 'update') {
            const key = data.id;
            const ids = this.keyToIds[key];
            if (ids && ids.valid) {
                const id = ids.ids[ids.version];
                const store = this.stores[id];
                if (store) {
                    return store.apply(rda.valueRDA, data.action);
                }
            }
        } else if (type === 'remove') {
            const key = data;
            const ids = this.keyToIds[key];
            if (ids && ids.valid) {
                ids.valid = false;
                return true;
            }
        } else if (type === 'move') {
            const { src, dst } = data;
            if (src !== dst) {
                const srcIds = this.keyToIds[src];
                if (srcIds && srcIds.valid) {
                    srcIds.valid = false;
                    if (!(dst in this.keyToIds)) {
                        this.keyToIds[dst] = {
                            valid: true,
                            version: -1,
                            ids: [],
                        };
                    }
                    const dstIds = this.keyToIds[dst];
                    dstIds.valid = true;
                    dstIds.ids.push(srcIds.ids[srcIds.version]);
                    dstIds.version = dstIds.ids.length - 1;
                    return true;
                }
            }
        } else if (type === 'restore') {
            const key = data.id;
            const ids = this.keyToIds[key];
            if (ids) {
                if (data.attr === 'version') {
                    ids.valid = true;
                    ids.version = data.value;
                } else if (data.attr === 'valid') {
                    ids.valid = !!data.value;
                }
                return true;
            }
        } else if (type === 'unmove') {
            const { overwritten, dst, dstVersion, src } = data;
            const dstIds = this.keyToIds[dst];
            const srcIds = this.keyToIds[src];
            if (dstIds && srcIds) {
                dstIds.valid = overwritten;
                dstIds.version = dstVersion;
                srcIds.valid = true;
                return true;
            }
        } else if (type === 'reset') {
            const keys = Object.keys(this.stores);
            for (let i = 0; i < keys.length; ++i) {
                this.stores[keys[i]].free(rda.valueRDA);
            }
            this.stores = {};
            this.keyToIds = {};
            for (let i = 0; i < data.length; ++i) {
                const id = uniqueId();
                this.stores[id] = rda.valueRDA.parse(data[i].store);
                this.keyToIds[data[i].id] = {
                    valid: true,
                    version: 0,
                    ids: [ id ],
                };
            }
            return true;
        } else if (type === 'noop') {
            return true;
        }
        return false;
    }

    public inverse(rda:MapRDA, action:MuRDATypes<MapRDA>['action']) {
        const { type, data } = action;
        const result = rda.actionSchema.alloc();
        if (type === 'set') {
            const key = data.id;
            const ids = this.keyToIds[key];
            if (ids && ids.valid) {
                result.type = 'restore';
                result.data = rda.restoreActionSchema.alloc();
                result.data.id = key;
                result.data.attr = 'version';
                result.data.value = ids.version;
                return <MuRDAMapTypes<MapRDA['keySchema'], MapRDA['valueRDA']>['restoreAction']>result;
            } else {
                result.type = 'remove';
                result.data = key;
                return <MuRDAMapTypes<MapRDA['keySchema'], MapRDA['valueRDA']>['removeAction']>result;
            }
        } else if (type === 'update') {
            const key = data.id;
            const ids = this.keyToIds[key];
            if (ids && ids.valid) {
                const store = this.stores[ids.ids[ids.version]];
                if (store) {
                    result.type = 'update';
                    result.data = rda.updateActionSchema.alloc();
                    result.data.id = rda.keySchema.assign(result.data.id, key);
                    rda.valueRDA.actionSchema.free(result.data.action);
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
            }
        } else if (type === 'restore') {
            const key = data.id;
            const ids = this.keyToIds[key];
            if (ids) {
                result.type = 'restore';
                result.data = rda.restoreActionSchema.alloc();
                result.data.id = key;
                if (data.op === 'version') {
                    result.data.attr = 'version';
                    result.data.value = ids.version;
                } else if (data.op === 'valid') {
                    result.data.attr = 'valid';
                    result.data.value = 1 - data.value;
                }
                return <MuRDAMapTypes<MapRDA['keySchema'], MapRDA['valueRDA']>['restoreAction']>result;
            }
        } else if (type === 'remove') {
            const key = data;
            const ids = this.keyToIds[key];
            if (ids && ids.valid) {
                result.type = 'restore';
                result.data = rda.restoreActionSchema.alloc();
                result.data.id = key;
                result.data.attr = 'valid';
                result.data.value = 1;
                return <MuRDAMapTypes<MapRDA['keySchema'], MapRDA['valueRDA']>['restoreAction']>result;
            }
        } else if (type === 'move') {
            const { src, dst } = data;
            const srcIds = this.keyToIds[src];
            if (srcIds && srcIds.valid) {
                const store = this.stores[srcIds.ids[srcIds.version]];
                if (store) {
                    result.type = 'unmove';
                    result.data = rda.unmoveActionSchema.alloc();
                    result.data.dst = dst;
                    result.data.src = src;

                    const dstIds = this.keyToIds[dst];
                    result.data.dstVersion = dstIds ? dstIds.version : -1;
                    result.data.overwritten = !!(dstIds && dstIds.valid);
                    return result;
                }
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
        const keyToId:{ [key:string]:string } = {};
        const keys = Object.keys(this.keyToIds);
        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            const ids_ = this.keyToIds[key];
            if (ids_.valid) {
                const id = ids_.ids[ids_.version];
                if (id) {
                    keyToId[key] = id;
                }
            }
        }
        const validKeys = Object.keys(keyToId);
        validKeys.sort(compareKey);

        while (result.length > validKeys.length) {
            const element = result.pop();
            if (element) {
                rda.valueStoreSchema.free(element);
            }
        }
        while (result.length < validKeys.length) {
            result.push(rda.valueStoreSchema.alloc());
        }
        for (let i = 0; i < validKeys.length; ++i) {
            const key = validKeys[i];
            const id = keyToId[key];
            const element = result[i];
            const store = this.stores[id];
            element.id = key;
            element.store = store.serialize(rda.valueRDA, rda.valueRDA.storeSchema.alloc());
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
                    data:MuVoid['identity'];
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
    public readonly moveActionSchema:MuRDAMapTypes<KeySchema, ValueRDA>['moveActionSchema'];
    public readonly unmoveActionSchema:MuRDAMapTypes<KeySchema, ValueRDA>['unmoveActionSchema'];
    public readonly restoreActionSchema:MuRDAMapTypes<KeySchema, ValueRDA>['restoreActionSchema'];

    public readonly stateSchema:MuRDAMapTypes<KeySchema, ValueRDA>['stateSchema'];
    public readonly actionSchema:MuRDAMapTypes<KeySchema, ValueRDA>['actionSchema'];
    public readonly valueStoreSchema:MuRDAMapTypes<KeySchema, ValueRDA>['valueStoreSchema'];
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
        move: (src:KeySchema['identity'], dst:KeySchema['identity']) => {
            const result = this.actionSchema.alloc();
            result.type = 'move';
            result.data = this.moveActionSchema.alloc();
            result.data.src = this.keySchema.clone(src);
            result.data.dst = this.keySchema.clone(dst);
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
                const entry = this.valueStoreSchema.alloc();
                entry.id = this.keySchema.assign(entry.id, key);
                const temp = this.valueRDA.parse(state[key]);
                entry.store = temp.serialize(this.valueRDA, entry.store);
                temp.free(this.valueRDA);
                result.data.push(entry);
            }
            return result;
        },
        update: (key:KeySchema['identity']) => {
            const ids = this._savedStore.keyToIds[key];
            const id = ids && ids.ids[ids.version];
            this._savedElement = this._savedStore.stores[id];
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
        move:(src:KeySchema['identity'], dst:KeySchema['identity']) => MuRDAMapTypes<KeySchema, ValueRDA>['moveAction'];
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
        this.moveActionSchema = new MuStruct({
            src: keySchema,
            dst: keySchema,
        });
        this.unmoveActionSchema = new MuStruct({
            overwritten: new MuBoolean(),
            dst: keySchema,
            src: keySchema,
            dstVersion: new MuUint32(),
        });
        this.restoreActionSchema = new MuStruct({
            id: keySchema,
            attr: new MuASCII(),
            value: new MuUint32(),
        });

        this.valueStoreSchema = new MuStruct({
            id: keySchema,
            store: this.valueRDA['storeSchema'],
        });
        this.storeSchema = new MuSortedArray(
            this.valueStoreSchema,
            Infinity,
            function (a, b) {
                return compareKey(a.id, b.id);
            });

        this.actionSchema = new MuUnion({
            set: this.setActionSchema,
            update: this.updateActionSchema,
            move: this.moveActionSchema,
            remove: keySchema,
            unmove: this.unmoveActionSchema,
            restore: this.restoreActionSchema,
            reset: this.storeSchema,
            noop: new MuVoid(),
        });

        this.actionMeta = {
            type: 'store',
            action: {
                type: 'table',
                table: {
                    set: { type: 'unit' },
                    move: { type: 'unit' },
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

    public createStore (initialState:MuRDAMapTypes<KeySchema, ValueRDA>['state']) : MuRDAMapStore<this> {
        const result:any = {};
        const ids = Object.keys(initialState);
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            result[id] = this.valueRDA.createStore(initialState[id]);
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
