import tape = require('tape');
import { MuLocalRPCTransport } from '../local';
import { MuUTF8, MuStruct, MuVarint } from '../../schema';
import { MuRPCServer } from '../server';
import { MuRPCClient } from '../client';

tape('basic rpc', async (t) => {
    const protocol = {
        name: 'test rpc',
        methods: {
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
        },
    };

    const transport = new MuLocalRPCTransport();

    const server = new MuRPCServer({
        protocol,
        transport,
        authorize: async (auth) => auth !== 'bad guy',
        handlers: {
            hello: async (auth, arg) => {
                if (auth === 'admin') {
                    return 'administrator';
                }
                return 'hello ' + arg;
            },
            fib: async (auth, { a, b }, ret) => {
                ret.a = a + b;
                ret.b = a;
                return ret;
            },
        },
    });

    transport.setAuth('user');
    const client = new MuRPCClient({ transport, protocol });

    t.equals(await client.api.hello('world'), 'hello world', 'hello world');
    t.same(await client.api.fib({ a: 2, b: 1 }), { a: 3, b: 2 }, 'fibonacci');

    transport.setAuth('bad guy');
    const badClient = new MuRPCClient({ transport, protocol });
    try {
        await badClient.api.hello('i am a jerk');
        t.fail('should throw');
    } catch (e) {
        t.pass('bad api throws when called');
    }

    transport.setAuth('admin');
    const adminClient = new MuRPCClient({ transport, protocol });
    t.equals(await adminClient.api.hello(''), 'administrator', 'admin auth ok');

    t.end();
});