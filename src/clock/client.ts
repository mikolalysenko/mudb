import { MuClient, MuClientProtocol } from '../core/client';
import { MuClockProtocol } from './schema';
import { MuClock } from './clock';

const DEFAULT_TICK_RATE = 60;
const DEFAULT_PING_RATE = 300;
const DEFAULT_PING_BUFFER_SIZE = 1024;

const DEFAULT_FRAME_SKIP = Infinity;

const ric = (typeof window !== 'undefined' && (<any>window).requestIdleCallback) ||
    ((cb, { timeout }) => setTimeout(cb, timeout));
const cic = (typeof window !== 'undefined' && (<any>window).cancelIdleCallback) || clearTimeout;

// ping = average of all samples within +/- standard deviation of median
const scratchBuffer:number[] = [];
function compareNum (a:number, b:number) { return a - b; }
function calcDelay (samples:number[]) {
    const N = scratchBuffer.length = samples.length;
    let m0 = 0;
    let m1 = 0;
    for (let i = 0; i < N; ++i) {
        const x = scratchBuffer[i] = samples[i];
        m0 += x;
        m1 += x * x;
    }
    m0 /= N;
    m1 /= N;
    const sigma = Math.sqrt(m1 - m0 * m0);
    scratchBuffer.sort(compareNum);
    const med = scratchBuffer[N >>> 1];
    let total = 0;
    let count = 0;
    for (let i = 0; i < samples.length; ++i) {
        const x = samples[i];
        if (Math.abs(x - med) <= sigma) {
            total += x;
            count ++;
        }
    }
    return total / count;
}

export class MuClockClient {
    private _protocol:MuClientProtocol<typeof MuClockProtocol>;
    private _clock:MuClock = new MuClock();

    private _pingInterval:any;

    private _delay:number = 0;
    private _pingSamples:number[] = [];
    private _numPings = 0;

    private _onTick:(t:number) => void;

    public readonly tickRate:number = DEFAULT_TICK_RATE;
    public ping:number = 0;
    public maxPingSamples:number;
    public skippedFrames = 0;
    public frameSkip:number = DEFAULT_FRAME_SKIP;
    public monotone:boolean = true;

    private _started = false;
    private _tickCount = 0;

    private _pollHandle:any;
    private _poll = () => {
        this._pollHandle = ric(this._poll, { timeout: 0.5 * this.tickRate });
        this.poll();
    }

    constructor(spec:{
        client:MuClient,
        ready?:() => void,
        tick?:(t:number) => void,
        pingRate?:number,
        pingBufferSize?:number,
        frameSkip?:number,
        enableRewind?:boolean,
    }) {
        this._protocol = spec.client.protocol(MuClockProtocol);
        this._onTick = spec.tick || function () { };

        if (spec.frameSkip) {
            this.frameSkip = spec.frameSkip | 0;
        }
        this.monotone = !spec.enableRewind;
        this.maxPingSamples = spec.pingBufferSize || DEFAULT_PING_BUFFER_SIZE;

        this._protocol.configure({
            message: {
                init: ({ tickRate, serverClock, skippedFrames }) => {
                    this._clock.reset(serverClock);
                    (<any>this).tickRate = tickRate;
                    this.skippedFrames = skippedFrames;
                    this._tickCount = Math.floor(serverClock / tickRate) - skippedFrames;
                    this._started = true;

                    // fire initial ping burst
                    for (let i = 0; i < 5; ++i) {
                        this._doPing();
                    }
                    this._pingInterval = setInterval(() => this._doPing(), spec.pingRate || DEFAULT_PING_RATE);

                    this._pollHandle = ric(this._poll, { timeout: 0.5 * this.tickRate });
                    if (spec.ready) {
                        spec.ready();
                    }
                },
                frameSkip: (skippedFrames) => {
                    this.skippedFrames = Math.max(skippedFrames, this.skippedFrames);
                },
                pong: ({ clientClock, serverClock, skippedFrames }) => {
                    const now = this._clock.now();
                    const delay = serverClock - 0.5 * (now + clientClock);
                    this.ping = now - clientClock;
                    this.skippedFrames = Math.max(this.skippedFrames, skippedFrames);
                    if (this._pingSamples.length < this.maxPingSamples) {
                        this._pingSamples.push(delay);
                        this._numPings++;
                    } else {
                        this._pingSamples[this._numPings++ % this._pingSamples.length] = delay;
                    }
                    this._delay = calcDelay(this._pingSamples);
                },
            },
            close: () => {
                cic(this._pollHandle);
                clearInterval(this._pingInterval);
            },
        });
    }

    private _doPing() {
        this._protocol.server.message.ping(this._clock.now());
    }

    // call this once per-frame on the client to ensure that clocks are synchronized
    private _lastNow:number = 0;
    private _simulationClock() : number {
        const remoteClock = Math.max(
            this._clock.now() + this._delay,
            this._lastNow + 1e-6);
        this._lastNow = remoteClock;
        return remoteClock;
    }

    public poll () {
        if (!this._started) {
            return;
        }
        const ticksSmooth = this._simulationClock() / this.tickRate - this.skippedFrames;
        const targetTickCount = Math.floor(ticksSmooth);
        if (targetTickCount > 0) {
            const ticks = targetTickCount - this._tickCount;
            if ((ticks > this.frameSkip) || // fast forward
                (ticks < 0 && !this.monotone && targetTickCount > 0)) { // rewind
                this._tickCount = targetTickCount;
                this._onTick(this._tickCount);
            } else {
                while (this._tickCount < targetTickCount) {
                    this._onTick(++this._tickCount);
                }
            }
        }
    }

    // System clock
    public now () : number {
        if (!this._started) {
            return 0;
        }
        return this._clock.now();
    }

    // Simulation clock
    public tick () : number {
        if (!this._started) {
            return 0;
        }
        return Math.max(
                0,
                Math.min(
                    this._tickCount + 1,
                    this._simulationClock() / this.tickRate - this.skippedFrames));
    }
}
