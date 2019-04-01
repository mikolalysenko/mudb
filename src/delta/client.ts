import { MuSchema } from '../schema/schema';
import { MuClient, MuClientProtocol } from '../client';
import { MuDeltaSchema, muDeltaSchema } from './protocol';
import { MuReadStream } from '../stream';

export class MuDeltaClient<Schema extends MuSchema<any>> {
    private _schema:Schema;
    private _protocol:MuClientProtocol<MuDeltaSchema<Schema>>;
    private _state:Schema['identity'];

    constructor (spec:{
        client:MuClient;
        schema:Schema;
    }) {
        this._schema = spec.schema;
        this._protocol = spec.client.protocol(muDeltaSchema(spec.schema));
        this._state = spec.schema.clone(spec.schema.identity);
    }

    public configure (spec:{
        change:(state:Schema['identity']) => void,
    }) {
        this._protocol.configure({
            message: {
                reset: (state) => {
                    this._schema.assign(this._state, state);
                },
            },
            raw: (bytes) => {
                if (typeof bytes === 'string') {
                    return;
                }

                const state = this._schema.patch(this._state, new MuReadStream(bytes));
                this._schema.assign(this._state, state);

                spec.change(state);
                this._schema.free(state);
            },
        });
    }
}
