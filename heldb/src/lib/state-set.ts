import HelModel from 'helschema/model';

export function pushState<State> (stateSet:HelStateSet<State>, tick:number, state:State) {
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

export function destroyStateSet<State> (model:HelModel<State>, {states, ticks}:HelStateSet<State>) {
    for (let i = 0; i < states.length; ++i) {
        model.free(states[i]);
    }
    states.length = 0;
    ticks.length = 0;
}

export function garbageCollectStates<State> (model:HelModel<State>, stateSet:HelStateSet<State>, tick:number) : boolean {
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
        for (let i = this.ticks.length - 1; i >= 0; --i) {
            if (this.ticks[i] <= tick) {
                return i;
            }
        }
        return -1;
    }
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