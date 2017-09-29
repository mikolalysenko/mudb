import { MuSchema } from 'muschema/schema';
import { MuSocket } from 'munet/net';
import { FreeModel, MessageTableBase, RPCTableBase } from './lib/protocol';
import { MuClient } from './_client';

export = function createMuClient<
    ClientStateSchema extends FreeModel,
    ClientMessageTable extends MessageTableBase,
    ClientRPCTable extends RPCTableBase,
    ServerStateSchema extends FreeModel,
    ServerMessageTable extends MessageTableBase,
    ServerRPCTable extends RPCTableBase> (spec:{
        socket:MuSocket,
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

    return new MuClient<
        ClientStateSchema,
        ClientMessageTable,
        ClientRPCTable,
        ServerStateSchema,
        ServerMessageTable,
        ServerRPCTable>({
            socket: spec.socket,
            windowLength: spec.windowLength || 0,
            clientStateSchema: spec.protocol.client.state,
            clientMessageTable: spec.protocol.client.message,
            clientRPCTable: spec.protocol.client.rpc,
            serverStateSchema: spec.protocol.server.state,
            serverMessageTable: spec.protocol.server.message,
            serverRPCTable: spec.protocol.server.rpc,
        });
};