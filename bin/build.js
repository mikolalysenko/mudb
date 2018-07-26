const path = require('path')
const fs = require('fs')
const spawn = require('child_process').spawn

const modulesRoot = path.resolve(__dirname, '../modules')
const moduleNames = fs.readdirSync(modulesRoot).filter((moduleName) => /^[A-Za-z0-9-]+$/.test(moduleName))
const modulePaths = moduleNames.map((moduleName) => path.join(modulesRoot, moduleName))

modulePaths.forEach((dir) => {
    console.log(`initiating tsc in ${dir}`)
    spawn('tsc', {
        cwd: dir,
        stdio: 'inherit',
    })
})
