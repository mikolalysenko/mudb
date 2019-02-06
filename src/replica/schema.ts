import { MuCRDT, MuStore } from '../crdt/crdt';
import { MuSchema } from '../schema/schema';

export type StoreType<
    StateSchema extends MuSchema<any>,
    ActionSchema extends MuSchema<any>,
    StoreSchema extends MuSchema<any>,
    ConstructStore extends (initial:StateSchema['identity']) => MuStore<StateSchema, ActionSchema, StoreSchema>> =
    ConstructStore extends (initial:StateSchema['identity']) => infer Store ? Store :
        MuStore<StateSchema, ActionSchema, StoreSchema>;

export function crdtProtocol<CRDT extends MuCRDT<any, any, any>>(crdt:CRDT) {
    return {
        client: {
            init: crdt.storeSchema,
            squash: crdt.stateSchema,
            apply: crdt.actionSchema,
            undo: crdt.actionSchema,
        },
        server: {
            apply: crdt.actionSchema,
            undo: crdt.actionSchema,
        },
    };
}

export interface CRDTInfo<CRDT extends MuCRDT<any, any, any>> {
    stateSchema:CRDT['stateSchema'];
    state:CRDT['stateSchema']['identity'];
    actionSchema:CRDT['actionSchema'];
    action:CRDT['actionSchema']['identity'];
    storeSchema:CRDT['storeSchema'];
    storeSerialized:CRDT['storeSchema']['identity'];
    store:StoreType<CRDT['stateSchema'], CRDT['actionSchema'], CRDT['storeSchema'], CRDT['store']>;
    validate:(action:CRDT['actionSchema']['identity']) => boolean;
    protocol:{
        client:{
            init:CRDT['storeSchema']['identity'],
            squash:CRDT['stateSchema'];
            apply:CRDT['actionSchema'];
            undo:CRDT['actionSchema'];
        };
        server:{
            apply:CRDT['actionSchema'];
            undo:CRDT['actionSchema'];
        };
    };
}