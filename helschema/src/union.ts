import { HelSchema } from './schema';
import { HelUnion } from './_union';

export = function<SubTypes extends {[key:string]:HelSchema<any>}> (subtypes:SubTypes, identityType?:keyof SubTypes, identityData?:SubTypes[keyof SubTypes]['identity']) {
    return new HelUnion<SubTypes>(
        subtypes,
        {
            type: identityType || '',
            data: (identityData && identityType ? subtypes[identityType].clone(identityData) : null),
        }
    );
}
