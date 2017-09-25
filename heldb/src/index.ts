import createClient = require('./client');
import createServer from './server';

import HelFloat64 = require('helschema/float64');
import HelString = require('helschema/string');
import HelStruct = require('helschema/struct');
import HelDictionary = require('helschema/dictionary');

const EntitySchema = HelStruct({
    x: HelFloat64(),
    y: HelFloat64(),
    color: HelString('foo'),
});

const protocol = {
    client: {
        state: EntitySchema,
        message: {},
        rpc: {},
    },
    server: {
        state: HelDictionary(EntitySchema),
        message: {
            splat: EntitySchema,
        },
        rpc: { },
    },
};

const testClient = createClient({
    socket: require('helnet/socket')(),
    protocol,
});

const testServer = createServer({
    socketServer: require('helnet/server')(),
    protocol,
});

testServer.start({
    message: {
        splat(event) {
        },
    },
    rpc: {},
    ready() {
    },
    connect(client) {
    },
});

export default {
    createClient,
    createServer,
};