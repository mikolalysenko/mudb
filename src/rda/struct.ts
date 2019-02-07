import { MuRDA, MuRDAStore } from './rda';
import { MuStruct } from '../schema/struct';
import { MuUnion } from '../schema/union';
import { MuSchema } from '../schema';

export type MuRDAStructSpec = {
    [prop:string]:MuRDA<any, any, any>;
};

export interface MuRDAStructSubActions<
    ActionSchema extends MuUnion<any>,
    Action extends ActionSchema['identity'],
    ActionType extends Action['type'],
    ActionData extends Action['data'],
    Dispatcher extends MuRDA<any, ActionSchema, any>['actions'] > {
    actions:{
        [prop in keyof Dispatcher]:
            Dispatcher[prop] extends (...args:infer ArgType) => infer RetType ? (...args:ArgType) => {
                type:ActionType,
                data:RetType,
            } :
            Dispatcher[prop] extends MuRDA<MuSchema<any>, MuSchema<any>, MuSchema<any>>['actions'] ?
                MuRDAStructSubActions<ActionSchema, Action, ActionType, ActionData, Dispatcher[prop]>['actions'] :
            never;
    };
}

export interface MuRDAStructActions<
    Spec extends MuRDAStructSpec,
    ActionSchema extends MuUnion<{
        [id in keyof Spec]:Spec[id]['actionSchema'];
    }>> {
    actions:{
        [SubType in keyof Spec]:MuRDAStructSubActions<
            ActionSchema,
            ActionSchema['identity'],
            SubType,
            Spec[SubType]['actionSchema']['identity'],
            Spec[SubType]['actions']>['actions'];
    };
}

export interface MuRDAStructTypes<Spec extends MuRDAStructSpec> {
    stateSchema:MuStruct<{
        [id in keyof Spec]:Spec[id]['stateSchema'];
    }>;
    state:MuRDAStructTypes<Spec>['stateSchema']['identity'];

    actionSchema:MuUnion<{
        [id in keyof Spec]:Spec[id]['actionSchema'];
    }>;
    action:MuRDAStructTypes<Spec>['actionSchema']['identity'];
    actions:MuRDAStructActions<Spec, MuRDAStructTypes<Spec>['actionSchema']>['actions'];

    storeSchema:MuStruct<{
        [id in keyof Spec]:Spec[id]['storeSchema'];
    }>;
    store:MuRDAStructTypes<Spec>['storeSchema']['identity'];
    stores:{
        [id in keyof Spec]:ReturnType<Spec[id]['store']>;
    };
}

export class MuRDAStructStore<Spec extends MuRDAStructSpec>
    implements MuRDAStore<MuRDAStructTypes<Spec>['stateSchema'], MuRDAStructTypes<Spec>['actionSchema'], MuRDAStructTypes<Spec>['storeSchema']> {
    public stores:MuRDAStructTypes<Spec>['stores'];

    constructor (
        spec:Spec,
        initialState:MuRDAStructTypes<Spec>['state']) {
        const ids = Object.keys(spec);
        const stores:any = {};
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            stores[id] = spec[id].store(initialState[id]);
        }
        this.stores = stores;
    }

    public state(out:MuRDAStructTypes<Spec>['state']) : MuRDAStructTypes<Spec>['state'] {
        const ids = Object.keys(this.stores);
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            out[id] = this.stores[id].state(out[id]);
        }
        return out;
    }

    public squash (state:MuRDAStructTypes<Spec>['state']) {
        const ids = Object.keys(this.stores);
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            this.stores[id].squash(state[id]);
        }
    }

    public apply(action:MuRDAStructTypes<Spec>['action']) : boolean {
        return this.stores[action.type].apply(action.data);
    }

    public undo(action:MuRDAStructTypes<Spec>['action']) : boolean {
        return this.stores[action.type].undo(action.data);
    }

    public destroy() {
        const ids = Object.keys(this.stores);
        for (let i = 0; i < ids.length; ++i) {
            this.stores[ids[i]].destroy();
        }
    }

    public serialize (out:MuRDAStructTypes<Spec>['store']) : MuRDAStructTypes<Spec>['store'] {
        const ids = Object.keys(this.stores);
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            out[id] = this.stores[id].serialize(out[id]);
        }
        return out;
    }

    public parse (store:MuRDAStructTypes<Spec>['store']) {
        const ids = Object.keys(this.stores);
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            this.stores[id].parse(store[id]);
        }
    }
}

function actionDispatcher<Spec extends MuRDAStructSpec> (spec:Spec) : MuRDAStructTypes<Spec>['actions'] {
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

    const result:MuRDAStructTypes<Spec>['actions'] = <any>{};
    const props = Object.keys(spec);
    for (let i = 0; i < props.length; ++i) {
        const prop = props[i];
        const rda = spec[prop];
        result[prop] = <any>subActionDispatcher(prop, rda.actionSchema, rda.actions);
    }

    return result;
}

export class MuRDAStruct<Spec extends MuRDAStructSpec>
    implements MuRDA<
        MuRDAStructTypes<Spec>['stateSchema'],
        MuRDAStructTypes<Spec>['actionSchema'],
        MuRDAStructTypes<Spec>['storeSchema']> {
    public readonly stateSchema:MuRDAStructTypes<Spec>['stateSchema'];
    public readonly actionSchema:MuRDAStructTypes<Spec>['actionSchema'];
    public readonly storeSchema:MuRDAStructTypes<Spec>['storeSchema'];
    public readonly rdas:Spec;
    public readonly actions:MuRDAStructTypes<Spec>['actions'];

    constructor (spec:Spec) {
        this.rdas = spec;

        // construct schemas for state and actions
        const stateSpec:any = {};
        const actionSpec:any = {};
        const storeSpec:any = {};
        const props = Object.keys(spec);
        for (let i = 0; i < props.length; ++i) {
            const prop = props[i];
            const rda = spec[prop];
            stateSpec[prop] = rda.stateSchema;
            actionSpec[prop] = rda.actionSchema;
            storeSpec[prop] = rda.storeSchema;
        }
        this.stateSchema = new MuStruct(stateSpec);
        this.actionSchema = new MuUnion(actionSpec);
        this.storeSchema = new MuStruct(storeSpec);

        // create action dispatcher
        this.actions = actionDispatcher(spec);
    }

    public store(initialState:MuRDAStructTypes<Spec>['state']) {
        return new MuRDAStructStore(this.rdas, initialState);
    }
}