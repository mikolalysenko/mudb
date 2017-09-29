import { MuSchema } from 'muschema/schema';
import { MuSocketServer } from 'munet/net';
import { FreeModel, MessageTableBase, RPCTableBase } from './lib/protocol';
import { MuServer } from './_server';

export = function createMuServer<
    ClientStateSchema extends FreeModel,
    ClientMessageTable extends MessageTableBase,
    ClientRPCTable extends RPCTableBase,
    ServerStateSchema extends FreeModel,
    ServerMessageTable extends MessageTableBase,
    ServerRPCTable extends RPCTableBase> (
    spec:{
        socketServer:MuSocketServer,
        windowLength?:number,
        protocol:{
            client:{
                state:ClientStateSchema,
                message:ClientMessageTable,
                rpc:ClientRPCTable,
            },
            server:{
                state:ServerStateSchema,
                message:ServerMessageTable,
                rpc:ServerRPCTable,
            },
        },
    }) {
    return new MuServer<
        ClientStateSchema,
        ClientMessageTable,
        ClientRPCTable,
        ServerStateSchema,
        ServerMessageTable,
        ServerRPCTable>({
            socketServer: spec.socketServer,
            clientStateSchema: spec.protocol.client.state,
            clientMessageTable: spec.protocol.client.message,
            clientRPCTable: spec.protocol.client.rpc,
            serverStateSchema: spec.protocol.server.state,
            serverMessageTable: spec.protocol.server.message,
            serverRPCTable: spec.protocol.server.rpc,
            windowLength: spec.windowLength || 0,
        });
};
