import HelModel from 'helschema/model';

export function pushState<State> (stateSet:HelStateSet<State>, tick:number, state:State) {
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
