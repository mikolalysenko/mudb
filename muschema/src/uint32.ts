import { MuNumber } from './_number';
/** Unsigned 32-bit integer schema */
export = (x?:number) => new MuNumber('uint32', x || 0);