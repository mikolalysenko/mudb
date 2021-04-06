import { MuRDA, MuRDATypes } from './rda';

export function clonePatch<RDA extends MuRDA<any, any, any, any>> (rda:RDA, patch:MuRDATypes<RDA>['patch']) {
    return patch.map((action) => rda.actionSchema.clone(action));
}