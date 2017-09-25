import { HelSchema } from './schema';
import { HelDictionary } from './_dictionary';

export = function <ValueType, ValueSchema extends HelSchema<ValueType>> (
    valueModel:ValueSchema,
    identity?:{ [prop:string]:ValueType }) {
    return new HelDictionary<ValueType, ValueSchema>(identity || {}, valueModel);
};

