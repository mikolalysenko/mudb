import { MuSchema } from './schema/schema';
import { MuWriteStream, MuReadStream } from './stream';
import { MuSocket, MuData } from './socket/socket';
import { MuLogger } from './logger';
import stableStringify = require('./util/stringify');

export type MuAnySchema = MuSchema<any>;
export type MuMessageType = MuAnySchema;
export interface MuAnyMessageTable {
    [message:string]:MuMessageType;
}
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
    name?:string;
    client:ClientMessage;
    server:ServerMessage;
}
export type MuAnyProtocolSchema = MuProtocolSchema<MuAnyMessageTable, MuAnyMessageTable>;

export type MuProtocolBandwidthUsage = {
    [sessionId:string]:{
        sent:{ [message:string]:number },
        received:{ [message:string]:number },
    },
};

export class MuMessageFactory {
    public protocolId:number;
    public protocolShift:number;
    public schemas:MuAnySchema[];
    public messageNames:string[];
    public jsonStr:string;

    public messageBase:number = 0;

    constructor (schema:MuAnyMessageTable) {
        this.messageNames = Object.keys(schema).sort();
        this.schemas = new Array(this.messageNames.length);
        this.messageNames.forEach((name, id) => {
            this.schemas[id] = schema[name];
        });

        const json = this.schemas.map((s) => s.json);
        this.jsonStr = <string>stableStringify(json);
    }

    public createDispatch (sockets:MuSocket[], acc:MuProtocolBandwidthUsage) {
        const result = {};

        this.messageNames.forEach((name, messageId) => {
            const schema = this.schemas[messageId];
            const messageCode = this.messageBase + messageId + 1;

            result[name] = (data, unreliable?:boolean) => {
                const stream = new MuWriteStream(128);

                stream.writeVarint(messageCode);
                schema.diff(schema.identity, data, stream);

                const contentBytes = stream.bytes();
                const numBytes = contentBytes.byteLength;
                for (let i = 0; i < sockets.length; ++i) {
                    const socket = sockets[i];
                    socket.send(contentBytes, unreliable);
                    acc[socket.sessionId].sent[name] = (acc[socket.sessionId].sent[name] || 0) + numBytes;
                }

                stream.destroy();
            };
        });

        return result;
    }

    public createSendRaw (sockets:MuSocket[], acc:MuProtocolBandwidthUsage) {
        const p = this.protocolId;
        const rawCode = this.messageBase;

        return function (data:MuData, unreliable?:boolean) {
            if (typeof data === 'string') {
                const packet = JSON.stringify({
                    p: rawCode,
                    s: data,
                });
                const numBytes = packet.length << 1;
                for (let i = 0; i < sockets.length; ++i) {
                    const socket = sockets[i];
                    socket.send(packet, unreliable);
                    acc[socket.sessionId].sent['raw'] = (acc[socket.sessionId].sent['raw'] || 0) + numBytes;
                }
            } else {
                const size = 5 + data.length;
                const stream = new MuWriteStream(size);

                stream.writeVarint(rawCode);
                const { uint8 } = stream.buffer;
                uint8.set(data, stream.offset);
                stream.offset += data.length;

                const bytes = stream.bytes();
                const numBytes = bytes.byteLength;
                for (let i = 0; i < sockets.length; ++i) {
                    const socket = sockets[i];
                    socket.send(bytes, unreliable);
                    acc[socket.sessionId].sent['raw'] = (acc[socket.sessionId].sent['raw'] || 0) + numBytes;
                }

                stream.destroy();
            }
        };
    }
}

export class MuProtocolFactory {
    public protocolFactories:MuMessageFactory[] = [];
    public jsonStr:string;

    constructor (protocolSchemas:MuAnyMessageTable[]) {
        let count = 0;
        for (let i = 0; i < protocolSchemas.length; ++i) {
            const factory = new MuMessageFactory(protocolSchemas[i]);
            factory.messageBase = count;
            count += factory.messageNames.length + 1;
        }

        this.jsonStr = this.protocolFactories.map((factory) => factory.jsonStr).join();
    }

    public createParser(
        spec:{
            messageHandlers:{ [name:string]:(data, unreliable) => void },
            rawHandler:(data, unreliable) => void,
        }[],
        logger:MuLogger,
        acc:MuProtocolBandwidthUsage[],
        sessionId:string,
    ) {
        // precalculate schema and handler tables
        const schemaTable:(MuAnySchema|null)[] = [];
        const handlerTable:((x:any, unreliable:boolean) => void)[] = [];
        spec.forEach(({ messageHandlers, rawHandler }, id) => {
            // add entry for raw handler
            schemaTable.push(null);
            handlerTable.push(rawHandler);

            // append message handlers
            const { messageNames, schemas } = this.protocolFactories[id];
            for (let i = 0; i < messageNames.length; ++i) {
                schemaTable.push(schemas[i]);
                handlerTable.push(messageHandlers[messageNames[i]]);
            }
        });

        return (data:MuData, unreliable:boolean) => {
            if (typeof data === 'string') {
                const object = JSON.parse(data);

                const protocolId = object.p;
                const protocol = this.protocolFactories[protocolId];
                if (!protocol) {
                    throw new Error(`invalid protocol id ${protocolId}`);
                }

                if (object.s) {
                    handlerTable[protocolId].call(null, object.s, unreliable);
                    acc[protocolId][sessionId].received['raw'] = (acc[protocolId][sessionId].received['raw'] || 0) + (data.length << 1);
                }
            } else {
                const stream = new MuReadStream(data);

                // read stream code
                const code = stream.readVarint();
                if (code < 0 || code >= schemaTable.length) {
                    throw new Error(`invalid message code: ${code}`);
                }

                const handler = handlerTable[code];
                const messageSchema = schemaTable[code];

                // FIXME: could just store a reference to the stats counters here
                // acc[protocolId][sessionId].received[messageName] = (acc[protocolId][sessionId].received[messageName] || 0) + data.byteLength;

                // null schema implies a raw handler
                if (!messageSchema) {
                    handler.call(null, stream.bytes(), unreliable);
                    return;
                }

                // parse message
                let m;
                if (stream.offset < stream.length) {
                    m = messageSchema.patch(messageSchema.identity, stream);
                } else {
                    m = messageSchema.clone(messageSchema.identity);
                }
                handler.call(null, m, unreliable);
                messageSchema.free(m);
            }
        };
    }
}
