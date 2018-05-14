const path = require('path')
const { exec, spawn } = require('child_process')
const { watch } = require('chokidar')

spawn('node', ['start-server.js'], {
    cwd: __dirname,
    stdio: 'inherit',
})

const modulePath = path.resolve(__dirname, '..')
watch(`${modulePath}/src`)
    .on('ready', () => {
        exec(
            'browserify test/socket.js | tape-run',
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
        console.log(`${path.basename(file)} has changed...\n`)

        exec(
            'browserify test/socket.js | tape-run',
            (error, stdout) => {
                if (error) {
                    console.error(error)
                    return
                }
                console.log(stdout)
            }
        )
    })
