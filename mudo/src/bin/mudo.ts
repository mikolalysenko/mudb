import createMudo from '../mudo';
import minimist = require('minimist');

const argv = minimist(process.argv.slice(2), );

createMudo({
    client: argv.client,
    server: argv.server,
    port: argv.port | 0,
    host: argv.host,
    cors: argv.cors,
    ssl: argv.ssl,
    cert: argv.cert,
    open: !!argv.open,
    debug: !!argv.debug,
});