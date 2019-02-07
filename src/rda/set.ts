import { MuDictionary } from '../schema/dictionary';
import { MuStruct } from '../schema/struct';
import { MuUnion } from '../schema/union';
import { MuBoolean } from '../schema/boolean';
import { MuRDA, MuRDAStore } from './rda';
import { MuUUIDSchema, createUUID, MuUUID } from './uuid';
import { MuRDARegister } from './register';

const Flag = new MuRDARegister(new MuBoolean(false));

export class MuRDAElement<RDAValue extends MuRDA<any, any, any>> {
    public store:MuRDASetTypes<RDAValue>['valueStore'];
    public created:boolean = true;
    public destroyed = Flag.store(false);

    constructor (value:RDAValue, initialValue:MuRDASetTypes<RDAValue>['valueState']) {
        this.store = <any>value.store(initialValue);
    }

    public squash (state:MuRDASetTypes<RDAValue>['valueState']) {
        this.store.squash(state);
        this.created = true;
        this.destroyed.squash(false);
    }

    public serialize(out:MuRDASetTypes<RDAValue>['elementStore']) : MuRDASetTypes<RDAValue>['elementStore'] {
        out.state = this.store.serialize(out.state);
        out.created = this.created;
        out.destroyed = this.destroyed.serialize(out.destroyed);
        return out;
    }

    public parse (info:MuRDASetTypes<RDAValue>['elementStore']) {
        this.store.parse(info.state);
        this.created = info.created;
        this.destroyed.parse(info.destroyed);
    }
}

export interface MuRDASetTypes <RDAValue extends MuRDA<any, any, any>> {
    element:MuRDAElement<RDAValue>;

    valueState:RDAValue['stateSchema']['identity'];
    valueAction:RDAValue['actionSchema']['identity'];
    valueStore:ReturnType<RDAValue['store']>;

    stateSchema:MuDictionary<RDAValue['stateSchema']>;
    state:MuRDASetTypes<RDAValue>['stateSchema']['identity'];

    actionSchema:MuStruct<{
        uuid:typeof MuUUIDSchema,
        data:MuUnion<{
            create:MuRDASetTypes<RDAValue>['valueState'],
            update:MuRDASetTypes<RDAValue>['valueAction'],
            destroy:typeof Flag['actionSchema'],
        }>;
    }>;
    action:MuRDASetTypes<RDAValue>['actionSchema']['identity'];
    createAction:{
        uuid:MuUUID;
        data:{
            type:'create',
            data:MuRDASetTypes<RDAValue>['valueState'];
        };
    };
    updateAction:{
        uuid:MuUUID;
        data:{
            type:'update',
            data:MuRDASetTypes<RDAValue>['valueAction'];
        };
    };
    destroyAction:{
        uuid:MuUUID;
        data:{
            type:'destroy',
            data:typeof Flag['actionSchema']['identity'];
        };
    };

    elementStoreSchema:MuStruct<{
        state:RDAValue['storeSchema'];
        created:MuBoolean;
        destroyed:typeof Flag['storeSchema'];
    }>;
    elementStore:MuRDASetTypes<RDAValue>['elementStoreSchema']['identity'];
    storeSchema:MuDictionary<MuRDASetTypes<RDAValue>['elementStoreSchema']>;
    store:MuRDASetTypes<RDAValue>['storeSchema']['identity'];
}

export class MuRDASetStore <RDAValue extends MuRDA<any, any, any>>
    implements MuRDAStore<
        MuRDASetTypes<RDAValue>['stateSchema'],
        MuRDASetTypes<RDAValue>['actionSchema'],
        MuRDASetTypes<RDAValue>['storeSchema']> {
    private _value:RDAValue;
    private _elementStoreSchema:MuRDASetTypes<RDAValue>['elementStoreSchema'];

    public elements:{ [uuid:string]:MuRDAElement<RDAValue> } = {};

    constructor (
        value:RDAValue,
        elementStoreSchema:MuRDASetTypes<RDAValue>['elementStoreSchema'],
        initialState:MuRDASetTypes<RDAValue>['state']) {
        this._value = value;
        this._elementStoreSchema = elementStoreSchema;
        const ids = Object.keys(initialState);
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            this.elements[id] = new MuRDAElement(value, initialState[id]);
        }
    }

    public state (out:MuRDASetTypes<RDAValue>['state']) : MuRDASetTypes<RDAValue>['state'] {
        const ids = Object.keys(this.elements);
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            const element = this.elements[i];
            if (element.created && !element.destroyed.state(false)) {
                out[id] = element.store.state(this._value.stateSchema.alloc());
            }
        }
        return out;
    }

    public squash (state:MuRDASetTypes<RDAValue>['state']) {
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
                this.elements[id] = new MuRDAElement(this._value, state[id]);
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

    public apply (action:MuRDASetTypes<RDAValue>['action']) : boolean {
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
                    this.elements[action.uuid] = new MuRDAElement(this._value, action.data.data);
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

    public undo (action:MuRDASetTypes<RDAValue>['action']) : boolean {
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

    public serialize (out:MuRDASetTypes<RDAValue>['store']) : MuRDASetTypes<RDAValue>['store'] {
        const ids = Object.keys(this.elements);
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            out[id] = this.elements[id].serialize(this._elementStoreSchema.alloc());
        }
        return out;
    }

    public parse (info:MuRDASetTypes<RDAValue>['store']) {
        this.destroy();

        const ids = Object.keys(info);
        const identity = this._value.stateSchema.identity;
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            const element:MuRDASetTypes<RDAValue>['element'] = new MuRDAElement(this._value, identity);
            element.parse(info[id]);
            this.elements[id] = element;
        }
    }
}

export class MuRDASet <RDAValue extends MuRDA<any, any, any>>
    implements MuRDA<
        MuRDASetTypes<RDAValue>['stateSchema'],
        MuRDASetTypes<RDAValue>['actionSchema'],
        MuRDASetTypes<RDAValue>['storeSchema']> {
    public stateSchema:MuRDASetTypes<RDAValue>['stateSchema'];
    public actionSchema:MuRDASetTypes<RDAValue>['actionSchema'];
    public elementStoreSchema:MuRDASetTypes<RDAValue>['elementStoreSchema'];
    public storeSchema:MuRDASetTypes<RDAValue>['storeSchema'];

    public value:RDAValue;

    constructor (value:RDAValue) {
        this.value = value;
        this.stateSchema = new MuDictionary(value.stateSchema, Infinity, {});
        this.actionSchema = new MuStruct({
            uuid: MuUUIDSchema,
            data: new MuUnion({
                create: value.stateSchema,
                update: value.actionSchema,
                destroy: Flag.actionSchema,
            }),
        });
        this.elementStoreSchema = new MuStruct({
            state: value.storeSchema,
            created: new MuBoolean(true),
            destroyed: Flag.storeSchema,
        });
        this.storeSchema = new MuDictionary(this.elementStoreSchema, Infinity, {});
    }

    public store (initialState:MuRDASetTypes<RDAValue>['state']) : MuRDASetStore<RDAValue> {
        return new MuRDASetStore(this.value, this.elementStoreSchema, initialState);
    }

    public readonly actions = {
        create: (initial:MuRDASetTypes<RDAValue>['valueState']) : MuRDASetTypes<RDAValue>['createAction'] => {
            const result:any = this.actionSchema.alloc();
            result.uuid = createUUID();
            result.data.type = 'create';
            result.data.data = initial;
            return result;
        },
        update: (id:MuUUID, action:MuRDASetTypes<RDAValue>['valueAction']) : MuRDASetTypes<RDAValue>['updateAction'] => {
            const result:any = this.actionSchema.alloc();
            result.uuid = id;
            result.data.type = 'update';
            result.data.data = action;
            return result;
        },
        destroy: (id:MuUUID) : MuRDASetTypes<RDAValue>['destroyAction'] => {
            const result:any = this.actionSchema.alloc();
            result.uuid = id;
            result.data.type = 'destory';
            result.data.data = Flag.actions.set(true);
            return result;
        },
    };
}