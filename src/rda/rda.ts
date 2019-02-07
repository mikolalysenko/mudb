import { MuSchema } from '../schema/schema';

export interface MuRDAStore<
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

export interface MuRDA<
    StateSchema extends MuSchema<any>,
    ActionSchema extends MuSchema<any>,
    StoreSchema extends MuSchema<any>> {
    readonly stateSchema:StateSchema;
    readonly actionSchema:ActionSchema;
    readonly storeSchema:StoreSchema;

    // store constructor
    store(initialState:StateSchema['identity']) : MuRDAStore<StateSchema, ActionSchema, StoreSchema>;

    // action constructors for the crdt
    readonly actions:{
        [action:string]:((...args:any[]) => ActionSchema['identity']) | MuRDA<StateSchema, ActionSchema, StoreSchema>['actions'];
    };
}

// Typescript helpers
export interface MuRDATypes<RDA extends MuRDA<any, any, any>> {
    // Type of an RDA's state schema and state object
    stateSchema:RDA['stateSchema'];
    state:MuRDATypes<RDA>['stateSchema']['identity'];

    // Type of an RDA's action schema and acction object
    actionSchema:RDA['actionSchema'];
    action:MuRDATypes<RDA>['actionSchema']['identity'];

    // Store serialization schemas
    serializedStoreSchema:RDA['storeSchema'];
    serializedStore:MuRDATypes<RDA>['serializedStoreSchema']['identity'];

    // Type of the store associated to an RDA
    store:RDA['store'] extends (...args:any[]) => infer StoreType
        ? StoreType extends MuRDAStore<RDA['stateSchema'], RDA['actionSchema'], RDA['storeSchema']>
            ? StoreType
            : MuRDAStore<RDA['stateSchema'], RDA['actionSchema'], RDA['storeSchema']>
        : MuRDAStore<RDA['stateSchema'], RDA['actionSchema'], RDA['storeSchema']>;
}