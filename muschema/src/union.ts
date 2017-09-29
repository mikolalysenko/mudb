import { MuSchema } from './schema';
import { MuUnion } from './_union';

/** Constructs a schema for the union of several labeled schemas */
export = function<SubTypes extends {[key:string]:MuSchema<any>}> (subtypes:SubTypes, identityType?:keyof SubTypes, identityData?:SubTypes[keyof SubTypes]['identity']) {
    return new MuUnion<SubTypes>(
        subtypes,
        {
            type: identityType || '',
            data: (identityData && identityType ? subtypes[identityType].clone(identityData) : null),
        }
    );
}