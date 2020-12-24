import { MuArray } from '../schema/array';
import { MuStruct } from '../schema/struct';
import { MuSortedArray } from '../schema/sorted-array';
import { MuVarint, MuASCII, MuBoolean } from '../schema';
import { MuRDA, MuRDATypes, MuRDAStore, MuRDAActionMeta } from './rda';
import { allocIds, ID_MIN, ID_MAX } from './_id';

function compareKey (a, b) {
    return a.key < b.key ? -1 : (a.key > b.key ? 1 : (a.id - b.id));
}

function compareNum (a:number, b:number) {
    return a - b;
}

export interface MuRDAListTypes<RDA extends MuRDA<any, any, any, any>> {
    stateSchema:MuArray<RDA['stateSchema']>;
    state:MuRDAListTypes<RDA>['stateSchema']['identity'];

    storeElementSchema:MuStruct<{
        id:MuVarint;
        deleted:MuBoolean;
        key:MuASCII;
        value:RDA['storeSchema'];
    }>;
    storeSchema:MuSortedArray<MuRDAListTypes<RDA>['storeElementSchema']>;
    store:MuRDAListTypes<RDA>['storeSchema']['identity'];

    moveActionSchema:MuStruct<{
        id:MuVarint;
        key:MuASCII;
    }>;
    updateActionSchema:MuStruct<{
        id:MuVarint;
        action:RDA['actionSchema'];
    }>;
    actionSchema:MuStruct<{
        upserts:MuRDAListTypes<RDA>['storeSchema'];
        deletes:MuSortedArray<MuVarint>;
        undeletes:MuSortedArray<MuVarint>;
        moves:MuArray<MuRDAListTypes<RDA>['moveActionSchema']>;
        updates:MuArray<MuRDAListTypes<RDA>['updateActionSchema']>;
    }>;
    action:MuRDAListTypes<RDA>['actionSchema']['identity'];

    actionMeta:{
        type:'store';
        action:{
            type:'table';
            table:{
                push:{ type:'unit'; };
                pop:{ type:'unit'; };
                shift:{ type:'unit'; };
                unshift:{ type:'unit'; };
                splice:{ type:'unit'; };
                clear:{ type:'unit'; };
                reset:{ type:'unit'; };
                swap:{ type:'unit'; };
                reverse:{ type:'unit'; };
                sort:{ type:'unit'; };
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

export class MuRDAListStoreElement<ListRDA extends MuRDAList<any>> {
    constructor (
        public id:number,
        public deleted:boolean,
        public key:string,
        public value:MuRDATypes<ListRDA['valueRDA']>['store'],
    ) {}
}

export class MuRDAListStore<ListRDA extends MuRDAList<any>> implements MuRDAStore<ListRDA> {
    public idIndex:{ [id:string]:MuRDAListStoreElement<ListRDA> } = {};
    public listIndex:MuRDAListStoreElement<ListRDA>[] = [];

    private _rebuildListIndex () {
        const list = this.listIndex;
        list.length = 0;

        const idIndex = this.idIndex;
        const ids = Object.keys(idIndex);
        for (let i = 0; i < ids.length; ++i) {
            const element = idIndex[ids[i]];
            if (!element.deleted) {
                list.push(element);
            }
        }

        list.sort(compareKey);

        let ptr = 0;
        for (let i = 0; i < list.length; ) {
            const node = list[i++];
            list[ptr++] = node;
            while (i < list.length && list[i].key === node.key) {
                ++i;
            }
        }
        list.length = ptr;
    }

    constructor (elements:MuRDAListStoreElement<ListRDA>[]) {
        const idIndex = this.idIndex;
        for (let i = 0; i < elements.length; ++i) {
            const element = elements[i];
            idIndex[element.id] = element;
        }
        this._rebuildListIndex();
    }

    public state(rda:ListRDA, out:MuRDATypes<ListRDA>['state']) : MuRDATypes<ListRDA>['state'] {
        const stateSchema = rda.valueRDA.stateSchema;
        const listIndex = this.listIndex;
        while (out.length > listIndex.length) {
            stateSchema.free(<any>out.pop());
        }
        while (out.length < listIndex.length) {
            out.push(stateSchema.alloc());
        }
        for (let i = 0; i < listIndex.length; ++i) {
            out[i] = listIndex[i].value.state(rda.valueRDA, out[i]);
        }
        return out;
    }

    public apply (rda:ListRDA, action:ListRDA['actionSchema']['identity']) : boolean {
        const {
            upserts,
            deletes,
            undeletes,
            moves,
            updates,
        } = action;
        const idIndex = this.idIndex;

        for (let i = 0; i < upserts.length; ++i) {
            const upsert = upserts[i];
            const prev = idIndex[upsert.id];
            if (prev) {
                prev.deleted = upsert.deleted;
                prev.key = upsert.key;
                prev.value.free(rda.valueRDA);
                prev.value = rda.valueRDA.parse(upsert.value);
            } else {
                const element = new MuRDAListStoreElement<ListRDA>(
                    upsert.id,
                    upsert.deleted,
                    upsert.key,
                    rda.valueRDA.parse(upsert.value),
                );
                idIndex[element.id] = element;
            }
        }

        for (let i = 0; i < deletes.length; ++i) {
            const prev = idIndex[deletes[i]];
            if (prev && !prev.deleted) {
                prev.deleted = true;
            }
        }

        for (let i = 0; i < undeletes.length; ++i) {
            const prev = idIndex[undeletes[i]];
            if (prev && prev.deleted) {
                prev.deleted = false;
            }
        }

        for (let i = 0; i < moves.length; ++i) {
            const { id, key } = moves[i];
            const prev = idIndex[id];
            if (prev) {
                prev.key = key;
            }
        }

        for (let i = 0; i < updates.length; ++i) {
            const update = updates[i];
            const prev = idIndex[update.id];
            if (prev) {
                prev.value.apply(rda.valueRDA, update.action);
            }
        }

        if (upserts.length > 0 ||
            deletes.length > 0 ||
            undeletes.length > 0 ||
            moves.length > 0) {
            this._rebuildListIndex();
        }

        return true;
    }

    public inverse (rda:ListRDA, action:ListRDA['actionSchema']['identity']) : MuRDATypes<ListRDA>['action'] {
        const result = rda.actionSchema.alloc();
        const {
            upserts,
            deletes,
            undeletes,
            moves,
            updates,
        } = action;
        const idIndex = this.idIndex;

        for (let i = 0; i < upserts.length; ++i) {
            const upsert = upserts[i];
            const prev = idIndex[upsert.id];
            if (prev) {
                const inverseUpsert = rda.storeElementSchema.alloc();
                inverseUpsert.id = prev.id;
                inverseUpsert.deleted = prev.deleted;
                inverseUpsert.key = prev.key;
                inverseUpsert.value = prev.value.serialize(rda.valueRDA, inverseUpsert.value);
                result.upserts.push(inverseUpsert);
            } else {
                const inverseUpsert = rda.storeElementSchema.clone(rda.storeElementSchema.identity);
                inverseUpsert.id = upsert.id;
                result.upserts.push(inverseUpsert);
            }
        }
        result.upserts.sort(rda.storeSchema.compare);

        for (let i = 0; i < deletes.length; ++i) {
            const id = deletes[i];
            const prev = idIndex[id];
            if (prev && !prev.deleted) {
                result.undeletes.push(id);
            }
        }
        result.undeletes.sort(compareNum);

        for (let i = 0; i < undeletes.length; ++i) {
            const id = undeletes[i];
            const prev = idIndex[id];
            if (prev && prev.deleted) {
                result.deletes.push(id);
            }
        }
        result.deletes.sort(compareNum);

        for (let i = moves.length - 1; i >= moves.length; --i) {
            const { id, key } = moves[i];
            const prev = idIndex[id];
            if (prev && prev.key !== key) {
                const inverseMove = rda.moveActionSchema.alloc();
                inverseMove.id = id;
                inverseMove.key = prev.key;
            }
        }

        for (let i = updates.length - 1; i >= 0; --i) {
            const update = updates[i];
            const prev = idIndex[update.id];
            if (prev) {
                const inverseUpdate = rda.updateActionSchema.alloc();
                inverseUpdate.id = update.id;
                rda.valueRDA.actionSchema.free(inverseUpdate.action);
                inverseUpdate.action = prev.value.inverse(rda.valueRDA, update.action);
                result.updates.push(inverseUpdate);
            }
        }

        return result;
    }

    public serialize (rda:ListRDA, out:MuRDATypes<ListRDA>['serializedStore']) : MuRDATypes<ListRDA>['serializedStore'] {
        const idIndex = this.idIndex;
        const ids = Object.keys(idIndex);
        while (out.length < ids.length) {
            out.push(rda.storeElementSchema.alloc());
        }
        while (ids.length < out.length) {
            rda.storeElementSchema.free(<any>out.pop());
        }
        for (let i = 0; i < ids.length; ++i) {
            const element = idIndex[ids[i]];
            const store = out[i];
            store.id = element.id;
            store.key = element.key;
            store.deleted = element.deleted;
            store.value = element.value.serialize(rda.valueRDA, store.value);
        }
        return out;
    }

    public free (rda:ListRDA) {
        const ids = Object.keys(this.idIndex);
        for (let i = 0; i < ids.length; ++i) {
            const node = this.idIndex[ids[i]];
            node.value.free(rda.valueRDA);
        }
        this.idIndex = {};
        this.listIndex.length = 0;
    }

    public genId (upserts:ListRDA['storeSchema']['identity']) {
        let shift = 0;
        searchLoop: while (true) {
            shift = Math.min(30, shift + 7);
            const id = (Math.random() * (1 << shift)) >>> 0;
            for (let i = 0; i < upserts.length; ++i) {
                if (upserts[i].id === id) {
                    continue searchLoop;
                }
            }
            if (!this.idIndex[id]) {
                return id;
            }
        }
    }
}

type WrapAction<Meta, Dispatch> =
    Meta extends { type:'unit' }
        ? Dispatch extends (...args:infer ArgType) => infer RetType
            ?  (...args:ArgType) => {
                    upserts:{
                        id:number;
                        key:string;
                        deleted:boolean;
                        value:any;
                    }[];
                    deletes:number[];
                    undeletes:number[];
                    moves:{
                        id:number;
                        key:string;
                    }[];
                    updates:{
                        id:number;
                        action:RetType;
                    }[];
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

type StripStoreThenWrapAction<ValueRDA extends MuRDA<any, any, any, any>> =
    ValueRDA['actionMeta'] extends { type:'store'; action:MuRDAActionMeta; }
        ? ValueRDA['action'] extends (store) => infer RetAction
            ? WrapAction<ValueRDA['actionMeta']['action'], RetAction>
            : never
    : WrapAction<ValueRDA['actionMeta'], ValueRDA['action']>;

export class MuRDAList<ValueRDA extends MuRDA<any, any, any, any>>
    implements MuRDA<
        MuRDAListTypes<ValueRDA>['stateSchema'],
        MuRDAListTypes<ValueRDA>['actionSchema'],
        MuRDAListTypes<ValueRDA>['storeSchema'],
        MuRDAListTypes<ValueRDA>['actionMeta']> {
    public readonly valueRDA:ValueRDA;

    public readonly stateSchema:MuRDAListTypes<ValueRDA>['stateSchema'];
    public readonly storeElementSchema:MuRDAListTypes<ValueRDA>['storeElementSchema'];
    public readonly storeSchema:MuRDAListTypes<ValueRDA>['storeSchema'];

    public readonly moveActionSchema:MuRDAListTypes<ValueRDA>['moveActionSchema'];
    public readonly updateActionSchema:MuRDAListTypes<ValueRDA>['updateActionSchema'];
    public readonly actionSchema:MuRDAListTypes<ValueRDA>['actionSchema'];

    public readonly actionMeta:MuRDAListTypes<ValueRDA>['actionMeta'];

    public readonly emptyStore:MuRDAListStore<this>;

    private _savedStore:MuRDAListStore<this> = <any>null;
    private _savedElement:ValueRDA['emptyStore'] = <any>null;
    private _savedAction:MuRDAListTypes<ValueRDA>['actionSchema']['identity'] = <any>null;
    private _savedUpdate:MuRDAListTypes<ValueRDA>['updateActionSchema']['identity'] = <any>null;
    private _updateDispatcher;
    private _noopDispatcher;

    private _dispatchSplice (start_:number, deleteCount_:number, items:ValueRDA['stateSchema']['identity'][]) {
        const result = this.actionSchema.alloc();

        const list = this._savedStore.listIndex;
        const start = Math.max(0, Math.min(list.length, start_ | 0));
        const end = Math.min(list.length, start + Math.max(0, (deleteCount_ | 0)));

        for (let i = start; i < end; ++i) {
            result.deletes.push(list[i].id);
        }

        if (items.length > 0) {
            const startKey = start - 1 >= 0 ? list[start - 1].key : ID_MIN;
            const endKey = end < list.length ? list[end].key : ID_MAX;
            const keys = allocIds(startKey, endKey, items.length);

            for (let i = 0; i < items.length; ++i) {
                const upsert = this.storeElementSchema.alloc();

                upsert.id = this._savedStore.genId(result.upserts);
                upsert.key = keys[i];
                upsert.deleted = false;

                const store = this.valueRDA.createStore(items[i]);
                upsert.value = store.serialize(this.valueRDA, upsert.value);
                store.free(this.valueRDA);

                result.upserts.push(upsert);
            }
        }

        return result;
    }

    private _dispatchers = {
        update: (index:number) : StripStoreThenWrapAction<ValueRDA> => {
            const list = this._savedStore.listIndex;
            if ((index === (index | 0)) && 0 <= index && index < list.length) {
                const element = list[index];
                if (element) {
                    this._savedElement = element.value;
                    const action = this._savedAction = this.actionSchema.clone(this.actionSchema.identity);
                    const update = this._savedUpdate = this.updateActionSchema.alloc();
                    update.id = element.id;
                    this.valueRDA.actionSchema.free(update.action);
                    action.updates.push(update);
                    return this._updateDispatcher;
                }
            }
            return this._noopDispatcher;
        },
        push: (...elements:ValueRDA['stateSchema']['identity'][]) => this._dispatchSplice(this._savedStore.listIndex.length, 0, elements),
        pop: (count:number = 1) => this._dispatchSplice(Math.max(this._savedStore.listIndex.length - count), count, []),
        unshift: (...elements:ValueRDA['stateSchema']['identity'][]) => this._dispatchSplice(0, 0, elements),
        shift: (count:number = 1) => this._dispatchSplice(0, count, []),
        splice: (start:number, deleteCount:number=0, ...elements:ValueRDA['stateSchema']['identity'][]) => this._dispatchSplice(start, deleteCount, elements),
        clear: () => this._dispatchSplice(0, this._savedStore.listIndex.length, []),
        reset: (elements:ValueRDA['stateSchema']['identity'][]) => this._dispatchSplice(0, this._savedStore.listIndex.length, elements),
        swap: (...cycle:number[]) => {
            const result = this.actionSchema.alloc();
            const list = this._savedStore.listIndex;
            for (let i = 0; i < cycle.length; ++i) {
                if (!list[cycle[i]]) {
                    return result;
                }
            }
            for (let i = 0; i < cycle.length; ++i) {
                const a = list[cycle[i]];
                const b = list[cycle[(i + 1) % cycle.length]];
                const move = this.moveActionSchema.alloc();
                move.id = a.id;
                move.key = b.key;
                result.moves.push(move);
            }
            return result;
        },
        reverse: () => {
            const list = this._savedStore.listIndex;
            const result = this.actionSchema.alloc();
            for (let i = 0; i < list.length; ++i) {
                const move = this.moveActionSchema.alloc();
                move.id = list[i].id;
                move.key = list[list.length - 1 - i].key;
                result.moves.push(move);
            }
            return result;
        },
        sort: (compare:(a:ValueRDA['stateSchema']['identity'], b:ValueRDA['stateSchema']['identity']) => number) => {
            const list = this._savedStore.listIndex;
            const tagged = list.map((element) => {
                return {
                    element: element,
                    state: element.value.state(this.valueRDA, this.valueRDA.stateSchema.alloc()),
                };
            });
            tagged.sort((a, b) => compare(a.state, b.state));
            const result = this.actionSchema.alloc();
            for (let i = 0; i < tagged.length; ++i) {
                const a = list[i];
                const b = tagged[i].element;
                if (a !== b) {
                    const move = this.moveActionSchema.alloc();
                    move.id = b.id;
                    move.key = a.key;
                    result.moves.push(move);
                }
                this.valueRDA.stateSchema.free(tagged[i].state);
            }
            return result;
        },
    };

    constructor (valueRDA:ValueRDA) {
        this.valueRDA = valueRDA;

        this.stateSchema = new MuArray(valueRDA.stateSchema, Infinity);

        this.storeElementSchema = new MuStruct({
            id: new MuVarint(),
            deleted: new MuBoolean(true),
            key: new MuASCII(),
            value: valueRDA.storeSchema,
        });
        this.storeSchema = new MuSortedArray(this.storeElementSchema, Infinity, compareKey);

        this.updateActionSchema = new MuStruct({
            id: new MuVarint(),
            action: valueRDA.actionSchema,
        });
        this.moveActionSchema = new MuStruct({
            id: new MuVarint(),
            key: new MuASCII(),
        });
        const actionSchema = this.actionSchema = new MuStruct({
            upserts: this.storeSchema,
            deletes: new MuSortedArray(new MuVarint(), Infinity, compareNum),
            undeletes: new MuSortedArray(new MuVarint(), Infinity, compareNum),
            moves: new MuArray(this.moveActionSchema, Infinity),
            updates: new MuArray(this.updateActionSchema, Infinity),
        });

        this.actionMeta = {
            type: 'store',
            action: {
                type: 'table',
                table: {
                    push:{ type:'unit' },
                    pop:{ type:'unit' },
                    shift:{ type:'unit' },
                    unshift:{ type:'unit' },
                    splice:{ type:'unit' },
                    clear:{ type:'unit' },
                    reset:{ type:'unit' },
                    swap:{ type:'unit' },
                    reverse:{ type:'unit' },
                    sort:{ type:'unit' },
                    update:{
                        type:'partial',
                        action:
                            valueRDA.actionMeta.type === 'store'
                                ? valueRDA.actionMeta.action
                                : valueRDA.actionMeta,
                    },
                },
            },
        };

        function generateNoop (meta:MuRDAActionMeta) {
            if (meta.type === 'unit') {
                return () => actionSchema.clone(actionSchema.identity);
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
        this._noopDispatcher = generateNoop(valueRDA.action.type === 'store' ? valueRDA.action.action : valueRDA.action);

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

        function wrapStore (meta, dispatcher, index) {
            if (meta.type === 'unit') {
                return (new Function(
                    'rda',
                    'dispatch',
                    `return function () {
                        rda._savedUpdate.action = dispatch(rda._savedElement)${index}.apply(null, arguments);
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

        if (valueRDA.actionMeta.type === 'store') {
            this._updateDispatcher = wrapStore(valueRDA.actionMeta.action, valueRDA.action, '');
        } else {
            this._updateDispatcher = wrapAction(valueRDA.actionMeta, valueRDA.action);
        }

        this.emptyStore = new MuRDAListStore([]);
    }

    public readonly action = (store:MuRDAListStore<this>) => {
        this._savedStore = store;
        return this._dispatchers;
    }

    public createStore (initialState:MuRDAListTypes<ValueRDA>['state']) : MuRDAListStore<this> {
        const nodes:MuRDAListStoreElement<this>[] = new Array(initialState.length);
        const keys = allocIds(ID_MIN, ID_MAX, initialState.length);
        for (let i = 0; i < nodes.length; ++i) {
            nodes[i] = new MuRDAListStoreElement<this>(
                i + 1,
                false,
                keys[i],
                this.valueRDA.createStore(initialState[i]),
            );
        }
        return new MuRDAListStore<this>(nodes);
    }

    public parse (store:MuRDAListTypes<ValueRDA>['store']) : MuRDAListStore<this> {
        const nodes:MuRDAListStoreElement<this>[] = new Array(store.length);
        for (let i = 0; i < store.length; ++i) {
            const element = store[i];
            nodes[i] = new MuRDAListStoreElement<this>(
                element.id,
                element.deleted,
                element.key,
                this.valueRDA.parse(element.value));
        }
        return new MuRDAListStore<this>(nodes);
    }
}
