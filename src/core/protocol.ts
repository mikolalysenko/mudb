import { MuSocket, MuData } from './socket';
import { MuSchema } from '../schema/schema';
import { MuWriteStream, MuReadStream } from '../stream';

import stableStringify = require('json-stable-stringify');
import sha512 = require('hash.js/lib/hash/sha/512');

const RAW_MESSAGE = 0xffffffff;

export type MuAnySchema = MuSchema<any>;
export type MuMessageType = MuAnySchema;
export type MuAnyMessageTable = { [message:string]:MuMessageType };
export interface MuMessageInterface<MessageTable extends MuAnyMessageTable> {
    abstractAPI:{
        [message in keyof MessageTable]:(event:MessageTable[message]['identity'], unreliable:boolean) => void;
    };
    userAPI:{
        [message in keyof MessageTable]:(event:MessageTable[message]['identity'], unreliable?:boolean) => void;
    };
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
    public message2Id:{ [name:string]:number } = {};

    constructor (schema:MuAnyMessageTable, protocolId:number) {
        this.protocolId = protocolId;

        this.messageNames = Object.keys(schema).sort();
        this.schemas = new Array(this.messageNames.length);
        this.messageNames.forEach((name, id) => {
            this.message2Id[name] = id;
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
                stream.writeUint32(messageId);
                schema.diff(schema.identity, data, stream);

                const contentBytes = stream.bytes();
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

        return function (data:MuData, unreliable?:boolean) {
            if (typeof data === 'string') {
                const packet = JSON.stringify({
                    p,
                    s: data,
                });
                for (let i = 0; i < sockets.length; ++i) {
                    sockets[i].send(packet, unreliable);
                }
            } else {
                const size = 8 + data.length;
                const stream = new MuWriteStream(size);

                stream.writeUint32(p);
                stream.writeUint32(RAW_MESSAGE);
                const { uint8 } = stream.buffer;
                uint8.set(data, 8);

                const bytes = uint8.subarray(0, size);
                for (let i = 0; i < sockets.length; ++i) {
                    sockets[i].send(bytes, unreliable);
                }

                stream.destroy();
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
        messageHandlers:{ [name:string]:(data, unreliable) => void },
        rawHandler:(data, unreliable) => void,
    }[]) {
        const raw = spec.map((h) => h.rawHandler);
        const message = spec.map(({messageHandlers}, id) =>
            this.protocolFactories[id].messageNames.map(
                (name) => messageHandlers[name],
            ),
        );

        return (data:MuData, unreliable:boolean) => {
            if (typeof data === 'string') {
                const object = JSON.parse(data);

                const protocolId = object.p;
                const protocol = this.protocolFactories[protocolId];
                if (!protocol) {
                    return;
                }

                if (object.s) {
                    raw[protocolId](object.s, unreliable);
                }
            } else {
                const stream = new MuReadStream(data);

                const protocolId = stream.readUint32();
                const protocol = this.protocolFactories[protocolId];
                if (!protocol) {
                    return;
                }

                const messageId = stream.readUint32();
                if (messageId === RAW_MESSAGE) {
                    raw[protocolId](data.subarray(stream.offset), unreliable);
                    return;
                }

                const messageSchema = protocol.schemas[messageId];
                if (!messageSchema) {
                    return;
                }

                const handlers = message[protocolId];
                if (!handlers || !handlers[messageId]) {
                    return;
                }

                let m;
                if (stream.offset < stream.length) {
                    m = messageSchema.patch(messageSchema.identity, stream);
                } else {
                    m = messageSchema.clone(messageSchema.identity);
                }
                message[protocolId][messageId](m, unreliable);
                messageSchema.free(m);
            }
        };
    }
}
