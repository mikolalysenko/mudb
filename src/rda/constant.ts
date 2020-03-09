import { MuSchema } from '../schema/schema';
import { MuVoid } from '../schema/void';
import { MuRDA, MuRDAStore, MuRDATypes } from './rda';

export class MuRDAConstantStore<RDA extends MuRDAConstant<MuSchema<any>>>
    implements MuRDAStore<RDA> {
    public value:MuRDATypes<RDA>['state'];

    constructor (initial:MuRDATypes<RDA>['state']) {
        this.value = initial;
    }

    public state (rda:RDA, out:MuRDATypes<RDA>['state']) {
        return rda.stateSchema.assign(out, this.value);
    }

    public apply () { return false; }
    public inverse () { }

    public serialize (rda:RDA, out:MuRDATypes<RDA>['serializedStore']) : MuRDATypes<RDA>['serializedStore'] {
        return rda.storeSchema.assign(out, this.value);
    }

    public free (rda:RDA) {
        rda.stateSchema.free(this.value);
    }
}

type MuRDAConstantMeta = {
    type:'table';
    table:{};
};

export class MuRDAConstant<StateSchema extends MuSchema<any>>
    implements MuRDA<StateSchema, MuVoid, StateSchema, MuRDAConstantMeta> {
    public readonly stateSchema:StateSchema;
    public readonly actionSchema = new MuVoid();
    public readonly storeSchema:StateSchema;
    public readonly actionMeta:MuRDAConstantMeta = {
        type:'table',
        table:{},
    };
    public readonly action = {};

    public readonly emptyStore:MuRDAConstantStore<this>;

    constructor (stateSchema:StateSchema) {
        this.stateSchema = stateSchema;
        this.storeSchema = stateSchema;
        this.emptyStore = new MuRDAConstantStore(stateSchema.identity);
    }

    public createStore (initialState:StateSchema['identity']) : MuRDAConstantStore<this> {
        return new MuRDAConstantStore<this>(this.stateSchema.clone(initialState));
    }
    public parse (store:StateSchema['identity']) : MuRDAConstantStore<this> {
        return new MuRDAConstantStore<this>(this.stateSchema.clone(store));
    }
}
