import { MuRDA, MuRDATypes, MuRDAStore, MuRDAActionMeta } from './rda';
import { MuArray } from '../schema/array';
import { MuUnion } from '../schema/union';
import { MuStruct } from '../schema/struct';
import { MuSortedArray } from '../schema/sorted-array';
import { IdSchema, Id, compareId, compareTaggedId, allocIds, ID_MIN, ID_MAX, initialIds, IdSetSchema, searchId } from './_id';

export interface MuRDAListTypes<RDA extends MuRDA<any, any, any, any>> {
    stateSchema:MuArray<RDA['stateSchema']>;
    state:MuRDAListTypes<RDA>['stateSchema']['identity'];

    insertEntrySchema:MuStruct<{
        id:typeof IdSchema;
        value:RDA['stateSchema'];
    }>;
    insertSchema:MuSortedArray<MuRDAListTypes<RDA>['insertEntrySchema']>;
    removeSchema:MuSortedArray<typeof IdSchema>;
    updateSchema:MuStruct<{
        id:typeof IdSchema;
        action:RDA['actionSchema'];
    }>;
    restoreSchema:MuStruct<{
        remove:MuRDAListTypes<RDA>['removeSchema'];
        add:MuRDAListTypes<RDA>['storeSchema'];
    }>;
    actionSchema:MuUnion<{
        insert:MuRDAListTypes<RDA>['insertSchema'];
        remove:MuRDAListTypes<RDA>['removeSchema'];
        restore:MuRDAListTypes<RDA>['restoreSchema'];
        update:MuRDAListTypes<RDA>['updateSchema'];
        reset:MuRDAListTypes<RDA>['storeSchema'];
    }>;
    insertAction:{
        type:'insert';
        data:MuRDAListTypes<RDA>['insertSchema']['identity'];
    };
    removeAction:{
        type:'remove';
        data:MuRDAListTypes<RDA>['removeSchema']['identity'];
    };
    updateAction:{
        type:'update';
        data:MuRDAListTypes<RDA>['updateSchema']['identity'];
    };
    restoreAction:{
        type:'restore';
        data:{
            remove:MuRDAListTypes<RDA>['removeSchema']['identity'];
            add:MuRDAListTypes<RDA>['storeSchema']['identity'];
        };
    };
    resetAction:{
        type:'reset';
        data:MuRDAListTypes<RDA>['store'];
    };

    storeEntrySchema:MuStruct<{
        id:typeof IdSchema;
        store:RDA['storeSchema'];
    }>;
    storeSchema:MuSortedArray<MuRDAListTypes<RDA>['storeEntrySchema']>;
    store:MuRDAListTypes<RDA>['storeSchema']['identity'];

    actionMeta:{
        type:'store';
        action:{
            type:'table';
            table:{
                insert:{ type:'unit'; };
                remove:{ type:'unit'; };
                push:{ type:'unit'; };
                pop:{ type:'unit'; };
                shift:{ type:'unit'; };
                unshift:{ type:'unit'; };
                clear:{ type:'unit'; };
                reset:{ type:'unit'; };
                update:{
                    type:'partial';
                    action:
                        RDA['actionMeta'] extends { type:'store'; action:MuRDAActionMeta; }
                            ? RDA['actionMeta']['action']
                            : RDA['actionMeta'];
                };
            }
        };
    };
}

export class MuRDAListStore<RDA extends MuRDAList<any>> implements MuRDAStore<RDA> {
    public ids:Id[];
    public list:MuRDATypes<RDA['valueRDA']>['store'][];

    constructor (ids:Id[], list:MuRDATypes<RDA['valueRDA']>['store'][]) {
        this.ids = ids;
        this.list = list;
    }

    public state(rda:RDA, out:MuRDATypes<RDA>['state']) : MuRDATypes<RDA>['state'] {
        const stateSchema = rda.valueRDA.stateSchema;
        while (out.length > 0) {
            stateSchema.free(<any>out.pop());
        }
        for (let i = 0; i < this.list.length; ++i) {
            out.push(this.list[i].state(rda.valueRDA, stateSchema.alloc()));
        }
        return out;
    }

    private _insertApply (rda:RDA, id:Id, value:MuRDATypes<RDA['valueRDA']>['state']) {
        const index = searchId(this.ids, id);
        if (index >= this.ids.length) {
            this.ids.push(id);
            this.list.push(rda.valueRDA.createStore(value));
        } else if (this.ids[index] === id) {
            this.list[index].free(rda.valueRDA);
            this.list[index] = rda.valueRDA.createStore(value);
        } else {
            this.ids.splice(index + 1, 0, id);
            this.list.splice(index + 1, 0, rda.valueRDA.createStore(value));
        }
    }

    private _removeApply (rda:RDA, id:Id) {
        const index = searchId(this.ids, id);
        if (index < this.ids.length && this.ids[index] === id) {
            this.ids.splice(index, 1);
            const store = this.list.splice(index, 1);
            store[0].free(rda.valueRDA);
        }
    }

    private _restoreApply (rda:RDA, id:Id, store:MuRDATypes<RDA['valueRDA']>['serializedStore']) {
        const index = searchId(this.ids, id);
        if (index >= this.ids.length) {
            this.ids.push(id);
            this.list.push(rda.valueRDA.parse(store));
        } else if (this.ids[index] === id) {
            this.list[index].free(rda.valueRDA);
            this.list[index] = rda.valueRDA.parse(store);
        } else {
            this.ids.splice(index + 1, 0, id);
            this.list.splice(index + 1, 0, rda.valueRDA.parse(store));
        }
    }

    public apply (rda:RDA, action:MuRDATypes<RDA>['action']) : boolean {
        if (action.type === 'insert') {
            const items = <RDA['insertSchema']['identity']>action.data;
            for (let i = 0; i < items.length; ++i) {
                const item = items[i];
                this._insertApply(rda, item.id, item.value);
            }
            return true;
        } else if (action.type === 'remove') {
            const items = <RDA['removeSchema']['identity']>action.data;
            for (let i = 0; i < items.length; ++i) {
                const item = items[i];
                this._removeApply(rda, item);
            }
            return true;
        } else if (action.type === 'restore') {
            const items = <RDA['restoreSchema']['identity']>action.data;
            for (let i = 0; i < items.add.length; ++i) {
                this._restoreApply(rda, items.add[i].id, items.add[i].store);
            }
            for (let i = 0; i < items.remove.length; ++i) {
                this._removeApply(rda, items.remove[i]);
            }
            return true;
        } else if (action.type === 'reset') {
            const items = <RDA['storeSchema']['identity']>action.data;
            this.free(rda);
            for (let i = 0; i < items.length; ++i) {
                this._restoreApply(rda, items[i].id, items[i].store);
            }
            return true;
        } else if (action.type === 'update') {
            const input = <MuRDAListTypes<RDA['valueRDA']>['updateAction']>action;
            const index = searchId(this.ids, input.data.id);
            if (index < this.ids.length && this.ids[index] === input.data.id) {
                return this.list[index].apply(rda.valueRDA, input.data.action);
            }
        }
        return false;
    }

    private _insertInverse (rda:RDA, id:Id, inverseAction:MuRDAListTypes<RDA['valueRDA']>['restoreAction']) {
        const index = searchId(this.ids, id);
        if (index < this.ids.length && this.ids[index] === id) {
            const entry = rda.storeEntrySchema.alloc();
            entry.id = id;
            entry.store = this.list[index].serialize(rda.valueRDA, entry.store);
            inverseAction.data.add.push(entry);
        } else {
            inverseAction.data.remove.push(id);
        }
    }

    private _removeInverse (rda:RDA, id:Id, inverseAction:MuRDAListTypes<RDA['valueRDA']>['restoreAction']) {
        const index = searchId(this.ids, id);
        if (index < this.ids.length && this.ids[index] === id) {
            const entry = rda.storeEntrySchema.alloc();
            entry.id = id;
            entry.store = this.list[index].serialize(rda.valueRDA, entry.store);
            inverseAction.data.add.push(entry);
        }
    }

    public inverse (rda:RDA, action:MuRDATypes<RDA>['action']) : MuRDATypes<RDA>['action'] {
        if (action.type === 'insert') {
            const items = <RDA['insertSchema']['identity']>action.data;
            const result = <MuRDAListTypes<RDA['valueRDA']>['restoreAction']>rda.actionSchema.alloc();
            result.type = 'restore';
            for (let i = 0; i < items.length; ++i) {
                const item = items[i];
                this._insertInverse(rda, item.id, result);
            }
            return result;
        } else if (action.type === 'remove') {
            const items = <Id[]>action.data;
            const result = <MuRDAListTypes<RDA['valueRDA']>['restoreAction']>rda.actionSchema.alloc();
            result.type = 'restore';
            for (let i = 0; i < items.length; ++i) {
                this._removeInverse(rda, items[i], result);
            }
            return result;
        } else if (action.type === 'restore') {
            const input = <MuRDAListTypes<RDA['valueRDA']>['restoreAction']>action;
            const result = <MuRDAListTypes<RDA['valueRDA']>['restoreAction']>rda.actionSchema.alloc();
            result.type = 'restore';
            for (let i = 0; i < input.data.add.length; ++i) {
                this._insertInverse(rda, input.data.add[i].id, result);
            }
            for (let i = 0; i < input.data.remove.length; ++i) {
                this._removeInverse(rda, input.data.remove[i], result);
            }
            return result;
        } else if (action.type === 'reset') {
            const result = rda.actionSchema.alloc();
            result.type = 'reset';
            result.data = this.serialize(rda, <MuRDATypes<RDA>['serializedStore']>result.data);
            return result;
        } else if (action.type === 'update') {
            const input = <MuRDAListTypes<RDA['valueRDA']>['updateAction']>action;
            const index = searchId(this.ids, input.data.id);
            if (index < this.ids.length && this.ids[index] === input.data.id) {
                return this.list[index].inverse(rda.valueRDA, input.data.action);
            }
        }
        const noop = rda.actionSchema.alloc();
        noop.type = 'restore';
        noop.data = [];
        return noop;
    }

    public serialize (rda:RDA, out:MuRDATypes<RDA>['serializedStore']) : MuRDATypes<RDA>['serializedStore'] {
        while (out.length > 0) {
            rda.storeEntrySchema.free(<any>out.pop());
        }
        for (let i = 0; i < this.ids.length; ++i) {
            const entry = rda.storeEntrySchema.alloc();
            entry.id = IdSchema.assign(entry.id, this.ids[i]);
            entry.store = this.list[i].serialize(rda.valueRDA, entry.store);
            out.push(entry);
        }
        return out;
    }

    public free (rda:RDA) {
        for (let i = 0; i < this.ids.length; ++i) {
            IdSchema.free(this.ids[i]);
        }
        this.ids.length = 0;
        for (let i = 0; i < this.list.length; ++i) {
            this.list[i].free(rda.valueRDA);
        }
        this.list.length = 0;
    }
}

type WrapAction<Meta, Dispatch> =
    Meta extends { type:'unit' }
        ? Dispatch extends (...args:infer ArgType) => infer RetType
            ?  (...args:ArgType) => {
                    type:'restore';
                    data:{
                        remove:[],
                        add:[],
                    };
                } | {
                    type:'update';
                    data:{
                        id:Id;
                        action:RetType;
                    };
                }
            : never
    : Meta extends { action:MuRDAActionMeta }
        ? Dispatch extends (...args:infer ArgType) => infer RetType
            ? (...args:ArgType) => WrapAction<Meta['action'], RetType>
            : never
    : Meta extends { table:{ [id in keyof Dispatch]:MuRDAActionMeta } }
        ? Dispatch extends { [id in keyof Meta['table']]:any }
            ? { [id in keyof Meta['table']]:WrapAction<Meta['table'][id], Dispatch[id]>; }
            : never
    : never;

type StripBindAndWrap<ValueRDA extends MuRDA<any, any, any, any>> =
    ValueRDA['actionMeta'] extends { type:'store'; action:MuRDAActionMeta; }
        ? ValueRDA['action'] extends (store) => infer RetAction
            ? WrapAction<ValueRDA['actionMeta']['action'], RetAction>
            : never
    : WrapAction<ValueRDA['actionMeta'], ValueRDA['action']>;

export class MuRDAList<RDA extends MuRDA<any, any, any, any>>
    implements MuRDA<
        MuRDAListTypes<RDA>['stateSchema'],
        MuRDAListTypes<RDA>['actionSchema'],
        MuRDAListTypes<RDA>['storeSchema'],
        MuRDAListTypes<RDA>['actionMeta']> {
    public readonly valueRDA:RDA;

    public readonly insertEntrySchema:MuRDAListTypes<RDA>['insertEntrySchema'];
    public readonly insertSchema:MuRDAListTypes<RDA>['insertSchema'];
    public readonly removeSchema:MuRDAListTypes<RDA>['removeSchema'];
    public readonly updateSchema:MuRDAListTypes<RDA>['updateSchema'];
    public readonly restoreSchema:MuRDAListTypes<RDA>['restoreSchema'];

    public readonly stateSchema:MuRDAListTypes<RDA>['stateSchema'];
    public readonly actionSchema:MuRDAListTypes<RDA>['actionSchema'];

    public readonly storeEntrySchema:MuRDAListTypes<RDA>['storeEntrySchema'];
    public readonly storeSchema:MuRDAListTypes<RDA>['storeSchema'];

    public readonly actionMeta:MuRDAListTypes<RDA>['actionMeta'];

    private _savedStore:MuRDAListStore<this> = <any>null;
    private _insert = (index:number, elements:RDA['stateSchema']['identity'][]) : MuRDAListTypes<RDA>['insertAction'] => {
        const pred = index <= 0 ? ID_MIN : this._savedStore.ids[Math.min(this._savedStore.ids.length - 1, index - 1)];
        const succ = index >= this._savedStore.ids.length ? ID_MAX : this._savedStore.ids[Math.max(0, index)];
        const ids = allocIds(pred, succ, elements.length);
        const action = <MuRDAListTypes<RDA>['insertAction']>this.actionSchema.alloc();
        action.type = 'insert';
        const result = action.data = this.insertSchema.alloc();
        result.length = 0;
        for (let i = 0; i < elements.length; ++i) {
            const item = this.insertEntrySchema.alloc();
            item.id = IdSchema.assign(item.id, ids[i]);
            item.value = this.valueRDA.stateSchema.assign(item.value, elements[i]);
            result.push(item);
        }
        IdSetSchema.free(ids);
        return action;
    }
    private _remove = (index:number, count:number=1) : MuRDAListTypes<RDA>['removeAction'] => {
        const action = <MuRDAListTypes<RDA>['removeAction']>this.actionSchema.alloc();
        action.type = 'remove';
        const ids = action.data = this.removeSchema.alloc();
        for (let i = index; i < Math.min(index + count, this._savedStore.ids.length); ++i) {
            ids[i] = this._savedStore.ids[i];
        }
        return action;
    }

    private _savedElement:MuRDATypes<RDA>['store'];
    private _savedUpdateAction:MuRDAListTypes<RDA>['updateAction'];
    private _updateAction;
    private _noopAction;

    private _dispatchers = {
        insert: this._insert,
        remove: this._remove,
        push: (elements:RDA['stateSchema']['identity'][]) : MuRDAListTypes<RDA>['insertAction'] => {
            return this._insert(this._savedStore.ids.length, elements);
        },
        pop: (count:number=1) : MuRDAListTypes<RDA>['removeAction'] => {
            return this._remove(this._savedStore.ids.length - 1, count);
        },
        unshift: (elements:RDA['stateSchema']['identity'][]) : MuRDAListTypes<RDA>['insertAction'] => {
            return this._insert(0, elements);
        },
        shift: (count:number=1) : MuRDAListTypes<RDA>['removeAction'] => {
            return this._remove(0, count);
        },
        clear: () : MuRDAListTypes<RDA>['resetAction'] => {
            const result = <MuRDAListTypes<RDA>['resetAction']>this.actionSchema.alloc();
            result.type = 'reset';
            result.data = this.storeSchema.alloc();
            result.data.length = 0;
            return result;
        },
        reset: (state:RDA['stateSchema']['identity'][]) : MuRDAListTypes<RDA>['resetAction'] => {
            const result = <MuRDAListTypes<RDA>['resetAction']>this.actionSchema.alloc();
            result.type = 'reset';
            result.data = this.storeSchema.alloc();
            result.data.length = 0;
            const ids = initialIds(state.length);
            for (let i = 0; i < state.length; ++i) {
                const entry = this.storeEntrySchema.alloc();
                entry.id = ids[i];
                const store = this.valueRDA.createStore(state[i]);
                store.serialize(this.valueRDA, entry.store);
                store.free(this.valueRDA);
                result.data.push(entry);
            }
            return result;
        },
        update: (index:number) : StripBindAndWrap<RDA> => {
            if (index >= 0 && index < this._savedStore.list.length) {
                this._savedElement = this._savedStore.list[index];
                this._savedUpdateAction = <MuRDAListTypes<RDA>['updateAction']>this.actionSchema.alloc();
                this._savedUpdateAction.type = 'update';
                this._savedUpdateAction.data.id = this._savedStore.ids[index];
                return this._updateAction;
            }
            return this._noopAction;
        },
    };

    constructor (valueRDA:RDA) {
        this.valueRDA = valueRDA;

        this.insertEntrySchema = new MuStruct({
            id: IdSchema,
            value: valueRDA.stateSchema,
        });

        this.stateSchema = new MuArray(valueRDA.stateSchema, Infinity);

        this.storeEntrySchema = new MuStruct({
            id: IdSchema,
            store: valueRDA.storeSchema,
        });
        this.storeSchema = new MuSortedArray(this.storeEntrySchema, Infinity, compareTaggedId);

        this.insertSchema = new MuSortedArray(this.insertEntrySchema, Infinity, compareTaggedId);
        this.removeSchema = new MuSortedArray(IdSchema, Infinity, compareId);
        this.updateSchema = new MuStruct({
            id: IdSchema,
            action: valueRDA.actionSchema,
        });
        this.restoreSchema = new MuStruct({
            add: this.storeSchema,
            remove: this.removeSchema,
        });
        const actionSchema = this.actionSchema = new MuUnion({
            insert: this.insertSchema,
            remove: this.removeSchema,
            restore: this.restoreSchema,
            update: this.updateSchema,
            reset: this.storeSchema,
        });

        function generateNoop (meta:MuRDAActionMeta) {
            if (meta.type === 'unit') {
                return () => {
                    const result = actionSchema.alloc();
                    result.type = 'restore';
                    return result;
                };
            } else if (meta.type === 'partial') {
                const partial = generateNoop(meta.action);
                return () => partial;
            } else if (meta.type === 'table') {
                const table:any = {};
                const ids = Object.keys(meta.table);
                for (let i = 0; i < ids.length; ++i) {
                    table[ids[i]] = generateNoop(meta.table[ids[i]]);
                }
                return table;
            }
            return {};
        }
        this._noopAction = generateNoop(valueRDA.action.type === 'store' ? valueRDA.action.action : valueRDA.action);

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

        function wrapAction (meta, dispatcher) {
            if (meta.type === 'unit') {
                return function (...args) {
                    const tmp = dispatcher.apply(null, args);
                    self._savedUpdateAction.data.action = self.actionSchema.assign(self._savedUpdateAction.data.action, tmp);
                    self.actionSchema.free(tmp);
                    return self._savedUpdateAction;
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

        function wrapStore (meta, dispatcher, index) {
            if (meta.type === 'unit') {
                return (new Function(
                    'rda',
                    'dispatch',
                    `return function () {
                        var tmp = dispatch(rda._savedElement)${index}.apply(null, arguments);
                        rda._savedUpdate.data.action = rda.actionSchema.assign(rda._savedUpdate.data.action, tmp);
                        rda.actionSchema.free(tmp);
                        return rda._savedAction;
                    }`,
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

        this._updateAction = valueRDA.actionMeta.type === 'store'
            ? wrapStore(valueRDA.actionMeta, valueRDA.action, '')
            : wrapAction(valueRDA.actionMeta, valueRDA.action);
    }

    public action(store:MuRDAListStore<this>) {
        this._savedStore = store;
        return this._dispatchers;
    }

    public createStore (initialState:MuRDAListTypes<RDA>['state']) : MuRDAListStore<this> {
        return new MuRDAListStore(
            initialIds(initialState.length),
            initialState.map((state) => <MuRDATypes<RDA>['store']>this.valueRDA.createStore(state)));
    }

    public parse (store:MuRDAListTypes<RDA>['store']) : MuRDAListStore<this> {
        const ids:Id[] = new Array(store.length);
        const list:MuRDATypes<RDA>['store'][] = new Array(store.length);
        for (let i = 0; i < store.length; ++i) {
            ids[i] = IdSchema.clone(store[i].id);
            list[i] = <MuRDATypes<RDA>['store']>this.valueRDA.parse(store[i].store);
        }
        return new MuRDAListStore<this>(ids, list);
    }
}
