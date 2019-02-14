import { MuRDA } from '../rda/rda';

export function rdaProtocol<RDA extends MuRDA<any, any, any, any>>(rda:RDA) {
    return {
        client: {
            init: rda.storeSchema,
            squash: rda.stateSchema,
            apply: rda.actionSchema,
        },
        server: {
            apply: rda.actionSchema,
        },
    };
}

export type RDAProtocol<RDA extends MuRDA<any, any, any, any>> = {
    client:{
        init:RDA['storeSchema'],
        squash:RDA['stateSchema'],
        apply:RDA['actionSchema'],
    },
    server:{
        apply:RDA['actionSchema'],
    },
};