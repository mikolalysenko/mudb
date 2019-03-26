import { MuSchema } from '../schema/schema';

export function muDeltaProtocol<Schema extends MuSchema<any>> (schema:Schema) {
    return {
        client: {
            reset:schema,
        },
        server: {
        },
    };
}

// FIXME: Figure out how to use ReturnType<> correctly here
export type DeltaProtocol<Schema extends MuSchema<any>> = {
    client:{
        reset:Schema,
    },
    server:{ },
};