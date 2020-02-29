import { MuSchema } from '../schema/schema';

// Typescript helpers
export interface MuRDATypes<RDA extends MuRDA<any, any, any, any>> {
    // Type of an RDA's state schema and state object
    stateSchema:RDA['stateSchema'];
    state:this['stateSchema']['identity'];

    // Type of an RDA's action schema and action object
    actionSchema:RDA['actionSchema'];
    action:this['actionSchema']['identity'];

    // Store serialization schemas
    serializedStoreSchema:RDA['storeSchema'];
    serializedStore:this['serializedStoreSchema']['identity'];

    // Type of the store associated to an RDA
    store:RDA['emptyStore'];

    meta:RDA['actionMeta'];
    dispatcher:RDA['action'];
}

export interface MuRDA<
    StateSchema extends MuSchema<any>,
    ActionSchema extends MuSchema<any>,
    StoreSchema extends MuSchema<any>,
    Meta extends MuRDABindableActionMeta> {
    readonly stateSchema:StateSchema;
    readonly actionSchema:ActionSchema;
    readonly storeSchema:StoreSchema;
    readonly emptyStore:MuRDAStore<this>;

    // store constructors
    createStore(initialState:StateSchema['identity']) : this['emptyStore'];
    parse(inp:StoreSchema['identity']) : this['emptyStore'];

    // action constructor and reflection metadata
    actionMeta:Meta;
    action:any;
}

export interface MuRDAStore<RDA extends MuRDA<any, any, any, any>> {
    // computes a snapshot of the head state
    state(rda:RDA, out:MuRDATypes<RDA>['state']) : MuRDATypes<RDA>['state'];

    // apply takes an action and either appends it or moves it to the end of the queue
    apply(rda:RDA, action:MuRDATypes<RDA>['action']) : boolean;

    // removes an action from the queue
    inverse(rda:RDA, action:MuRDATypes<RDA>['action']) : MuRDATypes<RDA>['action'];

    // serialize state of the store and all recorded actions into a MuSchema object
    serialize(rda:RDA, out:MuRDATypes<RDA>['serializedStore']) : MuRDATypes<RDA>['serializedStore'];

    // destroy store, clean up resources
    free(rda:RDA);
}

export type MuRDAActionMeta =
    {
        type:'unit';
    } |
    {
        type:'partial';
        action:MuRDAActionMeta;
    } |
    {
        type:'table';
        table:{
            [id:string]:MuRDAActionMeta;
        };
    };

export type MuRDAAction<Action, Meta extends MuRDAActionMeta> =
    Meta extends { type:'unit' }
        ? (...args) => Action
    : Meta extends { type:'partial', action:MuRDAActionMeta }
        ? (...args) => MuRDAAction<Action, Meta['action']>
    : Meta extends { type:'table', table:{ [id:string]:MuRDAActionMeta }}
        ? {
            [id in keyof Meta['table']]:MuRDAAction<Action, Meta['table'][id]>;
        }
    : never;

export type MuRDABindableActionMeta =
    {
        type:'store';
        action:MuRDAActionMeta;
    } |
    MuRDAActionMeta;

export type MuRDABindableAction<Action, Meta extends MuRDABindableActionMeta> =
    Meta extends { type:'store', action:MuRDAActionMeta }
        ? (store) => MuRDAAction<Action, Meta['action']>
    : Meta extends MuRDAActionMeta
        ?  MuRDAAction<Action, Meta>
        : never;