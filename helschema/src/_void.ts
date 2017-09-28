import { HelSchema } from './schema';

/** The empty type */
export class HelVoid implements HelSchema<void> {
    public readonly identity:void;
    public readonly helType = 'void';

    alloc () {}
    free () {}
    clone () {}
    diff () {}
    patch () {}
}