import { MuClient, MuClientProtocol } from 'mudb/client';
import { MuClockProtocol } from './schema';
import { MuClock } from './clock';
import { MuPingStatistic } from './ping-statistic';
import { fitLine } from './fit-line';

// what do we need to know?
//
//  ping
//  current tick
//  process ticks as they occur
//

export class MuClockClient {
    private _clock:MuClock = new MuClock();

    private _clockScale:number = 1;
    private _clockShift:number = 0;

    public tickRate:number = 30;
    private _pingRate:number = 1000;

    private _localTimeSamples:number[] = [];
    private _remoteTimeSamples:number[] = [];
    private _clockBufferSize:number = 1024;

    private _pingStatistic:MuPingStatistic;

    private _protocol:MuClientProtocol<typeof MuClockProtocol>;

    private _lastPingStart:number = 0;
    private _pollInterval:any;

    private _pingCount:number = 0;
    private _tickCount:number = 0;

    private _doTick:(t:number) => void = function () {};
    private _doPause:(t:number) => void = function () {};
    private _doResume:(t:number) => void = function () {};

    private _isPause:boolean = false;

    constructor(spec:{
        client:MuClient,
        ready?:() => void,
        pause?:(t:number) => void,
        resume?:(t:number) => void,
        tick?:(t:number) => void,
        pingRate?:number,
        pollRate?:number,
        pingBufferSize?:number,
        clockBufferSize?:number,
    }) {
        this._protocol = spec.client.protocol(MuClockProtocol);

        this._pingStatistic = new MuPingStatistic(spec.pingBufferSize || 1024);
        this._clockBufferSize = spec.clockBufferSize || 1024;
        this._pingRate = spec.pingRate || 500;

        this._lastPingStart = this._clock.now();

        if (spec.tick) {
            this._doTick = spec.tick;
        }
        if (spec.pause) {
            this._doPause = spec.pause;
        }
        if (spec.resume) {
            this._doResume = spec.resume;
        }

        this._protocol.configure({
            message: {
                init: ({ tickRate, serverClock }) => {

                    this.tickRate = tickRate;
                    this._tickCount = Math.floor(serverClock / tickRate);
                    this._clockShift = serverClock - this._lastPingStart;

                    this._pingCount = Math.floor(this._clock.now() / this._pingRate);

                    this._lastPingStart = 0;

                    // fire initial ping
                    this._doPing();

                    // start poll interval
                    if ('pollRate' in spec) {
                        if (spec.pollRate) {
                            this._pollInterval = setInterval(() => this.poll(), spec.pollRate);
                        }
                    } else {
                        this._pollInterval = setInterval(() => this.poll(), 10);
                    }

                    if (spec.ready) {
                        spec.ready();
                    }
                },
                pause: (serverTick) => {
                    this.pause(serverTick);
                },
                resume: (serverTick) => {
                    this.resume(serverTick);
                },
                ping: (id) => this._protocol.server.message.pong(id),
                pong: (serverClock) => {
                    const localClock = this._lastPingStart;
                    const rtt = this._clock.now() - localClock;
                    this._pingStatistic.addSample(rtt);
                    if (this._localTimeSamples.length < this._clockBufferSize) {
                        this._localTimeSamples.push(localClock + 0.5 * rtt);
                        this._remoteTimeSamples.push(serverClock);
                    } else {
                        const idx = (this._pingCount - 1) % this._clockBufferSize;
                        this._localTimeSamples[idx] = localClock + 0.5 * rtt;
                        this._remoteTimeSamples[idx] = serverClock;
                    }
                    const {a, b} = fitLine(this._localTimeSamples, this._remoteTimeSamples);
                    this._clockScale = a;
                    this._clockShift = b;
                    this._lastPingStart = 0;
                },
            },
        });
    }

    private _doPing () {
        if (this._lastPingStart) {
            return;
        }
        this._lastPingStart = this._clock.now();
        this._protocol.server.message.ping(void 0);
        this._pingCount += 1;
    }

    // call this once per-frame on the client to ensure that clocks are synchronized
    private _lastNow:number = 0;

    private pause (serverTick) {
        this._clock.pauseClock();
        this._doPause(serverTick);
    }

    private resume (serverTick) {
        this._clock.resumeClock();
        this._doResume(serverTick);
    }

    private _remoteClock (localClock) : number {
        const remoteClock = Math.max(
            localClock * this._clockScale + this._clockShift + 2 * this._pingStatistic.median + this.tickRate,
            this._lastNow + 1e-6);
        this._lastNow = remoteClock;
        return remoteClock;
    }

    public poll () {
        if (this._isPause) {
            return;
        }
        const localClock = this._clock.now();
        const remoteClock = this._remoteClock(localClock);

        const targetPingCount = Math.floor(localClock / this._pingCount);
        const targetTickCount = Math.floor(remoteClock / this.tickRate);

        if (this._pingCount < targetPingCount) {
            this._doPing();
        }

        while (this._tickCount < targetTickCount) {
            this._doTick(++this._tickCount);
        }
    }

    // queries the clock to get a ping
    public tick () : number {
        const localClock = this._clock.now();
        return Math.min(this._tickCount + 1, this._remoteClock(localClock) / this.tickRate);
    }

    public ping () : number {
        return this._pingStatistic.median;
    }
}
