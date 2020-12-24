import { MuSchema } from './schema/schema';
import { MuWriteStream, MuReadStream } from './stream';
import { MuSocket, MuData } from './socket/socket';
import { MuLogger } from './logger';
import { stableStringify } from './util/stringify';

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
    public schemas:MuAnySchema[];
    public messageNames:string[];
    public jsonStr:string;

    constructor (schema:MuAnyMessageTable, private idBase:number) {
        this.messageNames = Object.keys(schema).sort();
        this.schemas = new Array(this.messageNames.length);
        this.messageNames.forEach((name, id) => {
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

                stream.writeVarint(this.idBase + messageId);
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
        const rawId = this.idBase + this.messageNames.length;
        return function (data:MuData, unreliable?:boolean) {
            if (typeof data === 'string') {
                const packet = JSON.stringify({
                    i: rawId,
                    d: data,
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
                const size = 5 + data.length;
                const stream = new MuWriteStream(size);

                stream.writeVarint(rawId);
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
    public protocolFactories:MuMessageFactory[] = [];
    public jsonStr:string;

    constructor (protocolSchemas:MuAnyMessageTable[]) {
        let counter = 0;
        for (let i = 0; i < protocolSchemas.length; ++i) {
            const factory = new MuMessageFactory(protocolSchemas[i], counter);
            this.protocolFactories.push(factory);
            counter += factory.messageNames.length + 1;
        }
        this.jsonStr = this.protocolFactories.map((factory) => factory.jsonStr).join();
    }

    public createParser(
        spec:{
            messageHandlers:{ [name:string]:(data, unreliable:boolean) => void },
            rawHandler:(data, unreliable:boolean) => void,
        }[],
        logger:MuLogger,
        bandwidth:MuProtocolBandwidth[],
        sessionId:string,
    ) {
        // flattened schema and handler tables
        const schemaTable:(MuAnySchema|null)[] = [];
        const handlerTable:((data, unreliable:boolean) => void)[] = [];
        const protocolIdTable:number[] = [];
        const messageNameTable:string[] = [];

        spec.forEach(({ messageHandlers, rawHandler }, id) => {
            const { messageNames, schemas } = this.protocolFactories[id];
            for (let i = 0; i < messageNames.length; ++i) {
                schemaTable.push(schemas[i]);
                handlerTable.push(messageHandlers[messageNames[i]]);
                protocolIdTable.push(id);
                messageNameTable.push(messageNames[i]);
            }
            schemaTable.push(null);
            handlerTable.push(rawHandler);
            protocolIdTable.push(id);
            messageNameTable.push('raw');
        });

        return (data:MuData, unreliable:boolean) => {
            if (typeof data === 'string') {
                const object = JSON.parse(data);
                const id = object.i;
                if (id < 0 || id >= handlerTable.length) {
                    throw new Error(`invalid message id: ${id}`);
                }
                if ('d' in object) {
                    handlerTable[id].call(null, object.d, unreliable);

                    const acc = bandwidth[protocolIdTable[id]][sessionId].received.raw;
                    acc.count += 1;
                    acc.bytes += data.length << 1;
                }
            } else {
                const stream = new MuReadStream(data);
                const id = stream.readVarint();
                if (id < 0 || id >= handlerTable.length) {
                    throw new Error(`invalid message id: ${id}`);
                }

                const schema = schemaTable[id];
                const handler = handlerTable[id];
                const protocolId = protocolIdTable[id];
                const messageName = messageNameTable[id];

                if (!bandwidth[protocolId][sessionId].received[messageName]) {
                    bandwidth[protocolId][sessionId].received[messageName] = {
                        count: 0,
                        bytes: 0,
                    };
                }
                const acc = bandwidth[protocolId][sessionId].received[messageName];
                acc.count += 1;
                acc.bytes += data.byteLength;

                // null schema implies raw handler
                if (schema === null) {
                    handler.call(null, stream.bytes(), unreliable);
                    return;
                }

                let msg;
                if (stream.offset < stream.length) {
                    msg = schema.patch(schema.identity, stream);
                } else {
                    msg = schema.clone(schema.identity);
                }
                handler.call(null, msg, unreliable);
                schema.free(msg);
            }
        };
    }
}
