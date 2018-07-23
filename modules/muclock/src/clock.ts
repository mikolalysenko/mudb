import now = require('right-now');

export class MuClock {
    private startTime:number = now();

    public now () {
        return now() - this.startTime;
    }

    public reset () {
        this.startTime = now();
    }
}
