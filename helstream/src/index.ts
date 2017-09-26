import { HelStream } from './_stream';

export = function (capacity:number) : HelStream {
    return new HelStream(capacity);
}