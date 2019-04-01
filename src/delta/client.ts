import { MuSchema } from '../schema/schema';
import { MuClient, MuClientProtocol } from '../client';
import { muDeltaProtocol, DeltaProtocol } from './protocol';
import { MuReadStream } from '../stream';

export class MuDeltaClient<Schema extends MuSchema<any>> {
    private _schema:Schema;
    private _protocol:MuClientProtocol<DeltaProtocol<Schema>>;
    private _lastState:Schema['identity'];

    constructor (spec:{
        client:MuClient;
        schema:Schema;
    }) {
        this._schema = spec.schema;
        this._protocol = spec.client.protocol(muDeltaProtocol(spec.schema));
        this._lastState = spec.schema.clone(spec.schema.identity);
    }

    public configure (spec:{
        change:(state:Schema['identity']) => void,
    }) {
        this._protocol.configure({
            message: {
                reset: (state) => {
                    this._schema.assign(this._lastState, state);
                },
            },
            raw: (bytes) => {
                if (typeof bytes === 'string') {
                    return;
                }
                const nextState = this._schema.patch(this._lastState, new MuReadStream(bytes));
                this._schema.assign(this._lastState, nextState);
                spec.change(nextState);
                this._schema.free(nextState);
            },
        });
    }
}