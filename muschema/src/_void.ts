import { MuSchema } from './schema';

/** The empty type */
export class MuVoid implements MuSchema<void> {
    public readonly identity:void;
    public readonly muType = 'void';

    alloc () {}
    free () {}
    clone () {}
    diff () {}
    patch () {}
}