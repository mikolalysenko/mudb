const fs = require('fs')
const path = require('path')
const spawn = require('child_process').spawn

const repoRoot = path.resolve(__dirname, '..')
const modulesRoot = `${repoRoot}/modules`
const moduleNames = fs.readdirSync(modulesRoot)
const modulePaths = moduleNames.map((moduleName) => path.join(modulesRoot, moduleName))

modulePaths.forEach((dir) => {
    console.log(`initiating tsc for ${dir}`)
    spawn('tsc', ['--watch'], {
        cwd: dir,
        stdio: 'inherit',
    })
})
