import { MuSocket } from 'munet/net';
import { MuSchema } from 'muschema/schema';

export type MuAnySchema = MuSchema<any>;
export type MuMessageType = MuAnySchema;
export type MuAnyMessageTable = { [message:string]:MuMessageType };
export interface MuMessageInterface<MessageTable extends MuAnyMessageTable> {
    abstractAPI:{ [message in keyof MessageTable]:(event:MessageTable[message]['identity'], unreliable:boolean) => void; };
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

        // compute hash code

        const names = Object.keys(schema).sort();
        this.schemas = new Array(names.length);
        this.messageNames = names;
        names.forEach((name, id) => {
            this.messageId[name] = id;
            this.schemas[id] = schema[name];
        });
    }

    public createDispatch (sockets:MuSocket[]) {
        const result = {};
        this.messageNames.forEach((name, messageId) => {
            const schema = this.schemas[name];
            const packet = {
                p: this.protocolId,
                m: messageId,
                d: null,
            };
            result[name] = function (data, unreliable?:boolean) {
                packet.d = schema.diff(schema.identity, data);
                const str = JSON.stringify(packet);
                for (let i = 0; i < sockets.length; ++i) {
                    if (unreliable) {
                        sockets[i].sendUnreliable(str);
                    } else {
                        sockets[i].send(str);
                    }
                }
            };
        });
        return result;
    }

    public createSendRaw (sockets:MuSocket[]) {
        const p = this.protocolId;
        return function (data:Uint8Array, unreliable?:boolean) {
            const packet = JSON.stringify({
                p,
                u: Array.prototype.slice.call(data),
            });
            for (let i = 0; i < sockets.length; ++i) {
                if (unreliable) {
                    sockets[i].sendUnreliable(packet);
                } else {
                    sockets[i].send(packet);
                }
            }
        };
    }
}

export class MuProtocolFactory {
    public protocolNames:string[];
    public protocolFactories:MuMessageFactory[];
    public protocolId:{[name:string]:number} = {};

    constructor (protocolSchemas:{[name:string]:MuAnyMessageTable}) {
        const names = Object.keys(protocolSchemas).sort();

        this.protocolNames = names;
        this.protocolFactories = new Array(names.length);
        names.forEach((name, id) => {
            this.protocolId[name] = id;
            this.protocolFactories[id] = new MuMessageFactory(protocolSchemas[name], id);
        });
    }

    public createParser<HandlerType extends {[name:string]:{
        messageHandlers:{[msg:string]:(data, unreliable:boolean) => void },
        rawHandler:(data:Uint8Array, unreliable:boolean) => void }}> (handlers:HandlerType) {
        const rawHandlers = this.protocolNames.map((name) => handlers[name].rawHandler);
        const messageHandlers = this.protocolNames.map(
            (name, id) => this.protocolFactories[id].messageNames.map(
                (message) => handlers[name].messageHandlers[message]));
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
                rawHandlers[protoId](bytes, unreliable);
            } else {
                const messageId = object.m;
                const packetData = object.d;
                const messageSchema = protocol.schemas[messageId];
                if (!messageSchema) {
                    return;
                }

                const message = messageSchema.patch(messageSchema.identity, packetData);
                messageHandlers[protoId][messageId](message, unreliable);
                messageSchema.free(message);
            }
        };
    }
}
