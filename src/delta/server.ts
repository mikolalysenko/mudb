import { MuSchema } from '../schema/schema';
import { MuServer, MuServerProtocol } from '../server';
import { DeltaProtocol, muDeltaProtocol } from './protocol';
import { MuWriteStream } from '../stream';

export class MuDeltaServer<Schema extends MuSchema<any>> {
    private _schema:Schema;
    private _protocol:MuServerProtocol<DeltaProtocol<Schema>>;
    private _lastSent:Schema['identity'];
    private _initialPacketSize:number;

    constructor (spec:{
        server:MuServer;
        schema:Schema;
        initial?:Schema['identity'];
        packetSizeGuess?:number;
    }) {
        this._schema = spec.schema;
        this._protocol = spec.server.protocol(muDeltaProtocol(spec.schema));
        this._lastSent = spec.schema.clone(spec.initial || spec.schema.identity);
        this._protocol.configure({
            message: {},
            connect: (client) => {
                client.message.reset(this._lastSent);
            },
        });
        this._initialPacketSize = spec.packetSizeGuess || 1024;
    }

    public publish (state:Schema['identity']) {
        const packet = new MuWriteStream(this._initialPacketSize);
        if (this._schema.diff(this._lastSent, state, packet)) {
            this._schema.assign(this._lastSent, state);
            this._protocol.broadcastRaw(packet.bytes());
        }
        packet.destroy();
    }
}