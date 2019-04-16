import { MuServer, MuServerProtocol } from '../server';
import { MuClock } from './clock';
import { MuClockProtocol, MuPingResponseSchema } from './schema';
import { MuScheduler } from '../scheduler/scheduler';
import { MuSystemScheduler } from '../scheduler/system';

const DEFAULT_TICK_RATE = 60;
const DEFAULT_FRAMESKIP = Infinity;

export class MuClockServer {
    private _clock:MuClock = new MuClock();
    private _tickCount:number = 0;
    private _protocol:MuServerProtocol<typeof MuClockProtocol>;

    private _onTick:(tick:number) => void;

    public readonly tickRate:number;
    public frameSkip:number = DEFAULT_FRAMESKIP;
    public skippedFrames:number = 0;

    private _pollHandle:any;
    private _poll = () => {
        this._pollHandle = this.scheduler.requestIdleCallback(this._poll, { timeout: 0.5 * this.tickRate });
        this.poll();
    }

    public scheduler:MuScheduler;

    constructor (spec:{
        server:MuServer,
        tickRate?:number,
        tick?:(t:number) => void,
        frameSkip?:number,
        scheduler?:MuScheduler,
    }) {
        this.tickRate = spec.tickRate || DEFAULT_TICK_RATE;

        this._protocol = spec.server.protocol(MuClockProtocol);
        this._onTick = spec.tick || function () { };

        if ('frameSkip' in spec) {
            this.frameSkip = +(spec.frameSkip || 0);
        }

        this.scheduler = spec.scheduler || MuSystemScheduler;

        this._protocol.configure({
            ready: () => {
                this._clock.reset(0);
                this._pollHandle = this.scheduler.requestIdleCallback(this._poll, {timeout: 0.5 * this.tickRate});
            },
            message: {
                ping: (client, clientClock) => {
                    const msg = MuPingResponseSchema.alloc();
                    msg.clientClock = clientClock;
                    msg.serverClock = this._clock.now();
                    msg.skippedFrames = this.skippedFrames;
                    client.message.pong(msg);
                    MuPingResponseSchema.free(msg);
                },
            },
            connect: (client) => {
                client.message.init({
                    tickRate: this.tickRate,
                    serverClock: this._clock.now(),
                    skippedFrames: this.skippedFrames,
                });
            },
            close: () => {
                this.scheduler.cancelIdleCallback(this._pollHandle);
            },
        });
    }

    public poll() {
        const now = this._clock.now();

        const ticksSmooth = now / this.tickRate - this.skippedFrames;
        const targetTick = Math.floor(ticksSmooth);
        const numTicks = targetTick - this._tickCount;

        if (numTicks <= this.frameSkip) {
            while (this._tickCount < targetTick) {
                this._onTick(++this._tickCount);
            }
        } else if (numTicks > 0) {
            this.skippedFrames += targetTick - this._tickCount - 1;
            this._tickCount = Math.floor(now / this.tickRate - this.skippedFrames);
            this._protocol.broadcast.frameSkip(this.skippedFrames, true);
            this._onTick(this._tickCount);
        }
    }

    public tick () {
        if (this._clock) {
            const t = this._clock.now() / this.tickRate - this.skippedFrames;
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
