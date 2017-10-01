import { MuSchema } from 'muschema/schema';
import { MuSocket, MuSocketServer } from 'munet/net';

import { MuClient } from './_client';
import { MuServer } from './_server';

import createClient = require('./client');
import createServer = require('./server');

export = {
    createClient,
    createServer,
};