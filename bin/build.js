const path = require('path')
const fs = require('fs')
const { spawnSync, spawn } = require('child_process')

const modulesRoot = path.resolve(__dirname, '../modules')
const moduleNames = fs.readdirSync(modulesRoot).filter((fileName) => /^[A-Za-z0-9-]+$/.test(fileName))
const modulePaths = moduleNames.map((moduleName) => path.join(modulesRoot, moduleName))

console.log('preparing for the build ...')

// HACK compile silently the first time
for (let i = 0; i < modulePaths.length; ++i) {
    spawnSync('tsc', {
        cwd: modulePaths[i],
        stdio: 'ignore',
    })
}

modulePaths.forEach((dir) => {
    console.log(`initiate tsc in ${dir}`)
    spawn('tsc', {
        cwd: dir,
        stdio: 'inherit',
    })
})
