import {
    MuScheduler,
    MuRequestAnimationFrame,
    MuCancelAnimationFrame,
    MuRequestIdleCallback,
    MuCancelIdleCallback,
    MuProcessNextTick,
} from './scheduler';
import { NIL, PQEvent, pop, createNode, merge, decreaseKey } from './pq';

const root = (typeof self !== 'undefined' ? self : global) || {};
const frameDuration = 1000 / 60;

let perfNow:() => number;
if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    perfNow = () => performance.now();
} else if (typeof process !== 'undefined' && typeof process.hrtime === 'function') {
    perfNow = (() => {
        function nanoSeconds () {
            const hrt = process.hrtime();
            return hrt[0] * 1e9 + hrt[1];
        }
        const loadTime = nanoSeconds() - process.uptime() * 1e9;
        return () => (nanoSeconds() - loadTime) / 1e6;
    })();
} else if (typeof Date.now === 'function') {
    perfNow = (() => {
        const loadTime = Date.now();
        return () => Date.now() - loadTime;
    })();
} else {
    perfNow = (() => {
        const loadTime = new Date().getTime();
        return () => new Date().getTime() - loadTime;
    })();
}

let rAF:MuRequestAnimationFrame = root['requestAnimationFrame']
    || root['webkitRequestAnimationFrame']
    || root['mozRequestAnimationFrame'];
let cAF:MuCancelAnimationFrame = root['cancelAnimationFrame']
    || root['webkitCancelAnimationFrame']
    || root['mozCancelAnimationFrame']
    || root['webkitCancelRequestAnimationFrame']
    || root['mozCancelRequestAnimationFrame'];

// ported from https://github.com/chrisdickinson/raf/
if (!rAF || !cAF) {
    const queue:{
        handle:number,
        callback:(id:number) => void,
        cancelled:boolean,
    }[] = [];

    let last = 0;
    let id = 0;

    rAF = (callback) => {
        if (queue.length === 0) {
            const now_ = perfNow();
            const next = Math.max(0, frameDuration - (now_ - last));

            last = now_ + next;
            setTimeout(() => {
                const copy = queue.slice(0);
                queue.length = 0;

                for (let i = 0; i < copy.length; ++i) {
                    if (!copy[i].cancelled) {
                        try {
                            copy[i].callback(last);
                        } catch (e) {
                            setTimeout(() => { throw e; }, 0);
                        }
                    }
                }
            }, Math.round(next));
        }

        queue.push({
            handle: ++id,
            callback: callback,
            cancelled: false,
        });

        return id;
    };

    cAF = (handle) => {
        for (let i = 0; i < queue.length; ++i) {
            if (queue[i].handle === handle) {
                queue[i].cancelled = true;
            }
        }
    };
}

let rIC:MuRequestIdleCallback = root['requestIdleCallback'];
let cIC:MuCancelIdleCallback = root['cancelIdleCallback'];

// ported from https://gist.github.com/paullewis/55efe5d6f05434a96c36
if (!rIC || !cIC) {
    rIC = (cb) => setTimeout(() => {
        const start = perfNow();
        cb({
            didTimeout: false,
            timeRemaining: () => Math.max(0, 50 - (perfNow() - start)),
        });
    }, 1);

    cIC = (handle) => clearTimeout(handle);
}

let nextTick:MuProcessNextTick;
if (typeof process !== 'undefined' && typeof process.nextTick === 'function') {
    nextTick = process.nextTick;
} else if (typeof setImmediate === 'function') {
    nextTick = (cb) => {
        setImmediate(cb);
    };
} else {
    nextTick = (cb) => {
        setTimeout(cb, 0);
    };
}

export const MuSystemScheduler:MuScheduler = {
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
    requestAnimationFrame: rAF,
    cancelAnimationFrame: cAF,
    requestIdleCallback: rIC,
    cancelIdleCallback: cIC,
    nextTick: nextTick,
};

export class MuMockScheduler implements MuScheduler {
    private _eventQueue = NIL;
    private _timeoutCounter:number = 0;
    private _mockMSCounter = 0;
    private _idToEvent:{ [id:number]:PQEvent } = {};

    public now () {
        return this._mockMSCounter;
    }

    public poll () : boolean {
        if (this._eventQueue === NIL) {
            return false;
        }

        this._mockMSCounter = this._eventQueue.time;
        const event = this._eventQueue.event;
        delete this._idToEvent[this._eventQueue.id];
        this._eventQueue = pop(this._eventQueue);
        event();

        return true;
    }

    public setTimeout = (callback:() => void, ms:number) => {
        const id = this._timeoutCounter++;
        const time = 1 + this._mockMSCounter + Math.max(ms, 0);
        const node = createNode(id, time, callback);
        this._idToEvent[id] = node;
        this._eventQueue = merge(node, this._eventQueue);
        return id;
    }

    public clearTimeout = (id:number) => {
        const node = this._idToEvent[id];
        if (node) {
            this._eventQueue = decreaseKey(this._eventQueue, node, -Infinity);
            this._eventQueue = pop(this._eventQueue);
            delete this._idToEvent[id];
        }
    }

    public setInterval = (callback:() => void, ms:number) => {
        const id = this._timeoutCounter++;
        const self = this;

        function insertNode () {
            const time = 1 + self._mockMSCounter + Math.max(ms, 0);
            const node = createNode(id, time, event);
            self._idToEvent[id] = node;
            self._eventQueue = merge(node, self._eventQueue);
        }

        function event () {
            insertNode();
            callback();
        }

        insertNode();

        return id;
    }

    public clearInterval = this.clearTimeout;

    private _rAFLast = 0;
    public requestAnimationFrame = (callback) => {
        const now_ = perfNow();
        const timeout = Math.max(0, frameDuration - (now_ - this._rAFLast));
        const then = this._rAFLast = now_ + timeout;

        return this.setTimeout(() => callback(then), Math.round(timeout));
    }

    public cancelAnimationFrame = this.clearTimeout;

    public requestIdleCallback = (callback) => this.setTimeout(() => {
        const start = perfNow();
        callback({
            didTimeout: false,
            timeRemaining: () => Math.max(0, 50 - (perfNow() - start)),
        });
    }, 1)

    public cancelIdleCallback = this.clearTimeout;

    public nextTick = (callback) => {
        this.setTimeout(callback, 0);
    }
}
