import now = require('right-now');

import {
    MuScheduler,
    MuRequestAnimationFrame,
    MuCancelAnimationFrame,
    MuRequestIdleCallback,
    MuCancelIdleCallback,
} from './scheduler';
import { NIL, PQEvent, pop, createNode, merge, decreaseKey } from './pq';

const root = typeof self === 'object' ? self : global;
const frameDuration = 1000 / 16;

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
            const now_ = now();
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
        const start = now();
        cb({
            didTimeout: false,
            timeRemaining: () => Math.max(0, 50 - (now - start)),
        });
    }, 1);

    cIC = (handle) => clearTimeout(handle);
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
};

export class MuMockScheduler implements MuScheduler {
    private _eventQueue = NIL;
    private _timeoutCounter:number = 0;
    private _mockMSCounter = 0;
    private _idToEvent:{ [id:number]:PQEvent } = {};

    public now () {
        return this._mockMSCounter;
    }

    public step (count:number) {
        for (let i = 0; i < count; ++i) {
            if (this._eventQueue === NIL) {
                return;
            }
            this._mockMSCounter = this._eventQueue.time;
            const event = this._eventQueue.event;
            delete this._idToEvent[this._eventQueue.id];
            this._eventQueue = pop(this._eventQueue);
            event();
        }
    }

    public setTimeout = (callback:() => void, ms:number) => {
        const id = this._timeoutCounter++;
        const time = 1 + this._mockMSCounter + Math.max(ms, 0);
        const node = createNode(id, time, callback);
        this._idToEvent[id] = node;
        this._eventQueue = merge(this._eventQueue, node);
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
            self._eventQueue = merge(self._eventQueue, node);
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
        const now_ = now();
        const timeout = Math.max(0, frameDuration - (now_ - this._rAFLast));
        const then = this._rAFLast = now_ + timeout;

        return this.setTimeout(() => callback(then), Math.round(timeout));
    }

    public cancelAnimationFrame = this.clearTimeout;

    public requestIdleCallback = (callback) => this.setTimeout(() => {
        const start = now();
        callback({
            didTimeout: false,
            timeRemaining: () => Math.max(0, 50 - (now() - start)),
        });
    }, 1)

    public cancelIdleCallback = this.clearTimeout;
}
