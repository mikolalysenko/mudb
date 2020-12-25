import * as tape from 'tape';
import { MuRPCLocalTransport } from '../local';
import { MuUTF8, MuStruct, MuVarint, MuVoid } from '../../schema';
import { MuRPCServer } from '../server';
import { MuRPCClient } from '../client';

tape('basic rpc', async (t) => {
    const protocol = {
        name: 'test rpc',
        api: {
            hello:{
                arg: new MuUTF8(),
                ret: new MuUTF8(),
            },
            fib:{
                arg: new MuStruct({
                    a: new MuVarint(),
                    b: new MuVarint(),
                }),
                ret: new MuStruct({
                    a: new MuVarint(),
                    b: new MuVarint(),
                }),
            },
            brokenRoute: {
                arg: new MuVoid(),
                ret: new MuVoid(),
            },
            logout: {
                arg: new MuVoid(),
                ret: new MuVoid(),
            },
        },
    };

    const transport = new MuRPCLocalTransport();

    const server = new MuRPCServer({
        protocol,
        transport,
        authorize: async ({ auth }) => auth !== 'bad guy',
        handlers: {
            hello: async ({ auth }, arg) => {
                if (auth === 'admin') {
                    return 'administrator';
                }
                return 'hello ' + arg;
            },
            fib: async (conn, { a, b }, ret) => {
                ret.a = a + b;
                ret.b = a;
                return ret;
            },
            brokenRoute: async () => {
                throw new Error('not implemented');
            },
            logout: async (conn) => {
                conn.setAuth('');
            },
        },
    });

    const client = new MuRPCClient(
        protocol,
        transport.client('user'));
    t.equals(await client.api.hello('world'), 'hello world', 'hello world');
    t.same(await client.api.fib({ a: 2, b: 1 }), { a: 3, b: 2 }, 'fibonacci');

    try {
        await client.api.brokenRoute();
        t.fail('should throw');
    } catch (e) {
        t.pass(`throws ${e}`);
    }

    const badClient = new MuRPCClient(
        protocol,
        transport.client('bad guy'));
    try {
        await badClient.api.hello('i am a jerk');
        t.fail('should throw');
    } catch (e) {
        t.pass('bad api throws when called');
    }

    const adminClient = new MuRPCClient(
        protocol,
        transport.client('admin'));
    t.equals(await adminClient.api.hello('guest'), 'administrator', 'admin auth ok');
    await adminClient.api.logout();
    t.equals(await adminClient.api.hello('guest'), 'hello guest', 'log out ok');

    t.end();
});