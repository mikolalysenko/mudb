import { MuServer, MuServerProtocol, MuRemoteClientProtocol } from 'mudb/server';
import { MuClock } from './clock';
import { MuClockProtocol } from './schema';
import { MuPingStatistic } from './ping-statistic';

const DEFAULT_TICK_RATE = 30;
const DEFAULT_PING = 200;
const PING_BUFFER_SIZE = 256;
const DEFAULT_TIMEOUT = Infinity;
const DEFAULT_FRAMESKIP = Infinity;

function genUUID () {
    return Math.floor(Math.random() * 1e12) | 0;
}

class MuClockClientPingHandler {
    private _client:MuRemoteClientProtocol<typeof MuClockProtocol.client>;

    private _clock:MuClock;
    private _server:MuClockServer;

    private _pingStatistic:MuPingStatistic = new MuPingStatistic(PING_BUFFER_SIZE);

    private _lastPingUUID:number = 0;
    private _lastPing:number = 0;
    private _lastPong:number = 0;
    private _pingRate:number = 0;
    private _timeout:number;

    constructor (spec:{
        client:MuRemoteClientProtocol<typeof MuClockProtocol.client>;
        server:MuClockServer;
        clock:MuClock;
        pingRate:number;
        timeout:number;
    }) {
        this._client = spec.client;
        this._server = spec.server;
        this._clock = spec.clock;
        this._pingRate = spec.pingRate;
        this._timeout = spec.timeout;
    }

    public poll (now:number) {
        if (this._lastPong + this._timeout < now) {
            this._client.close();
            return;
        }
        if (this._lastPingUUID || this._lastPong + this._pingRate > now) {
            return;
        }
        this._lastPing = now;
        this._lastPingUUID = genUUID();
        this._client.message.ping(this._lastPingUUID);
    }

    public pong (uuid:number) {
        if (this._lastPingUUID === 0 || uuid !== this._lastPingUUID) {
            return;
        }
        this._lastPingUUID = 0;
        this._lastPong = this._clock.now();
        this._pingStatistic.addSample(this._lastPong - this._lastPing);
        this._server.ping[this._client.sessionId] = this._pingStatistic.median;
    }
}

export class MuClockServer {
    public tickRate:number = 30;

    public ping:{ [sessionId:string]:number } = {};

    private _clock:MuClock;
    private _tickCount:number = 0;
    private _protocol:MuServerProtocol<typeof MuClockProtocol>;

    private _pingRate:number = 1000;
    private _pingBufferSize:number = 256;

    private _pollInterval:any;
    private _onTick:(tick:number) => void = function () {};

    public frameSkip:number = DEFAULT_FRAMESKIP;
    private _skippedFrames:number = 0;

    private _clientPingHandlers:{ [sessionId:string]:MuClockClientPingHandler } = {};
    constructor (spec:{
        server:MuServer,
        defaultPing?:number,
        pingRate?:number,
        tickRate?:number,
        tick?:(t:number) => void,
        timeout?:number,
        pingBufferSize?:number,
        frameSkip?:number,
    }) {
        this._protocol = spec.server.protocol(MuClockProtocol);
        this._pingBufferSize = spec.pingBufferSize || 256;

        this._clock = new MuClock();

        if ('tickRate' in spec) {
            this.tickRate = spec.tickRate || 30;
        }
        if ('tick' in spec) {
            this._onTick = spec.tick || function () {};
        }
        if ('frameSkip' in spec) {
            this.frameSkip = +(spec.frameSkip || 0);
        }

        this._protocol.configure({
            ready: () => {
                this._pollInterval = setInterval(
                    () => this.poll(),
                    Math.min(this.tickRate, this._pingRate) / 2);
            },
            message: {
                ping: (client) => {
                    client.message.pong(this._clock.now());
                },
                pong: (client, uuid) => {
                    const handler = this._clientPingHandlers[client.sessionId];
                    handler.pong(uuid);
                },
            },
            connect: (client) => {
                client.message.init({
                    tickRate: this.tickRate,
                    serverClock: this._clock.now(),
                    skippedFrames: this._skippedFrames,
                });

                const pingClient = new MuClockClientPingHandler({
                    client,
                    server: this,
                    clock: this._clock,
                    pingRate: this._pingRate,
                    timeout: spec.timeout || DEFAULT_TIMEOUT,
                });

                this.ping[client.sessionId] = spec.defaultPing || DEFAULT_PING;
                this._clientPingHandlers[client.sessionId] = pingClient;
            },
            disconnect: (client) => {
                delete this.ping[client.sessionId];
                delete this._clientPingHandlers[client.sessionId];
            },
        });
    }

    public poll () {
        const now = this._clock.now();

        const ticksSmooth = now / this.tickRate - this._skippedFrames;
        const targetTick = Math.floor(ticksSmooth);
        const numTicks = targetTick - this._tickCount;

        if (numTicks <= this.frameSkip) {
            while (this._tickCount < targetTick) {
                this._onTick(++this._tickCount);
            }
        } else if (numTicks > 0) {
            this._skippedFrames += targetTick - this._tickCount - 1;
            this._tickCount = Math.floor(now / this.tickRate - this._skippedFrames);
            this._protocol.broadcast.frameSkip({
                skippedFrames: this._skippedFrames,
                serverClock: now,
            });
            this._onTick(this._tickCount);
        }

        const ids = Object.keys(this._clientPingHandlers);
        for (let i = 0; i < ids.length; ++i) {
            this._clientPingHandlers[ids[i]].poll(now);
        }
    }

    public tick () {
        if (this._clock) {
            const t = this._clock.now() / this.tickRate - this._skippedFrames;
            return Math.min(t, this._tickCount + 1);
        }
        return 0;
    }

    public now () {
        if (this._clock) {
            return this._clock.now();
        }
        return 0;
    }
}
