const scratchSortBuffer:number[] = [];

function compare (a:number, b:number) { return a - b; }

export function pushSample (stats:HelStatistic, value:number) {
    const {
        samples,
        maxSamples
    } = stats;

    // insert value into samples
    if (samples.length >= maxSamples) {
        for (let i = 1; i < samples.length; ++i) {
            samples[i - 1] = samples[i];
        }
        samples[samples.length - 1] = value;
    } else {
        samples.push(value);
    }

    // sort values
    const N = scratchSortBuffer.length = samples.length;
    for (let i = 0; i < N; ++i) {
        scratchSortBuffer[i] = samples[i];
    }
    scratchSortBuffer.sort(compare);

    // update order statistics
    stats.count += 1;
    stats.min = scratchSortBuffer[0];
    stats.max = scratchSortBuffer[scratchSortBuffer.length - 1];
    stats.median = scratchSortBuffer[Math.floor(scratchSortBuffer.length / 2)];

    // compute mode, average and std. dev
    let sum = 0;
    let sum2 = 0;
    
    let curRunLength = 0;
    let curRunValue = NaN;

    let bestRunLength = 0;
    let bestRunValue = NaN;

    for (let i = 0; i < N; ++i) {
        const v = scratchSortBuffer[i];

        sum += v;
        sum2 += v * v;

        if (v === curRunValue) {
            curRunLength += 1;
        } else {
            if (curRunLength > bestRunLength) {
                bestRunLength = curRunLength;
                bestRunValue = curRunValue;
            }
            curRunLength = 1;
            curRunValue = v;
        }
    }

    stats.average = sum / N;
    stats.stddev = Math.sqrt(sum2 / N - Math.pow(stats.average, 2));

    if (curRunLength > bestRunLength) {
        stats.mode = curRunValue;
    } else {
        stats.mode = bestRunValue;
    }
}

export class HelStatistic {
    // size of statistic buffer
    public readonly maxSamples:number;

    // sample buffer
    public samples:number[] = [];
    public count:number = 0;

    // statisticis
    public min:number = NaN;
    public max:number = NaN;
    public mode:number = NaN;
    public median:number = NaN;
    public average:number = NaN;
    public stddev:number = NaN;

    constructor (maxSamples?:number) {
        this.maxSamples = maxSamples || 1024;
    }
}