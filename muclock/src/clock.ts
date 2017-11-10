// FIXME: use high performance counters when available
export class MuClock {
    public startTime:number;

    constructor () {
        this.startTime = Date.now();
    }

    public now () {
        return Date.now() - this.startTime;
    }
}
