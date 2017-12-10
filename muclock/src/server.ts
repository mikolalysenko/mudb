import { MuServer, MuServerProtocol, MuRemoteClientProtocol } from 'mudb/server';
import { MuClock } from './clock';
import { MuClockProtocol } from './schema';
import { MuPingStatistic } from './ping-statistic';

class MuClockClientPingHandler {
    public protocolClient:MuRemoteClientProtocol<typeof MuClockProtocol.client>;
    public server:MuClockServer;
    public pingCount = -10;
    public connectTime:number = 0;
    public pingRate:number = 2500;
    public clock:MuClock;
    public statistic:MuPingStatistic;

    private _lastPingUUID:number = 0;
    private _lastPingStart:number = 0;
    private _pingTimeout:number = 5000;

    constructor (clock:MuClock, client, server:MuClockServer, connectTime:number, pingRate:number, statistic:MuPingStatistic) {
        this.clock = clock;
        this.protocolClient = client;
        this.server = server;
        this.connectTime = connectTime;
        this.pingRate = pingRate;
        this.statistic = statistic;
    }

    public pollPing () {
        if (this._lastPingStart) {
            return;
        }
        const startClock = this.now();
        const targetPing = Math.floor(startClock / this.pingRate);
        if (this.pingCount >= targetPing) {
            return;
        }

        // do ping operation
        this.pingCount += 1;
        this._lastPingStart = startClock;
        this._lastPingUUID = Math.floor(Math.random() * 1e10);
        this.protocolClient.message.ping(this._lastPingUUID);
        (function(startPingClock, pingHandler) {
            setTimeout(
                () => {
                    if (startPingClock === pingHandler._lastPingStart && startPingClock !== 0) {
                        pingHandler.server.timeout(pingHandler.protocolClient.sessionId);
                    }
            },  pingHandler._pingTimeout);
        })(startClock, this);
    }

    public now () {
        return this.clock.now() - this.connectTime;
    }

    public doPong (uuid:number) {
        if (uuid !== this._lastPingUUID || this._lastPingUUID === 0) {
            return;
        }

        const currentClock = this.now();
        const _lastPingStart = this._lastPingStart;
        const rtt = currentClock - _lastPingStart;

        this._lastPingUUID = 0;
        this._lastPingStart = 0;
        this.statistic.addSample(rtt);
        this.server.ping[this.protocolClient.sessionId] = this.statistic.median;
    }
}

export class MuClockServer {
    public tickRate:number = 30;

    public ping:{ [sessionId:string]:number } = {};
    public isTicking:boolean;

    private _clock:MuClock;
    private _tickCount:number = 0;
    private _protocol:MuServerProtocol<typeof MuClockProtocol>;

    private _pingRate:number = 1000;
    private _pingBufferSize:number = 256;

    private _pollInterval:any;
    private _onTick:(tick:number) => void = function () {};
    private _onLostClient:(sessionId:string) => void  = function() {};
    public timeout:(sessionId:string) => void = function() {};

    private _clientPingHandlers:{ [sessionId:string]:MuClockClientPingHandler } = {};
    constructor (spec:{
        server:MuServer,
        defaultPing?:number,
        pingRate?:number,
        tickRate?:number,
        tick?:(t:number) => void,
        timeout?:(sId:string) => void,
        pingBufferSize?:number,
    }) {
        this._protocol = spec.server.protocol(MuClockProtocol);
        this._pingBufferSize = spec.pingBufferSize || 256;

        if ('tickRate' in spec) {
            this.tickRate = spec.tickRate || 30;
        }
        if ('tick' in spec) {
            this._onTick = spec.tick || function () {};
        }
        if ('timeout' in spec) {
            this.timeout = spec.timeout || function() {};
        }

        this._protocol.configure({
            ready: () => {
                this._clock = new MuClock();
                this._pollInterval = setInterval(() => this.poll(), Math.min(this.tickRate, this._pingRate) / 2);
                this.isTicking = true;
            },
            message: {
                ping: (client) => {
                    client.message.pong(this._clock.now());
                },
                pong: (client, uuid) => {
                    const handler = this._clientPingHandlers[client.sessionId];
                    handler.doPong(uuid);
                },
            },
            connect: (client) => {
                client.message.init({
                    tickRate: this.tickRate,
                    serverClock: this._clock.now(),
                    isPause: this._clock.isFrozen(),
                });

                const pingClient = new MuClockClientPingHandler(
                    this._clock,
                    client,
                    this,
                    this._clock.now(),
                    this._pingRate,
                    new MuPingStatistic(this._pingBufferSize));

                this.ping[client.sessionId] = spec.defaultPing || 200;
                this._clientPingHandlers[client.sessionId] = pingClient;
            },
            disconnect: (client) => {
                this._onLostClient(client.sessionId);
                delete this.ping[client.sessionId];
                delete this._clientPingHandlers[client.sessionId];
            },
        });
    }

    public poll () {
        const targetTick = this.tick();
        while (this._tickCount < targetTick) {
            this._onTick(++this._tickCount);
        }

        Object.keys(this._clientPingHandlers).forEach((id) => {
            this._clientPingHandlers[id].pollPing();
        });
    }

    public tick () {
        return this._clock.now() / this.tickRate;
    }

    public pause () {
        this._clock.pauseClock();
        this._protocol.broadcast.pause(this._clock.now());
        this.isTicking = false;
    }

    public resume () {
        this._clock.resumeClock();
        this._protocol.broadcast.resume(this._clock.now());
        this.isTicking = true;
    }
}
