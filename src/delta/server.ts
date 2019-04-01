import { MuSchema } from '../schema/schema';
import { MuServer, MuServerProtocol } from '../server';
import { MuDeltaSchema, muDeltaSchema } from './protocol';
import { MuWriteStream } from '../stream';

export class MuDeltaServer<Schema extends MuSchema<any>> {
    private _schema:Schema;
    private _protocol:MuServerProtocol<MuDeltaSchema<Schema>>;
    private _state:Schema['identity'];
    private _initialPacketSize:number;

    constructor (spec:{
        server:MuServer;
        schema:Schema;
        initial?:Schema['identity'];
        packetSizeGuess?:number;
    }) {
        this._schema = spec.schema;
        this._protocol = spec.server.protocol(muDeltaSchema(spec.schema));
        this._state = spec.schema.clone(spec.initial || spec.schema.identity);
        this._protocol.configure({
            message: {},
            connect: (client) => {
                client.message.reset(this._state);
            },
        });
        this._initialPacketSize = spec.packetSizeGuess || 1024;
    }

    public publish (state:Schema['identity']) {
        const out = new MuWriteStream(this._initialPacketSize);
        if (this._schema.diff(this._state, state, out)) {
            this._schema.assign(this._state, state);
            this._protocol.broadcastRaw(out.bytes());
        }
        out.destroy();
    }
}
