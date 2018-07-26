const fs = require('fs')
const path = require('path')
const { spawnSync, spawn } = require('child_process')

const modulesRoot = path.resolve(__dirname, '../modules')
const moduleNames = fs.readdirSync(modulesRoot).filter((fileName) => /^[A-Za-z0-9-]+$/.test(fileName))
const modulePaths = moduleNames.map((moduleName) => path.join(modulesRoot, moduleName))

modulePaths.forEach((dir) => {
    console.log(`initiate tsc for ${dir}`)
    spawn('tsc', ['--watch'], {
        cwd: dir,
        stdio: 'inherit',
    })
})
