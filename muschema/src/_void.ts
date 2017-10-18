import { MuSchema } from './schema';

/** The empty type */
export class MuVoid implements MuSchema<void> {
    public readonly identity:void;
    public readonly muType = 'void';
    public readonly json = {
        type: 'void',
    };

    alloc () {}
    free () {}
    clone () {}
    diff () {}
    patch () {}
}