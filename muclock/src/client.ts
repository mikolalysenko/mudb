import { MuClient, MuClientProtocol } from 'mudb/client';
import { MuClockProtocol } from './schema';
import { MuClock } from './clock';
import { MuPingStatistic } from './ping-statistic';
import { fitLine } from './fit-line';

const DEFAULT_PING_RATE = 500;
const DEFAULT_PING_BUFFER_SIZE = 1024;
const DEFAULT_CLOCK_BUFFER_SIZE = 1024;

export class MuClockClient {
    private _protocol:MuClientProtocol<typeof MuClockProtocol>;

    private _clock:MuClock = new MuClock();
    private _clockScale:number = 1;
    private _clockShift:number = 0;
    private _localTimeSamples:number[] = [];
    private _remoteTimeSamples:number[] = [];
    private _clockBufferSize:number;

    private _pollInterval:any;

    private _pingStatistic:MuPingStatistic;
    private _pingCount:number = 0;
    private _lastPing:number = 0;
    private _lastPong:number = 0;
    private _pingRate:number;

    public tickRate:number = 30;
    private _tickCount:number = 0;

    private _started = false;

    private _onTick:(t:number) => void = function () {};

    constructor(spec:{
        client:MuClient,
        ready?:() => void,
        tick?:(t:number) => void,
        pingRate?:number,
        pollRate?:number,
        pingBufferSize?:number,
        clockBufferSize?:number,
    }) {
        this._protocol = spec.client.protocol(MuClockProtocol);
        this._clockBufferSize = spec.clockBufferSize || DEFAULT_CLOCK_BUFFER_SIZE;
        this._pingStatistic = new MuPingStatistic(spec.pingBufferSize || DEFAULT_PING_BUFFER_SIZE);
        this._pingRate = spec.pingRate || DEFAULT_PING_RATE;

        if (spec.tick) {
            this._onTick = spec.tick;
        }

        this._protocol.configure({
            message: {
                init: ({ tickRate, serverClock }) => {
                    this._clock.reset();

                    this._started = true;

                    this.tickRate = tickRate;
                    this._tickCount = Math.floor(serverClock / tickRate);
                    this._clockShift = serverClock;

                    // fire initial ping
                    this._doPing();

                    // start poll interval unless spec.pollRate == 0
                    let pollRate = Math.floor(this.tickRate / 2);
                    if ('pollRate' in spec) {
                        pollRate = spec.pollRate || 0;
                    }
                    if (pollRate) {
                        this._pollInterval = setInterval(() => this.poll(), pollRate);
                    }

                    if (spec.ready) {
                        spec.ready();
                    }
                },
                ping: (id) => this._protocol.server.message.pong(id),
                pong: (serverClock) => {
                    this._lastPong = this._clock.now();
                    const rtt = this._lastPong - this._lastPing;
                    this._pingStatistic.addSample(rtt);
                    this._addTimeObservation(serverClock, this._lastPong + 0.5 * rtt);
                },
            },
            close: () => {
                if (this._pollInterval) {
                    clearInterval(this._pollInterval);
                }
            },
        });
    }

    private _addTimeObservation (serverClock, localClock) {
        if (this._localTimeSamples.length < this._clockBufferSize) {
            this._localTimeSamples.push(localClock);
            this._remoteTimeSamples.push(serverClock);
        } else {
            const idx = (this._pingCount - 1) % this._clockBufferSize;
            this._localTimeSamples[idx] = localClock;
            this._remoteTimeSamples[idx] = serverClock;
        }
        const {a, b} = fitLine(this._localTimeSamples, this._remoteTimeSamples);
        this._clockScale = a;
        this._clockShift = b;
    }

    private _doPing () {
        this._lastPing = this._clock.now();
        this._protocol.server.message.ping(void 0);
        this._pingCount += 1;
    }

    // call this once per-frame on the client to ensure that clocks are synchronized
    private _lastNow:number = 0;
    private _simulationClock() : number {
        const remoteClock = Math.max(
            this._clock.now() * this._clockScale + this._clockShift + this._pingStatistic.median,
            this._lastNow + 1e-6);
        this._lastNow = remoteClock;
        return remoteClock;
    }

    public poll () {
        if (!this._started) {
            return;
        }

        if (this._lastPong + this._pingRate < this._clock.now()) {
            this._doPing();
        }

        const targetTickCount = Math.floor(this._simulationClock() / this.tickRate);
        while (this._tickCount < targetTickCount) {
            this._onTick(++this._tickCount);
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
        return Math.min(this._tickCount + 1, this._simulationClock() / this.tickRate);
    }

    public ping () : number {
        return this._pingStatistic.median;
    }
}
