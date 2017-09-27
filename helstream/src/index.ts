// import { HelStream } from './_stream';
import { HelStream } from './stream';

export = function (capacity:number) : HelStream {
    return new HelStream(capacity);
}