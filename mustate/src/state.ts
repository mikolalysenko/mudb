import { MuSchema } from 'muschema/schema';
import { MuUint32 } from 'muschema/uint32';
import { MuWriteStream, MuReadStream } from 'mustreams';

export type MuAnySchema = MuSchema<any>;

export interface MuStateSchema<
    ClientSchema extends MuAnySchema,
    ServerSchema extends MuAnySchema> {
    client:ClientSchema;
    server:ServerSchema;
}

export const MuDefaultStateSchema = {
    client:{
        ackState: new MuUint32(),
        forgetState: new MuUint32(),
    },
    server:{
        ackState: new MuUint32(),
        forgetState: new MuUint32(),
    },
};

export class MuStateSet<State> {
    public ticks:number[] = [];
    public states:State[] = [];

    constructor (initialState:State) {
        this.ticks.push(0);
        this.states.push(initialState);
    }

    // retrieves the state at tick
    public at (tick:number) : number {
        // FIXME: replace with binary search
        for (let i = this.ticks.length - 1; i >= 0; --i) {
            if (this.ticks[i] <= tick) {
                return i;
            }
        }
        return -1;
    }
}

export interface MuStateReplica<Schema extends MuAnySchema> {
    tick:number;
    state:Schema['identity'];
    history:MuStateSet<Schema['identity']>;
    windowSize:number;
}

// store tick and state in stateSet while keeping all ticks in increasing order
function pushState<State> (stateSet:MuStateSet<State>, tick:number, state:State) {
    const {ticks, states} = stateSet;
    ticks.push(tick);
    states.push(state);
    for (let i = ticks.length - 1; i >= 1; --i) {
        if (ticks[i - 1] > tick) {
            ticks[i] = ticks[i - 1];
            states[i] = states[i - 1];
        } else {
            ticks[i] = tick;
            states[i] = state;
            return;
        }
    }
}

export function garbageCollectStates<State> (model:MuSchema<State>, stateSet:MuStateSet<State>, tick:number) : boolean {
    const { ticks, states } = stateSet;
    let ptr = 1;
    for (let i = 1; i < ticks.length; ++i) {
        if (ticks[i] < tick) {
            model.free(states[i]);
        } else {
            ticks[ptr] = ticks[i];
            states[ptr] = states[i];
            ptr ++;
        }
    }
    const modified = ptr === ticks.length;
    ticks.length = states.length = ptr;
    return modified;
}

const _pointers:number[] = [];
const _heads:number[] = [];
function mostRecentCommonState (states:number[][]) : number {
    _pointers.length = states.length;
    _heads.length = states.length;
    for (let i = 0; i < states.length; ++i) {
        _pointers[i] = states[i].length - 1;
        _heads[i] = states[i][states[i].length - 1];
    }

    while (true) {
        let largestIndex = 0;
        let largestValue = _heads[0];
        let allEqual = true;
        for (let i = 1; i < states.length; ++i) {
            const v = _heads[i];
            allEqual = allEqual && (v === largestValue);
            if (v > largestValue) {
                largestIndex = i;
                largestValue = v;
            }
        }

        if (allEqual) {
            return largestValue;
        }

        _heads[largestIndex] = states[largestIndex][--_pointers[largestIndex]];
    }
}

// add a new tick while keeping all ticks in increasing order
export function addObservation (ticks:number[], newTick:number) {
    ticks.push(newTick);
    for (let i = ticks.length - 2; i >= 0; --i) {
        if (ticks[i] < newTick) {
            ticks[i + 1] = newTick;
            break;
        } else if (ticks[i] > newTick) {
            ticks[i + 1] = ticks[i];
        } else {
            break;
        }
    }
}

// remove ticks that are below horizon, except the first one
export function forgetObservation (ticks:number[], horizon:number) {
    let pointer = 1;
    for (let i = 1; i < ticks.length; ++i) {
        if (ticks[i] >= horizon) {
            ticks[pointer] = ticks[i];
            pointer++;
        }
    }
    ticks.length = pointer;
}

export function parseState<Schema extends MuAnySchema> (
    packet:Uint8Array,
    schema:Schema,
    replica:MuStateReplica<Schema>,
    ack:(tick:number, unreliable?:boolean) => void,
) : boolean {
    const { history, windowSize, state } = replica;

    const stream = new MuReadStream(packet);

    const nextTick = stream.readUint32();
    // check that nextTick is valid
    for (let i = 0; i < history.ticks.length; ++i) {
        const x = history.ticks[i];
        if (x === nextTick) {
            return false;
        }
    }

    // check the most significant bit of baseTick to see if there is a patch
    const baseTick = stream.readUint32();
    const baseIndex = history.at(baseTick);
    if (history.ticks[baseIndex] !== baseTick) {
        console.error('bad state packet');
        return false;
    }
    const baseState = history.states[baseIndex];

    let nextState:Schema['identity'];
    if (stream.offset < stream.length) {
        nextState = schema.patch(baseState, stream);
    } else {
        nextState = schema.clone(baseState);
    }

    pushState(history, nextTick, nextState);
    ack(nextTick, true);

    const horizon = Math.min(baseTick, Math.max(nextTick, replica.tick) - windowSize + 1);
    garbageCollectStates(schema, history, horizon);

    if (nextTick > replica.tick) {
        replica.state = nextState;
        replica.tick = nextTick;
        return true;
    }
    return false;
}

export function publishState<Schema extends MuAnySchema> (
    schema:Schema,
    observations:number[][],
    replica:MuStateReplica<Schema>,
    raw:(data:Uint8Array|string, unreliable?:boolean) => void,
    forget:(horizon:number, unreliable?:boolean) => void,
    reliable:boolean,
) {
    const { history, windowSize, state } = replica;

    observations.push(history.ticks);
    const baseTick = mostRecentCommonState(observations);
    observations.pop();

    const baseIndex = history.at(baseTick);
    const baseState = history.states[baseIndex];

    const nextTick = ++replica.tick;

    pushState(history, nextTick, schema.clone(state));

    const stream = new MuWriteStream(128);

    stream.writeUint32(nextTick);
    const prefixOffset = stream.offset;
    stream.writeUint32(baseTick);

    schema.diff(baseState, state, stream);
    const contentBytes = stream.bytes();
    raw(contentBytes, !reliable);

    stream.destroy();

    // update window
    const horizon = Math.min(baseTick, nextTick - windowSize + 1);
    if (garbageCollectStates(schema, history, horizon)) {
        forget(horizon, !reliable);
    }

    return baseTick;
}
