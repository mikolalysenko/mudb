import * as http from 'http';
import * as tape from 'tape';
import { MuRPCHttpServerTransport } from '../http/server';
import { MuUTF8, MuVoid, MuStruct, MuFloat64 } from '../../schema';
import { MuRPCServer } from '../server';
import { findPortAsync } from '../../util/port';
import { MuRPCClient } from '../client';
import { MuRPCHttpClientTransport } from '../http/client';

tape('http server', async (t) => {
    const protocol = {
        name: 'test',
        api: {
            login:{
                arg: new MuUTF8(),
                ret: new MuVoid(),
            },
            logout:{
                arg: new MuVoid(),
                ret: new MuVoid(),
            },
            hello: {
                arg: new MuVoid(),
                ret: new MuUTF8(),
            },
            add: {
                arg: new MuStruct({
                    a: new MuFloat64(),
                    b: new MuFloat64(),
                }),
                ret: new MuFloat64(),
            },
        },
    };

    const transport = new MuRPCHttpServerTransport({
        route: 'api',
        byteLimit: 1 << 20,
        cookie: 'auth',
    });

    const httpServer = http.createServer(async (req, res) => {
        if (!await transport.handler(req, res)) {
            t.fail('unhandled route');
            res.statusCode = 404;
            res.end();
        }
    });

    const port = await findPortAsync();
    httpServer.listen(port);

    const server = new MuRPCServer({
        protocol,
        transport,
        authorize: async (connection) => {
            if (connection.auth === 'bad') {
                return false;
            }
            return true;
        },
        handlers: {
            login: async (conn, handle) => {
                conn.setAuth(handle);
            },
            logout: async (conn) => {
                conn.setAuth('');
            },
            hello: async (conn) => {
                if (conn.auth) {
                    return `hello ${conn.auth}`;
                }
                return `hello guest`;
            },
            add: async (conn, { a, b }) => {
                return a + b;
            },
        },
    });

    const client = new MuRPCClient(protocol, new MuRPCHttpClientTransport({
        url: `http://127.0.0.1:${port}/api`,
        timeout: Infinity,
    }));

    t.equals(await client.api.hello(), `hello guest`);
    await client.api.login('user');
    t.equals(await client.api.hello(), `hello user`);

    httpServer.close();

    t.end();
});
