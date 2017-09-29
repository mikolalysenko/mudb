import { MuSocket, MuSocketServer } from './net';

import { MuLocalSocketServer } from './local/local';

import createSocketServer = require('./server');
import createSocket = require('./socket');

export = {
    createSocket,
    createSocketServer,
};