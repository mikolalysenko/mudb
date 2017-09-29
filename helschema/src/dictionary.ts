import { MuSchema } from './schema';
import { MuDictionary } from './_dictionary';

export = function <ValueSchema extends MuSchema<any>> (
    valueModel:ValueSchema,
    identity?:{ [prop:string]:ValueSchema['identity'] }) {
    return new MuDictionary<ValueSchema>(identity || {}, valueModel);
};

