import { MuServer, MuServerProtocol } from 'mudb/server';
import { MuClockProtocol } from './schema';

export class MuClockServer {
    public tick:number = 0;
    public tickRate:number = 30;

    private protocol:MuServerProtocol<typeof MuClockProtocol>;

    constructor (spec:{
        server:MuServer,
        tickRate:number,
        tick: (t:number) => void,
    }) {
    }

    public poll () {
    }

    public clock () {
    }
}
