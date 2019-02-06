import { MuCRDT, MuStore } from './crdt';
import { MuUUIDSchema, createUUID, MuUUID } from './uuid';
import { MuDictionary } from '../schema/dictionary';
import { MuStruct } from '../schema/struct';
import { MuUnion } from '../schema/union';
import { MuRegisterCRDT } from './register';
import { MuBoolean } from '../schema/boolean';

export const FlagCRDT = new MuRegisterCRDT(new MuBoolean(false));

export class MuSetElement<ValueCRDT extends MuCRDT<any, any, any>> {
    public store:SetCRDTTypes<ValueCRDT>['valueStore'];
    public created:boolean = true;
    public destroyed = FlagCRDT.store(false);

    constructor (valueCRDT:ValueCRDT, initialValue:SetCRDTTypes<ValueCRDT>['valueState']) {
        this.store = <any>valueCRDT.store(initialValue);
    }

    public squash (state:SetCRDTTypes<ValueCRDT>['valueState']) {
        this.store.squash(state);
        this.created = true;
        this.destroyed.squash(false);
    }

    public serialize(out:SetCRDTTypes<ValueCRDT>['elementStore']) : SetCRDTTypes<ValueCRDT>['elementStore'] {
        out.state = this.store.serialize(out.state);
        out.created = this.created;
        out.destroyed = this.destroyed.serialize(out.destroyed);
        return out;
    }

    public parse (info:SetCRDTTypes<ValueCRDT>['elementStore']) {
        this.store.parse(info.state);
        this.created = info.created;
        this.destroyed.parse(info.destroyed);
    }
}

export interface SetCRDTTypes <ValueCRDT extends MuCRDT<any, any, any>> {
    element:MuSetElement<ValueCRDT>;

    valueState:ValueCRDT['stateSchema']['identity'];
    valueAction:ValueCRDT['actionSchema']['identity'];
    valueStore:ReturnType<ValueCRDT['store']>;

    stateSchema:MuDictionary<ValueCRDT['stateSchema']>;
    state:SetCRDTTypes<ValueCRDT>['stateSchema']['identity'];

    actionSchema:MuStruct<{
        uuid:typeof MuUUIDSchema,
        data:MuUnion<{
            create:SetCRDTTypes<ValueCRDT>['valueState'],
            update:SetCRDTTypes<ValueCRDT>['valueAction'],
            destroy:typeof FlagCRDT['actionSchema'],
        }>;
    }>;
    action:SetCRDTTypes<ValueCRDT>['actionSchema']['identity'];
    createAction:{
        uuid:MuUUID;
        data:{
            type:'create',
            data:SetCRDTTypes<ValueCRDT>['valueState'];
        };
    };
    updateAction:{
        uuid:MuUUID;
        data:{
            type:'update',
            data:SetCRDTTypes<ValueCRDT>['valueAction'];
        };
    };
    destroyAction:{
        uuid:MuUUID;
        data:{
            type:'destroy',
            data:typeof FlagCRDT['actionSchema']['identity'];
        };
    };

    elementStoreSchema:MuStruct<{
        state:ValueCRDT['storeSchema'];
        created:MuBoolean;
        destroyed:typeof FlagCRDT['storeSchema'];
    }>;
    elementStore:SetCRDTTypes<ValueCRDT>['elementStoreSchema']['identity'];
    storeSchema:MuDictionary<SetCRDTTypes<ValueCRDT>['elementStoreSchema']>;
    store:SetCRDTTypes<ValueCRDT>['storeSchema']['identity'];
}

export class MuSetStore <ValueCRDT extends MuCRDT<any, any, any>>
    implements MuStore<
        SetCRDTTypes<ValueCRDT>['stateSchema'],
        SetCRDTTypes<ValueCRDT>['actionSchema'],
        SetCRDTTypes<ValueCRDT>['storeSchema']> {
    private _valueCRDT:ValueCRDT;
    private _elementStoreSchema:SetCRDTTypes<ValueCRDT>['elementStoreSchema'];

    public elements:{ [uuid:string]:MuSetElement<ValueCRDT> } = {};

    constructor (
        valueCRDT:ValueCRDT,
        elementStoreSchema:SetCRDTTypes<ValueCRDT>['elementStoreSchema'],
        initialState:SetCRDTTypes<ValueCRDT>['state']) {
        this._valueCRDT = valueCRDT;
        this._elementStoreSchema = elementStoreSchema;
        const ids = Object.keys(initialState);
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            this.elements[id] = new MuSetElement(valueCRDT, initialState[id]);
        }
    }

    public state (out:SetCRDTTypes<ValueCRDT>['state']) : SetCRDTTypes<ValueCRDT>['state'] {
        const ids = Object.keys(this.elements);
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            const element = this.elements[i];
            if (element.created && !element.destroyed.state(false)) {
                out[id] = element.store.state(this._valueCRDT.stateSchema.alloc());
            }
        }
        return out;
    }

    public squash (state:SetCRDTTypes<ValueCRDT>['state']) {
        const ids = Object.keys(this.elements);
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            if (!(id in state)) {
                this.elements[id].store.destroy();
                delete this.elements[id];
            }
        }
        const nids = Object.keys(state);
        for (let i = 0; i < nids.length; ++i) {
            const id = nids[i];
            if (id in this.elements) {
                this.elements[id].squash(state[id]);
            } else {
                this.elements[id] = new MuSetElement(this._valueCRDT, state[id]);
            }
        }
    }

    public destroy () {
        const ids = Object.keys(this.elements);
        for (let i = 0; i < ids.length; ++i) {
            this.elements[ids[i]].store.destroy();
        }
        this.elements = {};
    }

    public apply (action:SetCRDTTypes<ValueCRDT>['action']) : boolean {
        const element = this.elements[action.uuid];
        switch (action.data.type) {
            case 'create':
                if (element) {
                    if (element.created) {
                        return false;
                    }
                    element.created = true;
                    return true;
                } else {
                    this.elements[action.uuid] = new MuSetElement(this._valueCRDT, action.data.data);
                    return true;
                }
            case 'update':
                if (!element) {
                    return false;
                }
                return element.store.undo(action.data.data);
            case 'destroy':
                if (element) {
                    return element.destroyed.apply(action.data.data);
                } else {
                    return false;
                }
        }
        return false;
    }

    public undo (action:SetCRDTTypes<ValueCRDT>['action']) : boolean {
        const element = this.elements[action.uuid];
        switch (action.data.type) {
            case 'create':
                if (element && element.created) {
                    element.created = false;
                    return true;
                }
                return false;
            case 'update':
                if (!element) {
                    return false;
                }
                return element.store.undo(action.data.data);
            case 'destroy':
                if (element) {
                    return element.destroyed.undo(action.data.data);
                } else {
                    return false;
                }
        }
        return false;
    }

    public serialize (out:SetCRDTTypes<ValueCRDT>['store']) : SetCRDTTypes<ValueCRDT>['store'] {
        const ids = Object.keys(this.elements);
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            out[id] = this.elements[id].serialize(this._elementStoreSchema.alloc());
        }
        return out;
    }

    public parse (info:SetCRDTTypes<ValueCRDT>['store']) {
        this.destroy();

        const ids = Object.keys(info);
        const identity = this._valueCRDT.stateSchema.identity;
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            const element:SetCRDTTypes<ValueCRDT>['element'] = new MuSetElement(this._valueCRDT, identity);
            element.parse(info[id]);
            this.elements[id] = element;
        }
    }
}

export class MuSetCRDT <ValueCRDT extends MuCRDT<any, any, any>>
    implements MuCRDT<
        SetCRDTTypes<ValueCRDT>['stateSchema'],
        SetCRDTTypes<ValueCRDT>['actionSchema'],
        SetCRDTTypes<ValueCRDT>['storeSchema']> {
    public stateSchema:SetCRDTTypes<ValueCRDT>['stateSchema'];
    public actionSchema:SetCRDTTypes<ValueCRDT>['actionSchema'];
    public elementStoreSchema:SetCRDTTypes<ValueCRDT>['elementStoreSchema'];
    public storeSchema:SetCRDTTypes<ValueCRDT>['storeSchema'];

    public valueCRDT:ValueCRDT;

    constructor (valueCRDT:ValueCRDT) {
        this.valueCRDT = valueCRDT;
        this.stateSchema = new MuDictionary(valueCRDT.stateSchema, Infinity, {});
        this.actionSchema = new MuStruct({
            uuid: MuUUIDSchema,
            data: new MuUnion({
                create: valueCRDT.stateSchema,
                update: valueCRDT.actionSchema,
                destroy: FlagCRDT.actionSchema,
            }),
        });
        this.elementStoreSchema = new MuStruct({
            state: valueCRDT.storeSchema,
            created: new MuBoolean(true),
            destroyed: FlagCRDT.storeSchema,
        });
        this.storeSchema = new MuDictionary(this.elementStoreSchema, Infinity, {});
    }

    public store (initialState:SetCRDTTypes<ValueCRDT>['state']) : MuSetStore<ValueCRDT> {
        return new MuSetStore(this.valueCRDT, this.elementStoreSchema, initialState);
    }

    public readonly actions = {
        create: (initial:SetCRDTTypes<ValueCRDT>['valueState']) : SetCRDTTypes<ValueCRDT>['createAction'] => {
            const result:any = this.actionSchema.alloc();
            result.uuid = createUUID();
            result.data.type = 'create';
            result.data.data = initial;
            return result;
        },
        update: (id:MuUUID, action:SetCRDTTypes<ValueCRDT>['valueAction']) : SetCRDTTypes<ValueCRDT>['updateAction'] => {
            const result:any = this.actionSchema.alloc();
            result.uuid = id;
            result.data.type = 'update';
            result.data.data = action;
            return result;
        },
        destroy: (id:MuUUID) : SetCRDTTypes<ValueCRDT>['destroyAction'] => {
            const result:any = this.actionSchema.alloc();
            result.uuid = id;
            result.data.type = 'destory';
            result.data.data = FlagCRDT.actions.set(true);
            return result;
        },
    };
}