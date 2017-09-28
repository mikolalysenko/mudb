import { HelNumber } from './_number';
/** Unsigned 32-bit integer schema */
export = (x?:number) => new HelNumber('uint32', x || 0);