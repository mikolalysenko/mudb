import { MuStruct } from '../schema/struct';
import { MuUnion } from '../schema/union';
import { MuRDA, MuRDAStore, MuRDATypes, MuRDAActionMeta, MuRDABindableActionMeta } from './rda';

export type MuRDAStructSpec = {
    [prop:string]:MuRDA<any, any, any, any>;
};

type WrapAction<
    Spec extends MuRDAStructSpec,
    Id extends keyof Spec,
    Meta,
    Dispatch> =
    Meta extends { type:'unit' }
        ? Dispatch extends (...args:infer ArgType) => infer RetType
            ?  (...args:ArgType) => {
                    type:Id;
                    data:RetType;
                }
            : never
    : Meta extends { action:MuRDAActionMeta }
        ? Dispatch extends (...args:infer ArgType) => infer RetType
            ? (...args:ArgType) => WrapAction<
                Spec,
                Id,
                Meta['action'],
                RetType>
            : never
    : Meta extends { table:{ [id in keyof Dispatch]:MuRDAActionMeta } }
        ? Dispatch extends { [id in keyof Meta['table']]:any }
            ? {
                [id in keyof Meta['table']]:WrapAction<
                    Spec,
                    Id,
                    Meta['table'][id],
                    Dispatch[id]>;
            }
            : never
    : never;

type StripBindMeta<Meta extends MuRDABindableActionMeta> =
    Meta extends { type:'store'; action:MuRDAActionMeta; }
        ? Meta['action']
    : Meta extends MuRDAActionMeta
        ? Meta
        : never;

type StripBindAndWrap<
    Spec extends MuRDAStructSpec,
    Id extends keyof Spec> =
    Spec[Id]['actionMeta'] extends { type:'store'; action:MuRDAActionMeta; }
        ? Spec[Id]['action'] extends (store) => infer RetAction
            ? WrapAction<
                    Spec,
                    Id,
                    Spec[Id]['actionMeta']['action'],
                    RetAction>
            : never
    : WrapAction<
        Spec,
        Id,
        Spec[Id]['actionMeta'],
        Spec[Id]['action']>;

export interface MuRDAStructTypes<Spec extends MuRDAStructSpec> {
    stateSchema:MuStruct<{
        [id in keyof Spec]:Spec[id]['stateSchema'];
    }>;
    state:this['stateSchema']['identity'];

    actionSchema:MuUnion<{
        [id in keyof Spec]:Spec[id]['actionSchema'];
    }>;
    action:this['actionSchema']['identity'];

    storeSchema:MuStruct<{
        [id in keyof Spec]:Spec[id]['storeSchema'];
    }>;
    store:this['storeSchema']['identity'];
    stores:{
        [id in keyof Spec]:Spec[id]['emptyStore'];
    };

    actionMeta:{
        type:'store';
        action:{
            type:'table';
            table:{
                [id in keyof Spec]:StripBindMeta<Spec[id]['actionMeta']>;
            };
        };
    };
}

export class MuRDAStructStore<
    Spec extends MuRDAStructSpec,
    RDA extends MuRDAStruct<Spec>> implements MuRDAStore<RDA> {
    public stores:MuRDAStructTypes<Spec>['stores'];

    constructor (stores:MuRDAStructTypes<Spec>['stores']) {
        this.stores = stores;
    }

    public state(rda:RDA, out:MuRDATypes<RDA>['state']) {
        const ids = Object.keys(this.stores);
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            (<any>out)[id] = this.stores[id].state(rda.rdas[id], out[id]);
        }
        return out;
    }

    public apply(rda:RDA, action:MuRDATypes<RDA>['action']) : boolean {
        return this.stores[action.type].apply(rda.rdas[action.type], action.data);
    }

    public inverse(rda:RDA, action:MuRDATypes<RDA>['action']) : MuRDATypes<RDA>['action'] {
        const result = rda.actionSchema.alloc();
        result.type = action.type;
        const x = result.data = this.stores[action.type].inverse(rda.rdas[action.type], action.data);
        return <{
            type:(typeof action.type);
            data:(typeof x);
        }>result;
    }

    public serialize (rda:RDA, out:MuRDATypes<RDA>['serializedStore']) {
        const ids = Object.keys(this.stores);
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            (<any>out)[id] = this.stores[id].serialize(rda.rdas[id], out[id]);
        }
        return out;
    }

    public free(rda:RDA) {
        const ids = Object.keys(this.stores);
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            this.stores[id].free(rda.rdas[id]);
        }
    }
}

export class MuRDAStruct<Spec extends { [prop:string]:MuRDA<any, any, any, any> }>
    implements MuRDA<
        MuRDAStructTypes<Spec>['stateSchema'],
        MuRDAStructTypes<Spec>['actionSchema'],
        MuRDAStructTypes<Spec>['storeSchema'],
        MuRDAStructTypes<Spec>['actionMeta']> {
    public readonly rdas:Spec;

    public readonly stateSchema:MuRDAStructTypes<Spec>['stateSchema'];
    public readonly actionSchema:MuRDAStructTypes<Spec>['actionSchema'];
    public readonly storeSchema:MuRDAStructTypes<Spec>['storeSchema'];

    public readonly actionMeta:MuRDAStructTypes<Spec>['actionMeta'];
    public readonly action:((store:MuRDAStructStore<Spec, MuRDAStruct<Spec>>) => {
        [id in keyof Spec]:StripBindAndWrap<Spec, id>;
    });

    public readonly emptyStore:MuRDAStructStore<Spec, this>;

    private _saveStore:any = null;
    private _wrapDispatch<Id extends keyof Spec>(id:Id, rda:Spec[Id]) {
        const self = this;

        function wrapPartial(root:MuRDAActionMeta, dispatch) {
            const savedPartial = { data:<any>null };

            function wrapPartialRec (meta:MuRDAActionMeta, index:string) {
                if (meta.type === 'unit') {
                    return (new Function(
                        'rda',
                        'partial',
                        `/* ${id}:${index} */ return function() { var result = rda.actionSchema.alloc(); result.type = "${id}"; result.data = partial.data${index}.apply(null, arguments); return result; }`,
                    ))(self, savedPartial);
                } else if (meta.type === 'table') {
                    const result:any = {};
                    const keys = Object.keys(meta.table);
                    for (let i = 0; i < keys.length; ++i) {
                        const key = keys[i];
                        result[key] = wrapPartialRec(meta.table[key], `${index}["${key}"]`);
                    }
                    return result;
                } else if (meta.type === 'partial') {
                    return wrapPartial(meta.action, (new Function(
                        'partial',
                        `/* ${id}:${index} */ return function () { return partial.data${index}.apply(null, arguments); }`,
                    ))(savedPartial));
                }
                return {};
            }

            return (new Function(
                'dispatch',
                'partial',
                'wrappedDispatch',
                `/* ${id} */ return function () { partial.data = dispatch.apply(null, arguments); return wrappedDispatch; }`,
            ))(dispatch, savedPartial, wrapPartialRec(root, ''));
        }

        function wrapAction (meta:MuRDAActionMeta, dispatch:any) {
            if (meta.type === 'unit') {
                return function (...args) {
                    const result = self.actionSchema.alloc();
                    result.type = id;
                    result.data = dispatch.apply(null, args);
                    return result;
                };
            } else if (meta.type === 'table') {
                const result:any = {};
                const ids = Object.keys(meta.table);
                for (let i = 0; i < ids.length; ++i) {
                    const key = ids[i];
                    result[key] = wrapAction(meta.table[key], dispatch);
                }
                return result;
            } else if (meta.type === 'partial') {
                return wrapPartial(meta.action, dispatch);
            }
            return {};
        }

        function wrapStore(meta:MuRDAActionMeta, index:string) {
            if (meta.type === 'unit') {
                return (new Function(
                    'rda',
                    'dispatch',
                    `/* ${id}:${index} */ return function() { var result = rda.actionSchema.alloc(); result.type = "${id}"; result.data = dispatch(rda._saveStore.stores["${id}"])${index}.apply(null, arguments); return result; }`,
                ))(self, rda.action);
            } else if (meta.type === 'table') {
                const result:any = {};
                const ids = Object.keys(meta.table);
                for (let i = 0; i < ids.length; ++i) {
                    const key = ids[i];
                    result[key] = wrapStore(meta.table[key], `${index}["${key}"]`);
                }
                return result;
            } else if (meta.type === 'partial') {
                return wrapPartial(
                    meta.action,
                    (new Function(
                        'rda',
                        'dispatch',
                        `/* ${id}:${index} */ return function() { return dispatch(rda._saveStore.stores["${id}"])${index}.apply(null, arguments); }`,
                    ))(self, rda.action));
            }
            return {};
        }

        if (rda.actionMeta.type !== 'store') {
            this.actionMeta.action.table[id] = rda.actionMeta;
            return wrapAction(rda.actionMeta, rda.action);
        } else {
            this.actionMeta.action.table[id] = rda.actionMeta.action;
            return wrapStore(rda.actionMeta.action, '');
        }
    }

    constructor (spec:Spec) {
        this.rdas = spec;

        // construct schemas for state and actions
        const stateSpec:any = {};
        const actionSpec:any = {};
        const storeSpec:any = {};
        const emptyStores:any = {};
        const props = Object.keys(spec);
        for (let i = 0; i < props.length; ++i) {
            const prop = props[i];
            const rda = spec[prop];
            stateSpec[prop] = rda.stateSchema;
            actionSpec[prop] = rda.actionSchema;
            storeSpec[prop] = rda.storeSchema;
            emptyStores[prop] = rda.emptyStore;
        }
        this.stateSchema = new MuStruct(stateSpec);
        this.actionSchema = new MuUnion(actionSpec);
        this.storeSchema = new MuStruct(storeSpec);
        this.emptyStore = new MuRDAStructStore(emptyStores);

        // Generate action meta data and store stuff
        this.actionMeta = <any>{
            type:'store',
            action:{
                type:'table',
                table:{},
            },
        };
        const storeDispatch:any = {};
        for (let i = 0; i < props.length; ++i) {
            const prop = props[i];
            storeDispatch[prop] = this._wrapDispatch(prop, <any>spec[prop]);
        }
        this.action = <any>((store) => {
            this._saveStore = store;
            return storeDispatch;
        });
    }

    public createStore (state:MuRDAStructTypes<Spec>['state']) : MuRDAStructStore<Spec, this> {
        const stores:any = {};
        const ids = Object.keys(this.rdas);
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            stores[id] = this.rdas[id].createStore(state[id]);
        }
        return new MuRDAStructStore<Spec, this>(stores);
    }

    public parse (store:MuRDAStructTypes<Spec>['store']) : MuRDAStructStore<Spec, this> {
        const stores:any = {};
        const ids = Object.keys(this.rdas);
        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            stores[id] = this.rdas[id].parse(store[id]);
        }
        return new MuRDAStructStore<Spec, this>(stores);
    }
}
