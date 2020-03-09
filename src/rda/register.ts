import { MuSchema } from '../schema/schema';
import { MuRDA, MuRDAStore, MuRDATypes } from './rda';

function identity<T> (x:T) : T { return x; }

export class MuRDARegisterStore<RDA extends MuRDARegister<any>> implements MuRDAStore<RDA> {
    public value:MuRDATypes<RDA>['state'];

    constructor (initial:MuRDATypes<RDA>['state']) { this.value = initial; }

    public state (rda:RDA, out:MuRDATypes<RDA>['state']) { return rda.stateSchema.assign(out, this.value); }
    public inverse (rda:RDA) { return rda.actionSchema.clone(this.value); }
    public free (rda:RDA) { rda.stateSchema.free(this.value); }

    public apply (rda:RDA, action:MuRDATypes<RDA>['action']) {
        this.value = rda.stateSchema.assign(this.value, rda.constrain(action));
        return true;
    }

    public serialize (rda:RDA, out:MuRDATypes<RDA>['serializedStore']) : MuRDATypes<RDA>['serializedStore'] {
        return rda.storeSchema.assign(out, this.value);
    }
}

type MuRDARegisterMeta = {
    type:'unit';
};

export class MuRDARegister<StateSchema extends MuSchema<any>>
    implements MuRDA<StateSchema, StateSchema, StateSchema, MuRDARegisterMeta> {
    public readonly stateSchema:StateSchema;
    public readonly actionSchema:StateSchema;
    public readonly storeSchema:StateSchema;

    public readonly actionMeta:MuRDARegisterMeta = { type: 'unit' };

    public action = (value:StateSchema['identity']) : StateSchema['identity'] => {
        return this.actionSchema.clone(this.constrain(value));
    }

    public readonly emptyStore:MuRDARegisterStore<this>;

    public constrain:(value:StateSchema['identity']) => StateSchema['identity'];

    constructor (
        stateSchema:StateSchema,
        constrain?:(value:StateSchema['identity']) => StateSchema['identity']) {
        this.stateSchema = this.actionSchema = this.storeSchema = stateSchema;
        this.constrain = constrain || identity;
        this.emptyStore = new MuRDARegisterStore<this>(stateSchema.identity);
    }

    public createStore (initialState:StateSchema['identity']) : MuRDARegisterStore<this> {
        return new MuRDARegisterStore<this>(this.stateSchema.clone(initialState));
    }
    public parse (store:StateSchema['identity']) : MuRDARegisterStore<this> {
        return new MuRDARegisterStore<this>(this.stateSchema.clone(store));
    }
}
