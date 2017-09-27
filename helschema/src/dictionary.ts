import { HelSchema } from './schema';
import { HelDictionary } from './_dictionary';

export = function <ValueSchema extends HelSchema<any>> (
    valueModel:ValueSchema,
    identity?:{ [prop:string]:ValueSchema['identity'] }) {
    return new HelDictionary<ValueSchema>(identity || {}, valueModel);
};

