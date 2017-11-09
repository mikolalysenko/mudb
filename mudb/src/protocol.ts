import { MuSocket } from './socket';
import { MuSchema } from 'muschema/schema';

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
            const packet = {
                p: this.protocolId,
                m: messageId,
                d: null,
            };
            result[name] = function (data, unreliable?:boolean) {
                packet.d = schema.diff(schema.identity, data);
                const str = JSON.stringify(packet);
                for (let i = 0; i < sockets.length; ++i) {
                    sockets[i].send(str, unreliable);
                }
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
            this.protocolFactories[id].messageNames.map((name) => messageHandlers[name]));
        const factories = this.protocolFactories;

        return function (data, unreliable:boolean) {
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
            } else {
                const messageId = object.m;
                const packetData = object.d;
                const messageSchema = protocol.schemas[messageId];
                if (!messageSchema) {
                    return;
                }

                const m = messageSchema.patch(messageSchema.identity, packetData);
                message[protoId][messageId](m, unreliable);
                messageSchema.free(message);
            }
        };
    }
}
