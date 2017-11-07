import { MuSchema } from 'muschema/schema';
import { MuUint32 } from 'muschema/uint32';

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

export function addObservation (ticks:number[], newTick:number) {
    ticks.push(newTick);
    for (let idx = ticks.length - 2; idx >= 0; --idx) {
        if (ticks[idx] < newTick) {
            ticks[idx + 1] = newTick;
            break;
        } else if (ticks[idx] > newTick) {
            ticks[idx + 1] = ticks[idx];
        } else {
            break;
        }
    }
}

export function forgetObservation (ticks:number[], horizon:number) {
    let ptr = 1;
    for (let i = 1; i < ticks.length; ++i) {
        if (ticks[i] >= horizon) {
            ticks[ptr] = ticks[i];
            ptr ++;
        }
    }
    ticks.length = ptr;
}

export function parseState<Schema extends MuAnySchema> (
    packet:any,
    schema:Schema,
    replica:MuStateReplica<Schema>,
    ack:(tick:number, unreliable?:boolean) => void) : boolean {
    const { history, state, tick, windowSize } = replica;
    if (typeof packet.nextTick !== 'number' ||
        typeof packet.baseTick !== 'number') {
        return false;
    }
    const nextTick = packet.nextTick;
    const baseTick = packet.baseTick;
    const baseIndex = history.at(baseTick);
    const baseState = history.states[baseIndex];

    // check that nextTick is valid
    for (let i = 0; i < history.ticks.length; ++i) {
        const x = history.ticks[i];
        if (x === nextTick) {
            return false;
        }
    }

    let nextState:Schema['identity'];
    if ('patch' in packet) {
        nextState = schema.patch(baseState, packet.patch);
    } else {
        nextState = schema.clone(baseState);
    }

    pushState(history, nextTick, nextState);
    ack(nextTick, true);

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
    reliable:boolean) {
    const { history, state, tick, windowSize } = replica;

    observations.push(history.ticks);
    const baseTick = mostRecentCommonState(observations);
    observations.pop();

    const baseIndex = history.at(baseTick);
    const baseState = history.states[baseIndex];

    const nextTick = ++replica.tick;

    const packet = JSON.stringify({
        nextTick,
        baseTick,
        patch: schema.diff(baseState, replica.state),
    });
    pushState(replica.history, nextTick, schema.clone(replica.state));
    raw(packet, !reliable);

    // update window
    const horizon = baseTick - windowSize;
    if (garbageCollectStates(schema, history, horizon)) {
        forget(horizon, !reliable);
    }
}
