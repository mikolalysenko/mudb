import { HelSchema } from './schema';
import { HelUnion } from './_union';

/** Constructs a schema for the union of several labeled schemas */
export = function<SubTypes extends {[key:string]:HelSchema<any>}> (subtypes:SubTypes, identityType?:keyof SubTypes, identityData?:SubTypes[keyof SubTypes]['identity']) {
    return new HelUnion<SubTypes>(
        subtypes,
        {
            type: identityType || '',
            data: (identityData && identityType ? subtypes[identityType].clone(identityData) : null),
        }
    );
}