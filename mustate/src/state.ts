import { MuSchema } from 'muschema/schema';

export type MuAnySchema = MuSchema<any>;

export interface MuStateSchema<
    ClientSchema extends MuAnySchema,
    ServerSchema extends MuAnySchema> {
    client: ClientSchema;
    server: ServerSchema;
}

export class MuStateSet<Schema extends MuAnySchema> {
}
