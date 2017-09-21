import HelModel from 'helschema/model';

export function pushState<State> (stateSet:HelStateSet<State>, tick:number, state:State) {
    const {ticks, states} = stateSet;
    ticks.push(tick);
    states.push(state);
    let ptr = ticks.length - 2;
    for (; ptr >= 1; --ptr) {
        if (ticks[ptr] <= tick) {
            break;
        }
        ticks[ptr + 1] = ticks[ptr];
        states[ptr + 1] = states[ptr];
    }
    ticks[ptr + 1] = tick;
    states[ptr + 1] = state;
}

export function destroyStateSet<State> (model:HelModel<State>, {states, ticks}:HelStateSet<State>) {
    for (let i = 0; i < states.length; ++i) {
        model.free(states[i]);
    }
    states.length = 0;
    ticks.length = 0;
}

export function garbageCollectStates<State> (model:HelModel<State>, stateSet:HelStateSet<State>, tick:number) {
    const { ticks, states } = stateSet;
    let ptr = 1;
    while (ptr < ticks.length) {
        if (ticks[ptr] < tick) {
            model.free(states[ptr++]);
        } else {
            break;
        }
    }
    let dptr = 1;
    while (ptr < ticks.length) {
        ticks[dptr] = ticks[ptr];
        states[dptr] = states[dptr];
        ++ptr;
        ++dptr;
    }
    ticks.length = dptr;
    states.length = dptr;
}

export class HelStateSet<State> {
    public ticks:number[] = [];
    public states:State[] = [];

    constructor (initialState:State) {
        this.ticks.push(0);
        this.states.push(initialState);
    }

    // retrieves the state at tick
    public at (tick:number) : number {
        // FIXME: replace with binary search
        for (let i = 0; i < this.ticks.length; ++i) {
            if (this.ticks[i] <= tick) {
                return i;
            }
        }
        return -1;
    }
}

export function updateStateSet (states:number[], add:number[], drop:number[]) {
    // add states

    // remove states
}

const _pointers:number[] = [];
const _heads:number[] = [];
export function mostRecentCommonState (states:number[][]) : number {
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