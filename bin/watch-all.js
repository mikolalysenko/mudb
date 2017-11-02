const fs = require('fs')
const path = require('path')
const spawn = require('child_process').spawn

const repoPath = path.resolve(__dirname, '..')

const repoContents = fs.readdirSync(repoPath)
const muModules = repoContents.filter((filename) => filename.indexOf('mu') === 0)
const modulePaths = muModules.map((modname) => path.join(repoPath, modname))

function spawnInDirectory (dir, command, args) {
    console.log('spawn:', command, 'in', dir, 'with args', args)
    spawn(command, args, {
        cwd: dir
    })
}

console.log('starting all typescript instances...')
modulePaths.forEach((dir) => {
    console.log(`starting tsc for ${dir}`)
    spawn('tsc', ['--watch'], {
        cwd: dir,
        stdio: ['inherit', 'inherit', 'inherit']
    })
})