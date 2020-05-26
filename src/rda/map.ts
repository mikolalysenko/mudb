import { MuSchema } from '../schema/schema';
import { MuDictionary } from '../schema/dictionary';
import { MuStruct } from '../schema/struct';
import { MuUnion } from '../schema/union';
import { MuSortedArray } from '../schema/sorted-array';
import { MuVoid } from '../schema/void';
import { MuVarint } from '../schema/varint';
import { MuBoolean } from '../schema/boolean';
import { MuRDA, MuRDAActionMeta, MuRDABindableActionMeta, MuRDAStore, MuRDATypes } from './rda';
import { MuArray } from '../schema';

function compareKey (a:string, b:string) {
    return a < b ? -1 : (b < a ? 1 : 0);
}

function compareStoreElements<T extends MuRDAMapStoreElement<any>> (a:T, b:T) {
    return (
        a.sequence - b.sequence ||
        a.id - b.id
    );
}

function compareNum (a:number, b:number) {
    return a - b;
}

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

    upsertActionSchema:MuRDAMapTypes<KeySchema, ValueRDA>['storeElementSchema'];
    resetActionSchema:MuStruct<{
        upserts:MuRDAMapTypes<KeySchema, ValueRDA>['storeSchema'];
        deletes:MuSortedArray<MuVarint>;
        undeletes:MuSortedArray<MuVarint>;
        sequenceIds:MuArray<MuVarint>;
        sequenceVals:MuArray<MuVarint>;
    }>;
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
        sequence:MuVarint;
        deleted:MuBoolean;
    }>;

    actionSchema:MuUnion<{
        reset:MuRDAMapTypes<KeySchema, ValueRDA>['resetActionSchema'];
        upsert:MuRDAMapTypes<KeySchema, ValueRDA>['upsertActionSchema'];
        update:MuRDAMapTypes<KeySchema, ValueRDA>['updateActionSchema'];
        move:MuRDAMapTypes<KeySchema, ValueRDA>['moveActionSchema'];
        setDeleted:MuRDAMapTypes<KeySchema, ValueRDA>['setDeletedActionSchema'];
        noop:MuVoid;
    }>;
    action:MuRDAMapTypes<KeySchema, ValueRDA>['actionSchema']['identity'];
    resetAction:{
        type:'reset';
        data:MuRDAMapTypes<KeySchema, ValueRDA>['resetActionSchema']['identity'];
    };
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

export class MuRDAMapStoreElement<MapRDA extends MuRDAMap<any, any>> {
    constructor (
        public id:number,
        public sequence:number,
        public deleted:boolean,
        public key:MapRDA['keySchema']['identity'],
        public value:MuRDATypes<MapRDA['valueRDA']>['store'],
    ) {}

    // currently a linked list, though this should probably be replaced by a pairing heap to prevent adversarial attacks
    public next:this|null = null;
    public prev:this|null = null;
}

export class MuRDAMapStore<MapRDA extends MuRDAMap<any, any>> implements MuRDAStore<MapRDA> {
    public keyIndex:{ [key:string]:MuRDAMapStoreElement<MapRDA>; } = {};
    public idIndex:{ [id:string]:MuRDAMapStoreElement<MapRDA>; } = {};

    constructor (elements:MuRDAMapStoreElement<MapRDA>[]) {
        const { idIndex } = this;
        for (let i = 0; i < elements.length; ++i) {
            const element = elements[i];
            const id = element.id;
            idIndex[id] = element;
            this._insertElement(element);
        }
    }

    public state(rda:MapRDA, out:MuRDATypes<MapRDA>['state']) : MuRDATypes<MapRDA>['state'] {
        const keyIndex = this.keyIndex;
        const outKeys = Object.keys(out);
        for (let i = 0; i < outKeys.length; ++i) {
            const key = outKeys[i];
            const cur = keyIndex[key];
            if (!cur || cur.deleted) {
                rda.valueRDA.stateSchema.free(out[key]);
                delete out[key];
            }
        }
        const keys = Object.keys(keyIndex);
        const valueRDA = rda.valueRDA;
        const valueSchema = valueRDA.stateSchema;
        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            const final = keyIndex[key];
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

        // remove from list
        const { next, prev, sequence } = element;
        if (this.keyIndex[element.key] === element) {
            if (next) {
                this.keyIndex[element.key] = next;
                if (next.sequence >= sequence) {
                    next.deleted = false;
                }
            } else {
                delete this.keyIndex[element.key];
            }
        }
        if (next) {
            next.prev = prev;
        }
        if (prev) {
            prev.next = next;
        }
        element.next = element.prev = null;

        // insert into new bucket
        element.key = key;
        this._insertElement(element);
    }

    private _insertElement (element:MuRDAMapStoreElement<MapRDA>) {
        const key = element.key;
        const head = this.keyIndex[key];
        if (head) {
            // insert into list
            if (compareStoreElements(head, element) < 0) {
                element.next = head;
                head.prev = element;
                head.deleted = true;
                this.keyIndex[key] = element;
            } else {
                let prev = head;
                while (prev) {
                    const next = prev.next;
                    if (!next) {
                        prev.next = element;
                        element.prev = prev;
                        break;
                    } else if (compareStoreElements(next, element) < 0) {
                        prev.next = element;
                        next.prev = element;
                        element.next = next;
                        element.prev = prev;
                        break;
                    }
                    prev = next;
                }
            }
        } else {
            this.keyIndex[key] = element;
        }
    }

    private _applyUpsert (valueRDA:MapRDA['valueRDA'], upsertAction:MapRDA['upsertActionSchema']['identity']) {
        const prev = this.idIndex[upsertAction.id];
        if (prev) {
            prev.id = upsertAction.id;
            prev.deleted = upsertAction.deleted;
            prev.sequence = upsertAction.sequence;
            prev.value.free(valueRDA);
            prev.value = valueRDA.parse(upsertAction.value);
            this._moveElement(prev, upsertAction.key);
        } else {
            const element = new MuRDAMapStoreElement<MapRDA>(
                upsertAction.id,
                upsertAction.sequence,
                upsertAction.deleted,
                upsertAction.key,
                valueRDA.parse(upsertAction.value));
            this.idIndex[element.id] = element;
            this._insertElement(element);
        }
    }

    public apply(rda:MapRDA, action:MuRDATypes<MapRDA>['action']) : boolean {
        const { type, data } = action;
        if (type === 'reset') {
            const { upserts, deletes, undeletes, sequenceIds, sequenceVals } = <MapRDA['resetActionSchema']['identity']>data;
            for (let i = 0; i < upserts.length; ++i) {
                this._applyUpsert(rda.valueRDA, upserts[i]);
            }
            for (let i = 0; i < deletes.length; ++i) {
                const element = this.idIndex[deletes[i]];
                if (element) {
                    element.deleted = true;
                }
            }
            for (let i = 0; i < undeletes.length; ++i) {
                const element = this.idIndex[undeletes[i]];
                if (element) {
                    element.deleted = false;
                }
            }
            if (sequenceVals.length === sequenceIds.length) {
                for (let i = 0; i < sequenceIds.length; ++i) {
                    const element = this.idIndex[sequenceIds[i]];
                    if (element) {
                        element.sequence = sequenceVals[i];
                    }
                }
            }
            return true;
        } else if (type === 'upsert') {
            const upsertAction = <MapRDA['upsertActionSchema']['identity']>data;
            this._applyUpsert(rda.valueRDA, upsertAction);
            return true;
        } else if (type === 'update') {
            const updateAction = <MapRDA['updateActionSchema']['identity']>data;
            const element = this.idIndex[updateAction.id];
            if (!element) {
                return false;
            }
            return element.value.apply(rda.valueRDA, updateAction.action);
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
            element.sequence = setDeletedAction.sequence;
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
        if (type === 'reset') {
            result.type = 'reset';
            const { upserts, deletes, undeletes, sequenceIds, sequenceVals } = <MapRDA['resetActionSchema']['identity']>data;
            const inverseReset = result.data = rda.resetActionSchema.clone(rda.resetActionSchema.identity);

            // first compute inverse userts
            const inverseUndelete = inverseReset.undeletes;
            const inverseDelete = inverseReset.deletes;
            const inverseUpsert = inverseReset.upserts;
            const invserseSequenceIds = inverseReset.sequenceIds;
            const invserseSequenceVals = inverseReset.sequenceVals;

            for (let i = 0; i < upserts.length; ++i) {
                const upsertAction = upserts[i];
                const id = upsertAction.id;
                const prev = this.idIndex[id];
                if (prev) {
                    const inverseUpsertAction = rda.upsertActionSchema.alloc();
                    inverseUpsertAction.id = id;
                    inverseUpsertAction.key = prev.key;
                    inverseUpsertAction.deleted = prev.deleted;
                    inverseUpsertAction.sequence = prev.sequence;
                    inverseUpsertAction.value = prev.value.serialize(rda.valueRDA, inverseUpsertAction.value);
                    inverseUpsert.push(inverseUpsertAction);
                } else {
                    inverseDelete.push(id);
                    invserseSequenceIds.push(id);
                    invserseSequenceVals.push(0);
                }
            }
            inverseUpsert.sort(rda.storeSchema.compare);

            // compute inverse deletes
            for (let i = 0; i < deletes.length; ++i) {
                const id = deletes[i];
                const element = this.idIndex[id];
                if (element && !element.deleted) {
                    inverseUndelete.push(id);
                }
            }
            inverseUndelete.sort(compareNum);

            // compute inverse undeletes
            for (let i = 0; i < undeletes.length; ++i) {
                const id = undeletes[i];
                const element = this.idIndex[id];
                if (element && element.deleted) {
                    inverseDelete.push(id);
                }
            }
            inverseDelete.sort(compareNum);

            // compute inverse sequence swaps
            for (let i = 0; i < sequenceIds.length; ++i) {
                const id = sequenceIds[i];
                const element = this.idIndex[id];
                if (element && element.sequence !== sequenceVals[i]) {
                    invserseSequenceIds.push(id);
                    invserseSequenceVals.push(element.sequence);
                }
            }
        } else if (type === 'upsert') {
            const upsertAction = <MapRDA['upsertActionSchema']['identity']>data;
            const id = upsertAction.id;
            const prev = this.idIndex[id];
            if (prev) {
                result.type = 'upsert';
                const inverseUpsertAction = result.data = rda.upsertActionSchema.alloc();
                inverseUpsertAction.id = id;
                inverseUpsertAction.key = prev.key;
                inverseUpsertAction.deleted = prev.deleted;
                inverseUpsertAction.sequence = prev.sequence;
                inverseUpsertAction.value = prev.value.serialize(rda.valueRDA, inverseUpsertAction.value);
            } else {
                result.type = 'setDeleted';
                result.data = rda.setDeletedActionSchema.alloc();
                result.data.id = id;
                result.data.deleted = true;
                result.data.sequence = 0;
            }
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
            const moveAction = <MapRDA['moveActionSchema']['identity']>data;
            const id = moveAction.id;
            const prev = idIndex[id];
            if (prev) {
                result.type = 'move';
                const inverseMove = result.data = rda.moveActionSchema.alloc();
                inverseMove.id = id;
                inverseMove.key = prev.key;
                inverseMove.sequence = prev.sequence;
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
                inverseDelete.sequence = prev.sequence;
            } else {
                inverseDelete.deleted = true;
                inverseDelete.sequence = 0;
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

    public genId () {
        let shift = 0;
        while (true) {
            shift = Math.max(30, shift + 7);
            const id = (Math.random() * (1 << shift)) >>> 0;
            if (!this.idIndex[id]) {
                return id;
            }
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

    public readonly resetActionSchema:MuRDAMapTypes<KeySchema, ValueRDA>['resetActionSchema'];
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
            const upsertAction = result.data = this.storeElementSchema.alloc();
            const prev = this._savedStore.keyIndex[key];
            upsertAction.key = key;
            upsertAction.deleted = false;
            const tmp = this.valueRDA.createStore(state);
            upsertAction.value = tmp.serialize(this.valueRDA, upsertAction.value);
            tmp.free(this.valueRDA);
            if (prev) {
                upsertAction.id = prev.id;
                upsertAction.sequence = prev.sequence;
            } else {
                upsertAction.id = this._savedStore.genId();
                upsertAction.sequence = 1;
            }
            return result;
        },
        remove: (key:KeySchema['identity']) => {
            const result = this.actionSchema.alloc();
            const prev = this._savedStore.keyIndex[key];
            if (prev && !prev.deleted) {
                result.type = 'setDeleted';
                const action = result.data = this.setDeletedActionSchema.alloc();
                action.id = prev.id;
                action.deleted = true;
                action.sequence = prev.sequence;
            } else {
                result.type = 'noop';
                result.data = undefined;
            }
            return result;
        },
        move: (from:KeySchema['identity'], to:KeySchema['identity']) => {
            const result = this.actionSchema.alloc();
            const prev = this._savedStore.keyIndex[from];
            if (prev && !prev.deleted) {
                result.type = 'move';
                const moveAction = result.data = this.moveActionSchema.alloc();
                moveAction.id = prev.id;
                moveAction.key = to;
                const target = this._savedStore.keyIndex[to];
                if (target) {
                    moveAction.sequence = target.sequence + 1;
                } else if (prev.next) {
                    moveAction.sequence = prev.next.sequence + 1;
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
            result.type = 'reset';
            const resetAction = result.data = this.resetActionSchema.alloc();
            const keys = Object.keys(this._savedStore.keyIndex);
            for (let i = 0; i < keys.length; ++i) {
                const prev = this._savedStore.keyIndex[keys[i]];
                if (!prev || prev.deleted) {
                    continue;
                }
                resetAction.deletes.push(prev.id);
            }
            resetAction.deletes.sort(compareNum);
            return result;
        },
        reset: (state:MuRDAMapTypes<KeySchema, ValueRDA>['state']) => {
            const result = this.actionSchema.alloc();
            result.type = 'reset';
            const resetAction = result.data = this.resetActionSchema.alloc();
            const keys = Object.keys(state);
            const upsertAction = resetAction.upserts;
            const ids = Object.keys(this._savedStore.idIndex);
            const idConstraint:{ [id:string]:boolean} = {};
            for (let i = 0; i < ids.length; ++i) {
                idConstraint[ids[i]] = true;
            }

            for (let i = 0; i < keys.length; ++i) {
                const key = keys[i];
                const upsert = this.storeElementSchema.alloc();
                upsert.key = key;
                const tmp = this.valueRDA.createStore(state[key]);
                upsert.value = tmp.serialize(this.valueRDA, upsert.value);
                tmp.free(this.valueRDA);
                upsert.deleted = false;
                const prev = this._savedStore.keyIndex[key];
                if (prev) {
                    upsert.id = prev.id;
                    upsert.sequence = prev.sequence;
                } else {
                    let id = 0;
                    let shift = 0;
                    while (true) {
                        shift = Math.max(30, shift + 7);
                        id = (Math.random() * (1 << shift)) >>> 0;
                        if (!idConstraint[id]) {
                            idConstraint[id] = true;
                            break;
                        }
                    }
                    upsert.id = id;
                    upsert.sequence = 1;
                }
                upsertAction.push(upsert);
            }
            upsertAction.sort(this.storeSchema.compare);

            const prevKeys = Object.keys(this._savedStore.keyIndex);
            const deleteActions = resetAction.deletes;
            for (let i = 0; i < prevKeys.length; ++i) {
                const key = prevKeys[i];
                if (key in state) {
                    continue;
                }
                const prev = this._savedStore.keyIndex[key];
                if (!prev || prev.deleted) {
                    continue;
                }
                deleteActions.push(prev.id);
            }
            deleteActions.sort(compareNum);

            return result;
        },
        update: (key:KeySchema['identity']) => {
            const prev = this._savedStore.keyIndex[key];
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
        move:(from:KeySchema['identity'], to:KeySchema['identity']) => MuRDAMapTypes<KeySchema, ValueRDA>['moveAction']
        clear:() => MuRDAMapTypes<KeySchema, ValueRDA>['resetAction'];
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

        this.resetActionSchema = new MuStruct({
            upserts: this.storeSchema,
            deletes: new MuSortedArray(new MuVarint(), Infinity, compareNum),
            undeletes: new MuSortedArray(new MuVarint(), Infinity, compareNum),
            sequenceIds: new MuArray(new MuVarint(), Infinity),
            sequenceVals: new MuArray(new MuVarint(), Infinity),
        });
        this.upsertActionSchema = this.storeElementSchema;
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
            sequence: new MuVarint(),
            deleted: new MuBoolean(false),
        });

        this.actionSchema = new MuUnion({
            reset: this.resetActionSchema,
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
        const keys:string[]|number[] = Object.keys(initialState);
        if (typeof this.keySchema.identity === 'number') {
            for (let i = 0; i < keys.length; ++i) {
                const k:any = +keys[i];
                if (k !== k) {
                    throw new Error(`invalid key ${keys[i]}`);
                }
                keys[i] = k;
            }
        }

        const elements:MuRDAMapStoreElement<this>[] = new Array(keys.length);
        let idCounter = 1;
        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            const value = initialState[key];
            elements[i] = new MuRDAMapStoreElement<this>(
                idCounter++,
                1,
                false,
                key,
                this.valueRDA.createStore(value));
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
                valueRDA.parse(e.value));
        }
        return new MuRDAMapStore<this>(elements);
    }
}
