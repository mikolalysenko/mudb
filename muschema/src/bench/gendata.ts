import { MuWriteStream, MuReadStream } from 'mustreams';
import {
    randomValueOf,
} from '../_helper';

export function createWriteStreams (numStreams:number) : MuWriteStream[] {
    const result = new Array(numStreams);
    for (let i = 0; i < numStreams; ++i) {
        result[i] = new MuWriteStream(1);
    }
    return result;
}

export function createReadStreams (outStreams:MuWriteStream[]) : MuReadStream[] {
    const result = new Array(outStreams.length);
    for (let i = 0; i < outStreams.length; ++i) {
        result[i] = new MuReadStream(outStreams[i].bytes());
        outStreams[i].destroy();
    }
    return result;
}

export function genArray (muType:string, length:number) {
    const result = new Array(length);
    for (let i = 0; i < length; ++i) {
        result[i] = randomValueOf(muType);
    }
    return result;
}
