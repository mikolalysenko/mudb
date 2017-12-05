// FIXME: use high performance counters when available
export class MuClock {
    public startTime:number;
    private _freezing_time:number;
    public now:Function;

    private _isFrozen:boolean;

    constructor () {
        this.startTime = Date.now();
        this._freezing_time = -1;
        this.now = this.livelyClock;
        this._isFrozen = false;
    }

    private livelyClock() {
        return Date.now() - this.startTime;
    }

    private frozenClock() {
        return this._freezing_time - this.startTime;
    }

    public pauseClock() {
        if (this._isFrozen) {
            console.log('clock has already paused');
            return;
        }
        this._isFrozen = true;
        this._freezing_time = Date.now();
        this.now = this.frozenClock;
    }
    public resumeClock() {
        if (!this._isFrozen) {
            console.log('clock already runnig');
            return;
        }
        this._isFrozen = false;
        this.startTime += Date.now() - this._freezing_time;
        this.now = this.livelyClock;

        this._freezing_time = -1;
    }

    public isFrozen() {
        return this._isFrozen;
    }
}
