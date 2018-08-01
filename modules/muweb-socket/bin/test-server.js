const path = require('path')
const { spawn } = require('child_process')

const moduleRoot = path.resolve(__dirname, '..')
spawn(
    'node', [ 'test/server.js' ],
    {
        cwd: moduleRoot,
        stdio: 'inherit',
    }
)
