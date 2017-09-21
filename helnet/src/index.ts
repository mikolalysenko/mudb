import { HelSocket, HelServer } from './net';

import { HelLocalServer } from './local/local';

import createSocketServer = require('./server');
import createSocket = require('./socket');

export = {
    createSocket,
    createSocketServer,
};