import { MuClient, MuClientProtocol } from 'mudb/client';
import { MuClockProtocol } from './schema';
import { MuClock } from './clock';

// what do we need to know?
//
//  ping
//  current tick
//  process ticks as they occur
//

export class MuClockClient {
    public tick:number = 0;

    private _clock:MuClock = new MuClock();

    private _clockScale:number = 1;
    private _clockShift:number = 0;

    private _tickRate:number = 30;
    private _pingRate:number = 1000;

    private _localTimeSamples:number[] = [];
    private _remoteTimeSamples:number[] = [];
    private _pingTimes:number[] = [];

    private _protocol:MuClientProtocol<typeof MuClockProtocol>;

    private _lastPingStart:number = 0;

    private _pingCount:number = 0;
    private _tickCount:number = 0;

    private _doTick:(t:number) => void = function () {};

    constructor(spec:{
        client:MuClient,
        ready?:() => void,
        tick?:(t:number) => void,
        pingRate?:number,
        pollRate?:number,
    }) {
        this._protocol = spec.client.protocol(MuClockProtocol);

        this._lastPingStart = this._clock.now();

        this._protocol.configure({
            message: {
                init: ({ tickRate, serverClock }) => {
                    this._localTimeSamples.push(this._lastPingStart);
                    this._remoteTimeSamples.push(serverClock);
                    this._lastPingStart = 0;

                    this._tickRate = tickRate;
                    this._tickCount = Math.floor(serverClock / tickRate);

                    // fire initial ping
                    this._doPing();

                    // start poll interval
                    if ('pollRate' in spec) {
                    }

                    if (spec.ready) {
                        spec.ready();
                    }
                },
                ping: this._protocol.server.message.pong,
                pong: (serverClock) => {
                    const localClock = this._lastPingStart;
                    const rtt = this._clock.now() - localClock;
                    this._pingTimes.push(rtt);
                    this._localTimeSamples.push(localClock);
                    this._remoteTimeSamples.push(serverClock);
                    this._lastPingStart = 0;
                },
            }
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

    public poll () {
        const localClock = this._clock.now();
        const remoteClock = Math.max(
            localClock * this._clockScale + this._clockShift,
            this._lastNow + 1e-6);
        this._lastNow = remoteClock;

        const targetPingCount = Math.floor(localClock / this._pingCount);
        const targetTickCount = Math.floor(remoteClock / this._tickRate);

        if (this._pingCount < targetPingCount) {
            this._doPing();
        }

        while (this._tickCount < targetTickCount) {
            this._doTick(++this._tickCount);
        }
    }

    // queries the clock to get a ping
    public now () {
        const t = this._clockScale * this._clock.now() + this._clockShift;
        const result = Math.max(t, this._lastNow + 1e-6);
        this._lastNow = result;
        return result;
    }

    public ping () {
    }
}
