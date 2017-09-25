import HelModel from './model';
import { HelDictionary } from './_dictionary';

export = function <ValueType, ValueSchema extends HelModel<ValueType>> (
    valueModel:ValueSchema,
    identity?:{ [prop:string]:ValueType }) {
    return new HelDictionary<ValueType, ValueSchema>(identity || {}, valueModel);
};

