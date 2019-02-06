import { MuCRDT, MuStore } from './crdt';
import { MuStruct } from '../schema/struct';
import { MuUnion } from '../schema/union';
import { MuSchema } from '../schema';

export type MuStructCRDTSpec = {
    [prop:string]:MuCRDT<any, any, any>;
};

export interface StructSubActions<
    ActionSchema extends MuUnion<any>,
    Action extends ActionSchema['identity'],
    ActionType extends Action['type'],
    ActionData extends Action['data'],
    CRDTActions extends MuCRDT<any, ActionSchema, any>['actions'] > {
    actions:{
        [prop in keyof CRDTActions]:
            CRDTActions[prop] extends (...args:infer ArgType) => infer RetType ? (...args:ArgType) => {
                type:ActionType,
                data:RetType,
            } :
            CRDTActions[prop] extends MuCRDT<MuSchema<any>, MuSchema<any>, MuSchema<any>>['actions'] ?
                StructSubActions<ActionSchema, Action, ActionType, ActionData, CRDTActions[prop]>['actions'] :
            never;
    };
}

export interface StructActions<
    Spec extends MuStructCRDTSpec,
    ActionSchema extends MuUnion<{
        [id in keyof Spec]:Spec[id]['actionSchema'];
    }>> {
    actions:{
        [SubType in keyof Spec]:StructSubActions<
            ActionSchema,
            ActionSchema['identity'],
            SubType,
            Spec[SubType]['actionSchema']['identity'],
            Spec[SubType]['actions']>['actions'];
    };
}

export interface StructTypes<Spec extends MuStructCRDTSpec> {
    stateSchema:MuStruct<{
        [id in keyof Spec]:Spec[id]['stateSchema'];
    }>;
    state:StructTypes<Spec>['stateSchema']['identity'];

    actionSchema:MuUnion<{
        [id in keyof Spec]:Spec[id]['actionSchema'];
    }>;
    action:StructTypes<Spec>['actionSchema']['identity'];
    actions:StructActions<Spec, StructTypes<Spec>['actionSchema']>['actions'];

    storeSchema:MuStruct<{
        [id in keyof Spec]:Spec[id]['storeSchema'];
    }>;
    store:StructTypes<Spec>['storeSchema']['identity'];
    stores:{
        [id in keyof Spec]:ReturnType<Spec[id]['store']>;
    };
}

export class MuStructStore<Spec extends MuStructCRDTSpec>
    implements MuStore<StructTypes<Spec>['stateSchema'], StructTypes<Spec>['actionSchema'], StructTypes<Spec>['storeSchema']> {
    public stores:StructTypes<Spec>['stores'];

    constructor (
        spec:Spec,
        initialState:StructTypes<Spec>['state']) {
        const ids = Object.keys(spec);
        const stores:any = {};
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            stores[id] = spec[id].store(initialState[id]);
        }
        this.stores = stores;
    }

    public state(out:StructTypes<Spec>['state']) : StructTypes<Spec>['state'] {
        const ids = Object.keys(this.stores);
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            out[id] = this.stores[id].state(out[id]);
        }
        return out;
    }

    public squash (state:StructTypes<Spec>['state']) {
        const ids = Object.keys(this.stores);
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            this.stores[id].squash(state[id]);
        }
    }

    public apply(action:StructTypes<Spec>['action']) : boolean {
        return this.stores[action.type].apply(action.data);
    }

    public undo(action:StructTypes<Spec>['action']) : boolean {
        return this.stores[action.type].undo(action.data);
    }

    public destroy() {
        const ids = Object.keys(this.stores);
        for (let i = 0; i < ids.length; ++i) {
            this.stores[ids[i]].destroy();
        }
    }

    public serialize (out:StructTypes<Spec>['store']) : StructTypes<Spec>['store'] {
        const ids = Object.keys(this.stores);
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            out[id] = this.stores[id].serialize(out[id]);
        }
        return out;
    }

    public parse (store:StructTypes<Spec>['store']) {
        const ids = Object.keys(this.stores);
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            this.stores[id].parse(store[id]);
        }
    }
}

function actionDispatcher<Spec extends MuStructCRDTSpec> (spec:Spec) : StructTypes<Spec>['actions'] {
    function subActionDispatcher(
            type:keyof Spec,
            subActionSchema:MuSchema<any>,
            dispatcher:any) {
        if (typeof dispatcher === 'function') {
            return function (...args:any[]) {
                return {
                    type,
                    data: dispatcher.apply(null, args),
                };
            };
        } else {
            const wrapped:any = {};
            const ids = Object.keys(dispatcher);
            for (let i = 0; i < ids.length; ++i) {
                const id = ids[i];
                wrapped[id] = subActionDispatcher(type, subActionSchema, dispatcher[id]);
            }
            return wrapped;
        }
    }

    const result:StructTypes<Spec>['actions'] = <any>{};
    const props = Object.keys(spec);
    for (let i = 0; i < props.length; ++i) {
        const prop = props[i];
        const crdt = spec[prop];
        result[prop] = <any>subActionDispatcher(prop, crdt.actionSchema, crdt.actions);
    }

    return result;
}

export class MuStructCRDT<Spec extends MuStructCRDTSpec>
    implements MuCRDT<
        StructTypes<Spec>['stateSchema'],
        StructTypes<Spec>['actionSchema'],
        StructTypes<Spec>['storeSchema']> {
    public readonly stateSchema:StructTypes<Spec>['stateSchema'];
    public readonly actionSchema:StructTypes<Spec>['actionSchema'];
    public readonly storeSchema:StructTypes<Spec>['storeSchema'];
    public readonly crdts:Spec;
    public readonly actions:StructTypes<Spec>['actions'];

    constructor (spec:Spec) {
        this.crdts = spec;

        // construct schemas for state and actions
        const stateSpec:any = {};
        const actionSpec:any = {};
        const storeSpec:any = {};
        const props = Object.keys(spec);
        for (let i = 0; i < props.length; ++i) {
            const prop = props[i];
            const crdt = spec[prop];
            stateSpec[prop] = crdt[prop].stateSchema;
            actionSpec[prop] = crdt[prop].actionSchema;
            storeSpec[prop] = crdt[prop].storeSchema;
        }
        this.stateSchema = new MuStruct(stateSpec);
        this.actionSchema = new MuUnion(actionSpec);
        this.storeSchema = new MuStruct(storeSpec);

        // create action dispatcher
        this.actions = actionDispatcher(spec);
    }

    public store(initialState:StructTypes<Spec>['state']) {
        return new MuStructStore(this.crdts, initialState);
    }
}