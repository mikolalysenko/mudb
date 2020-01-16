import { MuSchema } from './schema/schema';
import { MuWriteStream, MuReadStream } from './stream';
import { MuSocket, MuData } from './socket/socket';
import { MuLogger } from './logger';
import stableStringify = require('./util/stringify');

const RAW_MESSAGE = 0;

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

export type MuBandwidthAccumulator = {
    count:number,
    bytes:number,
};
export type MuProtocolBandwidth = {
    [sessionId:string]:{
        sent:{ [message:string]:MuBandwidthAccumulator },
        received:{ [message:string]:MuBandwidthAccumulator },
    },
};

export class MuMessageFactory {
    public protocolId:number;
    public schemas:MuAnySchema[];
    public messageNames:string[];
    public messageIdTable:{ [name:string]:number } = {};
    public jsonStr:string;

    constructor (schema:MuAnyMessageTable, protocolId:number) {
        this.protocolId = protocolId;

        this.messageNames = Object.keys(schema).sort();
        this.schemas = new Array(this.messageNames.length);
        this.messageNames.forEach((name, id) => {
            this.messageIdTable[name] = id;
            this.schemas[id] = schema[name];
        });

        const json = this.schemas.map((s) => s.json);
        this.jsonStr = <string>stableStringify(json);
    }

    public createDispatch (sockets:MuSocket[], bandwidth:MuProtocolBandwidth) {
        const result = {};

        this.messageNames.forEach((name, messageId) => {
            const schema = this.schemas[messageId];
            result[name] = (data, unreliable?:boolean) => {
                const stream = new MuWriteStream(128);

                stream.writeVarint(this.protocolId);
                stream.writeVarint(messageId + 1);
                schema.diff(schema.identity, data, stream);

                const contentBytes = stream.bytes();
                const numBytes = contentBytes.byteLength;
                for (let i = 0; i < sockets.length; ++i) {
                    const socket = sockets[i];
                    socket.send(contentBytes, unreliable);

                    if (!bandwidth[socket.sessionId].sent[name]) {
                        bandwidth[socket.sessionId].sent[name] = {
                            count: 0,
                            bytes: 0,
                        };
                    }
                    const acc = bandwidth[socket.sessionId].sent[name];
                    acc.count += 1;
                    acc.bytes += numBytes;
                }

                stream.destroy();
            };
        });

        return result;
    }

    public createSendRaw (sockets:MuSocket[], bandwidth:MuProtocolBandwidth) {
        const p = this.protocolId;

        return function (data:MuData, unreliable?:boolean) {
            if (typeof data === 'string') {
                const packet = JSON.stringify({
                    p,
                    s: data,
                });
                const numBytes = packet.length << 1;
                for (let i = 0; i < sockets.length; ++i) {
                    const socket = sockets[i];
                    socket.send(packet, unreliable);

                    const acc = bandwidth[socket.sessionId].sent['raw'];
                    acc.count += 1;
                    acc.bytes += numBytes;
                }
            } else {
                const size = 10 + data.length;
                const stream = new MuWriteStream(size);

                stream.writeVarint(p);
                stream.writeVarint(RAW_MESSAGE);
                const { uint8 } = stream.buffer;
                uint8.set(data, stream.offset);
                stream.offset += data.length;

                const bytes = stream.bytes();
                const numBytes = bytes.byteLength;
                for (let i = 0; i < sockets.length; ++i) {
                    const socket = sockets[i];
                    socket.send(bytes, unreliable);

                    const acc = bandwidth[socket.sessionId].sent['raw'];
                    acc.count += 1;
                    acc.bytes += numBytes;
                }

                stream.destroy();
            }
        };
    }
}

export class MuProtocolFactory {
    public protocolFactories:MuMessageFactory[];
    public jsonStr:string;

    constructor (protocolSchemas:MuAnyMessageTable[]) {
        this.protocolFactories = protocolSchemas.map((schema, id) => new MuMessageFactory(schema, id));
        this.jsonStr = this.protocolFactories.map((factory) => factory.jsonStr).join();
    }

    public createParser(
        spec:{
            messageHandlers:{ [name:string]:(data, unreliable) => void },
            rawHandler:(data, unreliable) => void,
        }[],
        logger:MuLogger,
        bandwidth:MuProtocolBandwidth[],
        sessionId:string,
    ) {
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
                    throw new Error(`invalid protocol id ${protocolId}`);
                }

                if (object.s) {
                    raw[protocolId](object.s, unreliable);

                    const acc = bandwidth[protocolId][sessionId].received['raw'];
                    acc.count += 1;
                    acc.bytes += data.length << 1;
                }
            } else {
                const stream = new MuReadStream(data);

                const protocolId = stream.readVarint();
                const protocol = this.protocolFactories[protocolId];
                if (!protocol) {
                    throw new Error(`invalid protocol id ${protocolId}`);
                }

                let messageId = stream.readVarint();

                if (messageId === RAW_MESSAGE) {
                    raw[protocolId](stream.bytes(), unreliable);

                    const acc_ = bandwidth[protocolId][sessionId].received['raw'];
                    acc_.count += 1;
                    acc_.bytes += data.byteLength;
                    return;
                }
                messageId -= 1;

                const messageSchema = protocol.schemas[messageId];
                if (!messageSchema) {
                    throw new Error(`invalid message id ${messageId}`);
                }

                const handlers = message[protocolId];
                if (!handlers || !handlers[messageId]) {
                    throw new Error(`cannot find handler`);
                }

                let m;
                if (stream.offset < stream.length) {
                    m = messageSchema.patch(messageSchema.identity, stream);
                } else {
                    m = messageSchema.clone(messageSchema.identity);
                }
                message[protocolId][messageId](m, unreliable);
                const messageName = protocol.messageNames[messageId];

                if (!bandwidth[protocolId][sessionId].received[messageName]) {
                    bandwidth[protocolId][sessionId].received[messageName] = {
                        count: 0,
                        bytes: 0,
                    };
                }
                const acc = bandwidth[protocolId][sessionId].received[messageName];
                acc.count += 1;
                acc.bytes += data.byteLength;
                messageSchema.free(m);
            }
        };
    }
}
