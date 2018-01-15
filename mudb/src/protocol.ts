import { MuSocket } from './socket';
import { MuSchema } from 'muschema/schema';
import { MuWriteStream, MuReadStream } from 'mustreams';

import stableStringify = require('json-stable-stringify');
import sha512 = require('hash.js/lib/hash/sha/512');

export type MuAnySchema = MuSchema<any>;
export type MuMessageType = MuAnySchema;
export type MuAnyMessageTable = { [message:string]:MuMessageType };
export interface MuMessageInterface<MessageTable extends MuAnyMessageTable> {
    abstractAPI:{
        [message in keyof MessageTable]:(event:MessageTable[message]['identity'], unreliable:boolean) => void;
    };
    userAPI:{ [message in keyof MessageTable]:(event:MessageTable[message]['identity'], unreliable?:boolean) => void; };
    schema:MuSchema<{
        type:keyof MessageTable;
        data:MessageTable[keyof MessageTable]['identity'];
    }>;
    serializer:{
        [message in keyof MessageTable]:(data:MessageTable['identity']) => string;
    };
}
export interface MuProtocolSchema<ClientMessage extends MuAnyMessageTable, ServerMessage extends MuAnyMessageTable> {
    client:ClientMessage;
    server:ServerMessage;
}
export type MuAnyProtocolSchema = MuProtocolSchema<MuAnyMessageTable, MuAnyMessageTable>;

export class MuMessageFactory {
    public protocolId:number;
    public hash:string;
    public messageNames:string[];
    public schemas:MuAnySchema[];
    public messageId:{ [name:string]:number } = {};

    constructor (schema:MuAnyMessageTable, protocolId:number) {
        this.protocolId = protocolId;

        const names = Object.keys(schema).sort();
        this.schemas = new Array(names.length);
        this.messageNames = names;
        names.forEach((name, id) => {
            this.messageId[name] = id;
            this.schemas[id] = schema[name];
        });

        // compute hash code for message digest
        const json = this.schemas.map((s) => s.json);
        const jsonStr = stableStringify(json);
        this.hash = sha512().update(jsonStr).digest('hex');
    }

    public createDispatch (sockets:MuSocket[]) {
        const result = {};

        this.messageNames.forEach((name, messageId) => {
            const schema = this.schemas[messageId];
            result[name] = (data, unreliable?:boolean) => {
                const stream = new MuWriteStream(32);

                stream.writeUint32(this.protocolId);
                const prefixOffset = stream.offset;
                stream.writeUint32(messageId);

                const diffFromIdentity = schema.diffBinary!(schema.identity, data, stream);
                if (diffFromIdentity) {
                    // mask the most significant bit of messageId on to indicate patches
                    stream.buffer.uint8[prefixOffset + 3] |= 0x80;
                }

                const contentBytes = stream.buffer.uint8.subarray(0, stream.offset);
                for (let i = 0; i < sockets.length; ++i) {
                    sockets[i].send(contentBytes, unreliable);
                }

                stream.destroy();
            };
        });

        return result;
    }

    public createSendRaw (sockets:MuSocket[]) {
        const p = this.protocolId;
        return function (data:Uint8Array|string, unreliable?:boolean) {
            if (typeof data === 'string') {
                const packet = JSON.stringify({
                    p,
                    s: data,
                });
                for (let i = 0; i < sockets.length; ++i) {
                    sockets[i].send(packet, unreliable);
                }
            } else {
                const packet = JSON.stringify({
                    p,
                    u: Array.prototype.slice.call(data),
                });
                for (let i = 0; i < sockets.length; ++i) {
                    sockets[i].send(packet, unreliable);
                }
            }
        };
    }
}

export class MuProtocolFactory {
    public protocolFactories:MuMessageFactory[];

    public hash:string;

    constructor (protocolSchemas:MuAnyMessageTable[]) {
        this.protocolFactories = protocolSchemas.map((schema, id) => new MuMessageFactory(schema, id));

        const hashList = this.protocolFactories.map((factory) => factory.hash).join();
        this.hash = sha512().update(hashList).digest('hex');
    }

    public createParser(spec:{
        messageHandlers:({ [name:string]:(data, unreliable) => void }),
        rawHandler:((data, unreliable) => void),
    }[]) {
        const raw = spec.map((h) => h.rawHandler);
        const message = spec.map(({messageHandlers}, id) =>
            this.protocolFactories[id].messageNames.map(
                (name) => messageHandlers[name],
            ),
        );
        const factories = this.protocolFactories;

        return function (data, unreliable:boolean) {
            if (typeof data === 'string') {
                const object = JSON.parse(data);

                const protoId = object.p;
                const protocol = factories[protoId];
                if (!protocol) {
                    return;
                }

                if (object.u) {
                    const bytes = new Uint8Array(object.u);
                    raw[protoId](bytes, unreliable);
                } else if (object.s) {
                    raw[protoId](object.s, unreliable);
                }
            } else if (data instanceof ArrayBuffer) {
                const stream = new MuReadStream(data);

                const protoId = stream.readUint32();
                const protocol = factories[protoId];

                if (!protocol) {
                    return;
                }

                const uint8 = stream.buffer.uint8;
                // check the masked bit to see if there is a patch
                const diffFromIdentity = uint8[stream.offset + 3] & 0x80;
                uint8[stream.offset + 3] &= ~0x80;

                const messageId = stream.readUint32();
                const messageSchema = protocol.schemas[messageId];

                if (!messageSchema) {
                    return;
                }

                const handler = message[protoId];
                if (!handler || !handler[messageId]) {
                    return;
                }

                let m;
                if (diffFromIdentity) {
                    m = messageSchema.patchBinary!(messageSchema.identity, stream);
                } else {
                    m = messageSchema.clone(messageSchema.identity);
                }
                message[protoId][messageId](m, unreliable);

                messageSchema.free(m);
            }
        };
    }
}
