function compareInt (a:number, b:number) { return a - b; }

export class MuPingStatistic {
    public bufferSize:number = 1024;
    public samples:number[] = [];

    public median:number = 0;

    public sampleCount:number = 0;

    private _sortedSamples:number[] = [];

    constructor (bufferSize:number) {
        this.bufferSize = bufferSize;
    }

    public addSample (sample:number) {
        if (this.samples.length >= this.bufferSize) {
            this.samples[this.sampleCount % this.bufferSize] = sample;
        } else {
            this.samples.push(sample);
        }

        this._sortedSamples.length = this.samples.length;
        for (let i = 0; i < this._sortedSamples.length; ++i) {
            this._sortedSamples[i] = this.samples[i];
        }
        this._sortedSamples.sort(compareInt);
        this.median = this._sortedSamples[Math.floor(this._sortedSamples.length / 2)];
    }
}
