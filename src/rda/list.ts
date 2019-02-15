import { MuRDA, MuRDATypes, MuRDAStore } from './rda';
import { MuArray } from '../schema/array';
import { MuUnion } from '../schema/union';
import { MuStruct } from '../schema/struct';
import { MuVoid } from '../schema/void';
import { MuSortedArray } from '../schema/sorted-array';
import { IdSchema, Id, compareId, compareTaggedId, allocIds, ID_MIN, ID_MAX, predecessorId, initialIds } from './_id';

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
    restoreEntrySchema:MuStruct<{
        id:typeof IdSchema;
        store:RDA['storeSchema'];
    }>;
    actionSchema:MuUnion<{
        insert:MuRDAListTypes<RDA>['insertSchema'];
        remove:MuRDAListTypes<RDA>['removeSchema'];
        update:MuRDAListTypes<RDA>['updateSchema'];
        restore:MuRDAListTypes<RDA>['storeSchema'];
        reset:MuRDAListTypes<RDA>['storeSchema'];
        noop:MuVoid;
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
        data:MuRDAListTypes<RDA>['storeSchema']['identity'];
    };
    resetAction:{
        type:'reset';
        data:MuRDAListTypes<RDA>['store'];
    };
    noopAction:{
        type:'noop';
    };

    storeSchema:MuSortedArray<MuRDAListTypes<RDA>['restoreEntrySchema']>;
    store:MuRDAListTypes<RDA>['storeSchema']['identity'];

    actionMeta:{
        type:'store';
        action:{
            type:'table';
            table:{
                insert:{ type:'unit'; };
                remove:{ type:'unit'; };
                /*
                push:{ type:'unit'; };
                pop:{ type:'unit'; };
                shift:{ type:'unit'; };
                unshift:{ type:'unit'; };
                clear:{ type:'unit'; };
                reset:{ type:'unit'; };
                splice:{ type:'unit'; };
                update:{
                    type:'partial';
                    action:
                        RDA['actionMeta'] extends { type:'store'; action:MuRDAActionMeta; }
                            ? RDA['actionMeta']['action']
                            : RDA['actionMeta'];
                };
                */
            }
        };
    };
}

export class MuRDAListStore<RDA extends MuRDAList<any>> implements MuRDAStore<RDA> {
    public ids:Id[];
    public list:MuRDATypes<RDA['valueRDA']>['store'][];

    public idRank (id:Id) : number {
        return predecessorId(this.ids, id);
    }

    public idPred (index:number) : Id {
        if (index <= 0) {
            return ID_MIN;
        }
        return IdSchema.clone(this.ids[Math.min(this.ids.length - 1, index - 1)]);
    }

    public idSucc (index:number) : Id {
        if (index >= this.ids.length - 1) {
            return ID_MAX;
        }
        return IdSchema.clone(this.ids[Math.max(0, index)]);
    }

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
            out.push(stateSchema.clone(this.list[i]));
        }
        return out;
    }

    public apply (rda:RDA, action:MuRDATypes<RDA>['action']) : boolean {
        if (action.type === 'insert') {
        } else if (action.type === 'remove') {
            // do an O(n) scan of the ids/list

        } else if (action.type === 'update') {

        } else if (action.type === 'restore') {

        } else if (action.type === 'reset') {

        } else if (action.type === 'noop') {
            return true;
        }
        return false;
    }

    public inverse (rda:RDA, action:MuRDATypes<RDA>['action']) : MuRDATypes<RDA>['action'] {
        if (action.type === 'insert') {

        } else if (action.type === 'remove') {

        } else if (action.type === 'update') {

        } else if (action.type === 'restore') {

        } else if (action.type === 'reset') {

        }

        const noop = rda.actionSchema.alloc();
        noop.type = 'noop';
        return noop;
    }

    public serialize (rda:RDA, out:MuRDATypes<RDA>['serializedStore']) : MuRDATypes<RDA>['serializedStore'] {
        while (out.length > 0) {
            rda.restoreEntrySchema.free(<any>out.pop());
        }
        for (let i = 0; i < this.ids.length; ++i) {
            const entry = rda.restoreEntrySchema.alloc();
            entry.id = IdSchema.assign(entry.id, this.ids[i]);
            entry.store = this.list[i].store(rda.valueRDA.rda, entry.store);
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
    public readonly restoreEntrySchema:MuRDAListTypes<RDA>['restoreEntrySchema'];

    public readonly stateSchema:MuRDAListTypes<RDA>['stateSchema'];
    public readonly actionSchema:MuRDAListTypes<RDA>['actionSchema'];
    public readonly storeSchema:MuRDAListTypes<RDA>['storeSchema'];

    public readonly actionMeta:MuRDAListTypes<RDA>['actionMeta'];

    private _savedStore:MuRDAListStore<this> = <any>null;
    private _dispatchers = {
        insert: (index:number, elements:RDA['stateSchema']['identity'][]) : MuRDAListTypes<RDA>['insertAction'] => {
            const pred = this._savedStore.idPred(index);
            const succ = this._savedStore.idSucc(index);
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
            return action;
        },
        remove: (index:number, count:number=1) : MuRDAListTypes<RDA>['removeAction'] => {
            const action = <MuRDAListTypes<RDA>['removeAction']>this.actionSchema.alloc();
            action.type = 'remove';
            const ids = action.data = this.removeSchema.alloc();
            for (let i = 0; i < count; ++i) {
                ids[i] = this._savedStore.idSucc(index + i);
            }
            return action;
        },
    };

    constructor (valueRDA:RDA) {
        this.valueRDA = valueRDA;

        this.insertEntrySchema = new MuStruct({
            id: IdSchema,
            value: valueRDA.stateSchema,
        });
        this.insertSchema = new MuSortedArray(this.insertEntrySchema, Infinity, compareTaggedId);
        this.removeSchema = new MuSortedArray(IdSchema, Infinity, compareId);
        this.updateSchema = new MuStruct({
            id: IdSchema,
            action: valueRDA.actionSchema,
        });
        this.restoreEntrySchema = new MuStruct({
            id: IdSchema,
            store: valueRDA.storeSchema,
        });

        this.stateSchema = new MuArray(valueRDA.stateSchema, Infinity);
        this.storeSchema = new MuSortedArray(this.restoreEntrySchema, Infinity, compareTaggedId);
        this.actionSchema = new MuUnion({
            insert: this.insertSchema,
            remove: this.removeSchema,
            update: this.updateSchema,
            restore: this.storeSchema,
            reset: this.storeSchema,
            noop: new MuVoid(),
        });
    }

    public action(store:MuRDAListStore<this>) {
        this._savedStore = store;
        return this._dispatchers;
    }

    public store (initialState:MuRDAListTypes<RDA>['state']) : MuRDAListStore<this> {
        return new MuRDAListStore(
            initialIds(initialState.length),
            initialState.map((state) => <MuRDATypes<RDA>['store']>this.valueRDA.store(state)));
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