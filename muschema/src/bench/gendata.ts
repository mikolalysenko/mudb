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

export function genDictionary (muType:string, numProps:number) {
    function propName () {
        const length = 10;
        const chars = new Array(length);
        for (let i = 0; i < length; ++i) {
            chars[i] = Math.random() * 26 + 97 | 0;
        }
        return String.fromCharCode.apply(String, chars);
    }

    const result = {};
    for (let i = 0; i < numProps; ++i) {
        result[propName()] = randomValueOf(muType);
    }
    return result;
}

export function changeValues<T extends object> (
    dict:T,
    muType:string,
) : T {
    const result = JSON.parse(JSON.stringify(dict));
    Object.keys(result).forEach((k) => {
        result[k] = randomValueOf(muType);
    });
    return result;
}

export function shallowMerge<T extends object> (target:T, source:T) : T {
    const result = JSON.parse(JSON.stringify(target));
    Object.keys(source).forEach((k) => {
        result[k] = source[k];
    });
    return result;
}
