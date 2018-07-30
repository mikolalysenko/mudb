const path = require('path')
const { exec, spawn } = require('child_process')
const { watch } = require('chokidar')

const getFreePort = require('./get-free-port')

let port = 0
getFreePort((error, port_) => {
    if (error) {
        console.error(error)
        return
    }

    port = port_

    spawn(
        'node',
        [ 'start-server.js', port_ ],
        {
            cwd: __dirname,
            stdio: 'inherit',
        },
    )
})

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
