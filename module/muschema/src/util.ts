import { muPrimitiveTypes } from './constants';

export function isMuPrimitive (muType:string) {
    return muPrimitiveTypes.indexOf(muType) > -1;
}
