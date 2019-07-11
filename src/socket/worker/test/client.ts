import { spawn } from 'child_process';

const cwd = __dirname;

spawn('browserify _/client.ts -p [ tsify ] | tape-run', [], {
    cwd,
    shell: true,
    stdio: 'inherit',
});
