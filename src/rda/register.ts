import { MuSchema } from '../schema/schema';
import { MuRDA, MuRDAConflicts, MuRDAStore, MuRDATypes } from './rda';
import { clonePatch } from './_util';

function identity<T> (x:T) : T { return x; }

export class MuRDARegisterStore<RDA extends MuRDARegister<any>> implements MuRDAStore<RDA> {
    public value:MuRDATypes<RDA>['state'];

    constructor (initial:MuRDATypes<RDA>['state']) { this.value = initial; }

    public state (rda:RDA, out:MuRDATypes<RDA>['state']) { return rda.stateSchema.assign(out, this.value); }
    public inverse (rda:RDA) { return rda.actionSchema.clone(this.value); }
    public free (rda:RDA) { rda.stateSchema.free(this.value); }

    public diff (rda:RDA, other:MuRDARegisterStore<RDA>) {
        const result:MuRDATypes<RDA>['patch'] = [];
        if (!rda.stateSchema.equals(this.value, other.value)) {
            result.push(rda.action(other.value));
        }
        return result;
    }

    public conflicts (rda:RDA, f:MuRDATypes<RDA>['patch'], g:MuRDATypes<RDA>['patch']) {
        if (f.length === 0) {
            return new MuRDAConflicts<RDA>(clonePatch(rda, g), []);
        } else if (g.length === 0) {
            return new MuRDAConflicts<RDA>(clonePatch(rda, f), []);
        }
        const fhead = f[f.length - 1];
        const ghead = g[g.length - 1];
        if (rda.actionSchema.equals(fhead, ghead)) {
            return new MuRDAConflicts<RDA>([ rda.actionSchema.clone(fhead) ], []);
        }
        return new MuRDAConflicts<RDA>([], [
            rda.actionSchema.clone(fhead),
            rda.actionSchema.clone(ghead),
        ]);
    }

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
