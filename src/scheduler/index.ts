import { MuScheduler } from './scheduler';
import { NIL, PQEvent, pop, createNode, merge, decreaseKey } from './pq';

export const MuSystemScheduler:MuScheduler = {
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
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

    public setTimeout = (event:() => void, ms:number) => {
        const id = this._timeoutCounter++;
        const time = 1 + this._mockMSCounter + Math.max(ms, 0);
        const node = createNode(id, time, event);
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

    public setInterval = (cb:() => void, ms:number) => {
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
            cb();
        }

        insertNode();

        return id;
    }

    public clearInterval = this.clearTimeout;
}
