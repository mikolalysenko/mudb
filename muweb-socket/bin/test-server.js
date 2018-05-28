const path = require('path')
const { spawn } = require('child_process')
const { watch } = require('chokidar')

const modulePath = path.resolve(__dirname, '..')
watch(`${modulePath}/src`)
    .on('ready', () => {
        spawn('node', [ 'test/server.js' ], { stdio: 'inherit' })
    })
    .on('change', (file) => {
        console.log(`${path.basename(file)} has been changed...\n`)
        spawn('node', [ 'test/server.js' ], { stdio: 'inherit' })
    })
