import { MuSchema } from '../schema/schema';
import { MuDictionary } from '../schema/dictionary';
import { MuStruct } from '../schema/struct';
import { MuUnion } from '../schema/union';
import { MuSortedArray } from '../schema/sorted-array';
import { MuVoid } from '../schema/void';
import { MuASCII } from '../schema/ascii';
import { MuRDA, MuRDAActionMeta, MuRDABindableActionMeta, MuRDAStore, MuRDATypes } from './rda';

type StripBindMeta<Meta extends MuRDABindableActionMeta> =
    Meta extends { type:'store'; action:MuRDAActionMeta; }
        ? Meta['action']
    : Meta extends MuRDAActionMeta
        ? Meta
        : never;

export interface MuRDAMapTypes<
    IdSchema extends MuSchema<string>,
    ValueRDA extends MuRDA<any, any, any, any>> {
    value:ValueRDA['stateSchema']['identity'];

    stateSchema:MuDictionary<ValueRDA['stateSchema']>;
    state:MuRDAMapTypes<IdSchema, ValueRDA>['stateSchema']['identity'];

    setActionSchema:MuStruct<{
        key:IdSchema;
        value:ValueRDA['stateSchema'];
    }>;
    updateActionSchema:MuStruct<{
        id:MuSchema<string>;
        action:ValueRDA['actionSchema'];
    }>;
    moveActionSchema:MuStruct<{
        src:IdSchema;
        dst:IdSchema;
    }>;
    unmoveActionSchema:MuStruct<{
        dst:IdSchema;
        src:IdSchema;
        dstId:MuSchema<string>;
    }>;
    restoreActionSchema:MuStruct<{
        key:IdSchema;
        id:MuSchema<string>;
    }>;
    actionSchema:MuUnion<{
        set:MuRDAMapTypes<IdSchema, ValueRDA>['setActionSchema'];
        update:MuRDAMapTypes<IdSchema, ValueRDA>['updateActionSchema'];
        move:MuRDAMapTypes<IdSchema, ValueRDA>['moveActionSchema'];
        unmove:MuRDAMapTypes<IdSchema, ValueRDA>['unmoveActionSchema'];
        remove:IdSchema;
        unremove:IdSchema;
        reset:MuRDAMapTypes<IdSchema, ValueRDA>['storeSchema']
        restore:MuRDAMapTypes<IdSchema, ValueRDA>['restoreActionSchema'];
        noop:MuVoid;
    }>;
    action:MuRDAMapTypes<IdSchema, ValueRDA>['actionSchema']['identity'];
    setAction:{
        type:'set';
        data:{
            key:IdSchema['identity'];
            value:ValueRDA['stateSchema']['identity'];
        };
    };
    updateAction:{
        type:'update';
        data:{
            id:string;
            action:ValueRDA['actionSchema']['identity'];
        };
    };
    moveAction:{
        type:'move';
        data:{
            src:IdSchema['identity'];
            dst:IdSchema['identity'];
        };
    };
    unmoveAction:{
        type:'unmove';
        data:{
            dst:IdSchema['identity'];
            src:IdSchema['identity'];
            dstId:string;
        };
    };
    removeAction:{
        type:'remove';
        data:IdSchema['identity'];
    };
    unremoveAction:{
        type:'unremove';
        data:IdSchema['identity'];
    };
    restoreAction:{
        type:'restore';
        data:{
            key:IdSchema['identity'];
            id:string;
        };
    };
    resetAction:{
        type:'reset';
        data:{
            key:IdSchema['identity'];
            store:ValueRDA['storeSchema']['identity'];
        }[];
    };
    noopAction:{
        type:'noop';
        data:undefined;
    };

    valueStoreSchema:MuStruct<{
        key:IdSchema;
        store:ValueRDA['storeSchema'];
    }>;
    storeSchema:MuSortedArray<MuRDAMapTypes<IdSchema, ValueRDA>['valueStoreSchema']>;
    store:MuRDAMapTypes<IdSchema, ValueRDA>['storeSchema']['identity'];

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

    storeNode:{
        id:string;
        key:string;
        value:MuRDAStore<ValueRDA>;
        live:boolean;
    };
}

function compareKey (a:string, b:string) {
    return a < b ? -1 : (b < a ? 1 : 0);
}

const uniqueId = (() => {
    let counter = 0;
    return () => {
        ++counter;
        return Date.now().toString(36).substring(2) + counter.toString(36);
    };
})();

export class MuRDAMapStore<MapRDA extends MuRDAMap<any, any>> implements MuRDAStore<MapRDA> {
    public idToNode:{
        [id:string]:MuRDAMapTypes<MapRDA['keySchema'], MapRDA['valueRDA']>['storeNode'];
    };
    public keyToNode:{
        [key:string]:MuRDAMapTypes<MapRDA['keySchema'], MapRDA['valueRDA']>['storeNode'];
    };

    constructor (initial:{ [id:string]:MuRDAMapTypes<MapRDA['keySchema'], MapRDA['valueRDA']>['storeNode']; }) {
        this.idToNode = initial;
        this.keyToNode = {};
        const ids = Object.keys(initial);
        for (let i = 0; i < ids.length; ++i) {
            const node = initial[ids[i]];
            this.keyToNode[<any>node['key']] = node;
        }
    }

    public state(rda:MapRDA, out:MuRDATypes<MapRDA>['state']) : MuRDATypes<MapRDA>['state'] {
        const outKeys = Object.keys(out);
        for (let i = 0; i < outKeys.length; ++i) {
            const key = outKeys[i];
            const node = this.keyToNode[key];
            if (node && node.live) {
                rda.valueRDA.stateSchema.free(out[key]);
                delete out[key];
            }
        }
        const keys = Object.keys(this.keyToNode);
        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            const node = this.keyToNode[key];
            if (node && node.live) {
                out[key] = node.value.state(rda.valueRDA, rda.valueRDA.stateSchema.alloc());
            }
        }
        return out;
    }

    public apply(rda:MapRDA, action:MuRDATypes<MapRDA>['action']) : boolean {
        const { type, data } = action;
        if (type === 'set') {
            const { key, value } = data;
            const id = uniqueId();
            const node = <MuRDAMapTypes<MapRDA['keySchema'], MapRDA['valueRDA']>['storeNode']>{};
            node.id = id;
            node.key = key;
            node.value = rda.valueRDA.createStore(value);
            node.live = true;
            this.keyToNode[key] = this.idToNode[id] = node;
            return true;
        } else if (type === 'update') {
            const id = data.id;
            const node = this.idToNode[id];
            if (node && node.live) {
                return node.value.apply(rda.valueRDA, data.action);
            }
            return false;
        } else if (type === 'remove') {
            const key = data;
            const node = this.keyToNode[key];
            if (node && node.live) {
                node.live = false;
                return true;
            }
        } else if (type === 'unremove') {
            const key = data;
            const node = this.keyToNode[key];
            if (node && !node.live) {
                node.live = true;
                return true;
            }
        } else if (type === 'restore') {
            const { key, id } = data;
            const node = this.idToNode[id];
            if (node) {
                this.keyToNode[key] = node;
                return true;
            }
        } else if (type === 'move') {
            const { src, dst } = data;
            if (src === dst) {
                return false;
            }
            const srcNode = this.keyToNode[src];
            if (srcNode && srcNode.live) {
                srcNode.live = false;
                const id = uniqueId();
                const valueRDA = rda.valueRDA;
                const state = srcNode.value.state(valueRDA, valueRDA.stateSchema.alloc());
                const node = <MuRDAMapTypes<MapRDA['keySchema'], MapRDA['valueRDA']>['storeNode']>{};
                node.id = id;
                node.key = dst;
                node.value = valueRDA.createStore(state);
                node.live = true;
                this.keyToNode[dst] = this.idToNode[id] = node;
                return true;
            }
        } else if (type === 'unmove') {
            const { dst, src, dstId } = data;
            const dstNode = this.keyToNode[dst];
            if (dstNode && dstNode.live) {
                this.keyToNode[dst] = this.idToNode[dstId];
                const srcNode = this.keyToNode[src];
                if (srcNode && !srcNode.live) {
                    srcNode.live = true;
                }
                return true;
            }
        } else if (action.type === 'reset') {
            const ids = Object.keys(this.idToNode);
            for (let i = 0; i < ids.length; ++i) {
                this.idToNode[ids[i]].value.free(rda.valueRDA);
            }
            this.idToNode = {};
            this.keyToNode = {};
            for (let i = 0; i < data.length; ++i) {
                const node = <MuRDAMapTypes<MapRDA['keySchema'], MapRDA['valueRDA']>['storeNode']>{};
                const id = uniqueId();
                const key = data[i].key;
                node.id = id;
                node.key = key;
                node.value = rda.valueRDA.parse(data[i].store);
                node.live = true;
                this.keyToNode[key] = this.idToNode[id] = node;
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
            const { key } = data;
            const node = this.keyToNode[key];
            if (node && node.live) {
                result.type = 'restore';
                result.data = rda.restoreActionSchema.alloc();
                result.data.key = key;
                result.data.id = node.id;
                return <MuRDAMapTypes<MapRDA['keySchema'], MapRDA['valueRDA']>['restoreAction']>result;
            } else {
                result.type = 'remove';
                result.data = key;
                return <MuRDAMapTypes<MapRDA['keySchema'], MapRDA['valueRDA']>['removeAction']>result;
            }
        } else if (type === 'update') {
            const id = data.id;
            const node = this.idToNode[id];
            if (node) {
                result.type = 'update';
                result.data = rda.updateActionSchema.alloc();
                result.data.id = rda.keySchema.assign(result.data.id, id);
                rda.valueRDA.actionSchema.free(result.data.action);
                result.data.action = node.value.inverse(rda.valueRDA, data.action);
                return result;
            }
        } else if (type === 'remove') {
            const key = data;
            const node = this.keyToNode[key];
            if (node && node.live) {
                result.type = 'unremove';
                result.data = key;
                return result;
            }
        } else if (type === 'unremove') {
            const key = data;
            const node = this.keyToNode[key];
            if (node && !node.live) {
                result.type = 'remove';
                result.data = key;
                return result;
            }
        } else if (type === 'move') {
            const { src, dst } = data;
            if (src !== dst) {
                const srcNode = this.keyToNode[src];
                if (srcNode && srcNode.live) {
                    result.type = 'unmove';
                    result.data = {};
                    result.data.dst = dst;
                    result.data.src = src;
                    result.data.dstId = '';
                    const dstNode = this.keyToNode[dst];
                    if (dstNode) {
                        result.data.dstId = dstNode.id;
                    }
                    return result;
                }
            }
        } else if (type === 'unmove') {
            const { dst, src } = data;
            const dstNode = this.keyToNode[dst];
            const srcNode = this.keyToNode[src];
            if (dstNode && dstNode.live) {
                if (srcNode && !srcNode.live) {
                    result.type = 'move';
                    result.data = rda.moveActionSchema.alloc();
                    result.data.src = src;
                    result.data.dst = dst;
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
        const keys = Object.keys(this.keyToNode);
        const validKeys:MapRDA['keySchema'][] = [];
        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            const node = this.keyToNode[key];
            if (node && node.live) {
                validKeys.push(key);
            }
        }
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
            const element = result[i];
            const store = this.keyToNode[key].value;
            element.key = key;
            element.store = store.serialize(rda.valueRDA, rda.valueRDA.storeSchema.alloc());
        }
        return result;
    }

    public free (rda:MapRDA) {
        const ids = Object.keys(this.idToNode);
        for (let i = 0; i < ids.length; ++i) {
            this.idToNode[ids[i]].value.free(rda.valueRDA);
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
                        id:string;
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
    public readonly idSchema:MuSchema<string>;
    public readonly keySchema:KeySchema;
    public readonly valueRDA:ValueRDA;

    public readonly setActionSchema:MuRDAMapTypes<KeySchema, ValueRDA>['setActionSchema'];
    public readonly updateActionSchema:MuRDAMapTypes<KeySchema, ValueRDA>['updateActionSchema'];
    public readonly moveActionSchema:MuRDAMapTypes<KeySchema, ValueRDA>['moveActionSchema'];
    public readonly unmoveActionSchema:MuRDAMapTypes<KeySchema, ValueRDA>['unmoveActionSchema'];
    public readonly restoreActionSchema:MuRDAMapTypes<KeySchema, ValueRDA>['restoreActionSchema'];

    public readonly stateSchema:MuRDAMapTypes<KeySchema, ValueRDA>['stateSchema'];
    public readonly actionSchema:MuRDAMapTypes<KeySchema, ValueRDA>['actionSchema'];
    public readonly storeSchema:MuRDAMapTypes<KeySchema, ValueRDA>['storeSchema'];
    public readonly valueStoreSchema:MuRDAMapTypes<KeySchema, ValueRDA>['valueStoreSchema'];

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
            result.data.key = this.keySchema.assign(result.data.key, key);
            result.data.value = this.valueRDA.stateSchema.assign(result.data.value, state);
            return result;
        },
        move: (src:KeySchema['identity'], dst:KeySchema['identity']) => {
            const result = this.actionSchema.alloc();
            result.type = 'move';
            result.data = this.moveActionSchema.alloc();
            result.data.src = src;
            result.data.dst = dst;
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
            const keys = Object.keys(state);
            keys.sort(compareKey);
            for (let i = 0; i < keys.length; ++i) {
                const key = keys[i];
                const entry = this.valueStoreSchema.alloc();
                entry.key = this.keySchema.assign(entry.key, key);
                const temp = this.valueRDA.createStore(state[key]);
                entry.store = temp.serialize(this.valueRDA, entry.store);
                temp.free(this.valueRDA);
                result.data.push(entry);
            }
            return result;
        },
        update: (key:KeySchema['identity']) => {
            this._savedElement = this._savedStore.keyToNode[key];
            this._savedAction = this.actionSchema.alloc();
            if (this._savedElement && this._savedElement.live) {
                this._savedAction.type = 'update';
                this._savedUpdate = this._savedAction.data = this.updateActionSchema.alloc();
                this._savedAction.data.id = this._savedElement.id;
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
        update:(key:KeySchema['identity']) => StripBindAndWrap<KeySchema['identity'], ValueRDA>;
        move:(src:KeySchema['identity'], dst:KeySchema['identity']) => MuRDAMapTypes<KeySchema, ValueRDA>['moveAction'];
        remove:(key:KeySchema['identity']) => MuRDAMapTypes<KeySchema, ValueRDA>['removeAction'];
        reset:(state:MuRDAMapTypes<KeySchema, ValueRDA>['state']) => MuRDAMapTypes<KeySchema, ValueRDA>['resetAction'];
        clear:() => {
            type:'reset';
            data:[];
        };
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
                    `return function () { rda._savedUpdate.action = dispatch(rda._savedElement.value)${index}.apply(null, arguments); return rda._savedAction; }`,
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
                        `return function () { return dispatch(rda._savedElement.value)${index}.apply(null, arguments); }`,
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
        this.idSchema = new MuASCII();
        this.keySchema = keySchema;
        this.valueRDA = valueRDA;

        this.stateSchema = new MuDictionary(valueRDA.stateSchema, Infinity);

        this.setActionSchema = new MuStruct({
            key: keySchema,
            value: valueRDA.stateSchema,
        });
        this.updateActionSchema = new MuStruct({
            id: this.idSchema,
            action: valueRDA.actionSchema,
        });
        this.moveActionSchema = new MuStruct({
            src: keySchema,
            dst: keySchema,
        });
        this.unmoveActionSchema = new MuStruct({
            dst: keySchema,
            src: keySchema,
            dstId: this.idSchema,
        });
        this.restoreActionSchema = new MuStruct({
            key: keySchema,
            id: this.idSchema,
        });

        this.valueStoreSchema = new MuStruct({
            key: keySchema,
            store: valueRDA.storeSchema,
        });
        this.storeSchema = new MuSortedArray(this.valueStoreSchema, Infinity,
            function (a, b) {
                return compareKey(a.key, b.key);
            });

        this.actionSchema = new MuUnion({
            set: this.setActionSchema,
            update: this.updateActionSchema,
            move: this.moveActionSchema,
            unmove: this.unmoveActionSchema,
            remove: keySchema,
            unremove: keySchema,
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
        const result:{ [id:string]:MuRDAMapTypes<KeySchema, ValueRDA>['storeNode'] } = {};
        const keys = Object.keys(initialState);
        for (let i = 0; i < keys.length; ++i) {
            const id = uniqueId();
            const key = keys[i];
            const node = <MuRDAMapTypes<KeySchema, ValueRDA>['storeNode']>{};
            node.id = id;
            node.key = key;
            node.value = this.valueRDA.createStore(initialState[key]);
            node.live = true;
            result[id] = node;
        }
        return new MuRDAMapStore<this>(result);
    }

    public parse (store:MuRDAMapTypes<KeySchema, ValueRDA>['store']) : MuRDAMapStore<this> {
        const result:{ [id:string]:MuRDAMapTypes<KeySchema, ValueRDA>['storeNode'] } = {};
        for (let i = 0; i < store.length; ++i) {
            const entry = store[i];
            const id = uniqueId();
            const node = <MuRDAMapTypes<KeySchema, ValueRDA>['storeNode']>{};
            node.id = id;
            node.key = entry.key;
            node.value = this.valueRDA.parse(entry.store);
            node.live = true;
            result[id] = node;
        }
        return new MuRDAMapStore<this>(result);
    }
}
