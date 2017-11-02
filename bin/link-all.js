const fs = require('fs')
const path = require('path')
const execSync = require('child_process').execSync

const repoPath = path.resolve(__dirname, '..')

const repoContents = fs.readdirSync(repoPath)
const muModules = repoContents.filter((filename) => filename.indexOf('mu') === 0)
const modulePaths = muModules.map((modname) => path.join(repoPath, modname))


function execInDirectory (dir) {
    return (command) => {
        console.log('run:', command, 'in', dir)
        execSync(command, {
            cwd: dir
        })
    }
}

console.log('installing dependencies and registering modules...')
modulePaths.forEach((dir) => {
    const exec = execInDirectory(dir)
    exec('rm -rf node_modules')
    exec('npm i')
    exec('npm link')
})

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