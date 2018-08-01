const path = require('path')
const { exec, spawn } = require('child_process')
const getPort = require('get-port')
const { watch } = require('chokidar')

let port = 0

getPort().then(
    (port_) => {
        port = port_
        spawn(
            'node', [ 'start-server.js', port_ ],
            {
                cwd: __dirname,
                stdio: 'inherit',
            },
        )
    },
    console.error,
)

const modulePath = path.resolve(__dirname, '..')
watch(`${modulePath}/src`)
    .on('ready', () => {
        exec(
            `browserify test/socket.js -t [ envify --PORT ${port} ] | tape-run`,
            (error, stdout) => {
                if (error) {
                    console.error(error)
                    return
                }
                console.log(stdout)
            }
        )
    })
    .on('change', (file) => {
        console.log(`${path.basename(file)} has been changed...\n`)
        exec(
            `browserify test/socket.js -t [ envify --PORT ${port} ] | tape-run`,
            (error, stdout) => {
                if (error) {
                    console.error(error)
                    return
                }
                console.log(stdout)
            }
        )
    })
