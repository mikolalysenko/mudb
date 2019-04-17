import {
    MuScheduler,
    MuRequestAnimationFrame,
    MuCancelAnimationFrame,
    MuRequestIdleCallback,
    MuCancelIdleCallback,
    MuProcessNextTick,
} from './scheduler';
import { NIL, PQEvent, pop, createNode, merge, decreaseKey } from './pq';
import { perfNow } from './perf-now';

const frameDuration = 1000 / 60;

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

    public setTimeout = (callback:() => void, ms:number) : number => {
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

    public setInterval = (callback:() => void, ms:number) : number => {
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
    public requestAnimationFrame:MuRequestAnimationFrame = (callback) => {
        const now_ = perfNow();
        const timeout = Math.max(0, frameDuration - (now_ - this._rAFLast));
        const then = this._rAFLast = now_ + timeout;

        return this.setTimeout(() => callback(then), Math.round(timeout));
    }

    public cancelAnimationFrame:MuCancelAnimationFrame = this.clearTimeout;

    public requestIdleCallback:MuRequestIdleCallback = (callback, options?) => {
        const timeout = options ? options.timeout : 1;
        return this.setTimeout(() => {
            const start = perfNow();
            callback({
                didTimeout: false,
                timeRemaining: () => Math.max(0, 50 - (perfNow() - start)),
            });
        }, timeout);
    }

    public cancelIdleCallback:MuCancelIdleCallback = this.clearTimeout;

    public nextTick:MuProcessNextTick = (callback) => {
        this.setTimeout(callback, 0);
    }
}
