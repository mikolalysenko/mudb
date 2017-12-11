const fs = require('fs')
const path = require('path')
const { exec, execSync } = require('child_process')

const repoPath = path.resolve(__dirname, '..')

const repoContents = fs.readdirSync(repoPath)
const muModules = repoContents.filter((filename) => filename.indexOf('mu') === 0)
const modulePaths = muModules.map((modName) => path.join(repoPath, modName))

console.log('linking dependencies...')
modulePaths.forEach((dir) => {
    const exec = execInDirectory(dir)
    const packageJSON = require(path.join(dir, 'package.json'))

    function linkDeps (dependencies) {
        if (dependencies) {
            Object.keys(dependencies).forEach((dep) => {
                if (dep.indexOf('mu') === 0) {
                    exec(`npm link ${dep}`)
                }
            })
        }
    }

    linkDeps(packageJSON.dependencies)
    linkDeps(packageJSON.devDependencies)
})

function execInDirectorySync (dir) {
    return execInDirectory(dir, true)
}

function execInDirectory (dir, sync) {
    return (command) => {
        console.log('run:', command, 'in', dir)
        const doExec = sync ? execSync : exec
        doExec(command, {
            cwd: dir
        })
    }
}
