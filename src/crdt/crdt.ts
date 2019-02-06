import { MuSchema } from '../schema/schema';

export interface MuStore<
    StateSchema extends MuSchema<any>,
    ActionSchema extends MuSchema<any>,
    StoreSchema extends MuSchema<any>> {
    // computes a snapshot of the head state
    state(out:StateSchema['identity']) : StateSchema['identity'];

    // apply takes an action and either appends it or moves it to the end of the queue
    apply(action:ActionSchema['identity']) : boolean;

    // removes an action from the queue
    undo(action:ActionSchema['identity']) : boolean;

    // squash all actions
    squash(state:StateSchema['identity']);

    // serialize state of the store and all recorded actions into a MuSchema object
    serialize(out:StoreSchema['identity']) : StoreSchema['identity'];
    parse(inp:StoreSchema['identity']);

    // destroy store, clean up resources
    destroy();
}

export interface MuCRDT<
    StateSchema extends MuSchema<any>,
    ActionSchema extends MuSchema<any>,
    StoreSchema extends MuSchema<any>> {
    readonly stateSchema:StateSchema;
    readonly actionSchema:ActionSchema;
    readonly storeSchema:StoreSchema;

    // store constructor
    store(initialState:StateSchema['identity']) : MuStore<StateSchema, ActionSchema, StoreSchema>;

    // action constructors for the crdt
    readonly actions:{
        [action:string]:((...args:any[]) => ActionSchema['identity']) | MuCRDT<StateSchema, ActionSchema, StoreSchema>['actions'];
    };
}
