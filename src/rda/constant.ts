import { MuSchema } from '../schema/schema';
import { MuVoid } from '../schema/void';
import { MuRDA, MuRDAStore } from './rda';

export class MuRDAConstantStore<StateSchema extends MuSchema<any>> implements MuRDAStore<StateSchema, MuVoid, StateSchema> {
    private _stateSchema:StateSchema;
    public value:StateSchema['identity'];

    constructor (
        stateSchema:StateSchema,
        initial:StateSchema['identity']) {
        this._stateSchema = stateSchema;
        this.value = initial;
    }

    public state (out:StateSchema['identity']) {
        return this._stateSchema.assign(out, this.value);
    }

    public apply () { return false; }
    public undo () { return false; }

    public squash (state:StateSchema['identity']) {
        this.value = this._stateSchema.assign(this.value, state);
    }

    public destroy () {
        this._stateSchema.free(this.value);
    }

    public serialize (out:StateSchema['identity']) : StateSchema['identity'] {
        return this._stateSchema.assign(out, this.value);
    }

    public parse (store:StateSchema['identity']) {
        this.value = this._stateSchema.assign(this.value, store);
    }
}

export class MuRDAConstant<StateSchema extends MuSchema<any>> implements MuRDA<StateSchema, MuVoid, StateSchema> {
    public readonly stateSchema:StateSchema;
    public readonly actionSchema = new MuVoid();
    public readonly storeSchema:StateSchema;
    public actions = {};

    constructor (stateSchema:StateSchema) {
        this.stateSchema = stateSchema;
        this.storeSchema = stateSchema;
    }

    public store (initialState:StateSchema['identity']) {
        return new MuRDAConstantStore<StateSchema>(this.stateSchema, initialState);
    }
}