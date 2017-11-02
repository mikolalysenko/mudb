const fs = require('fs')
const path = require('path')
const spawn = require('child_process').spawn

const repoPath = path.resolve(__dirname, '..')

const repoContents = fs.readdirSync(repoPath)
const muModules = repoContents.filter((filename) => filename.indexOf('mu') === 0)
const modulePaths = muModules.map((modname) => path.join(repoPath, modname))
modulePaths.push(repoPath)

function spawnInDirectory (dir, command, args) {
    console.log('spawn:', command, 'in', dir, 'with args', args)
    spawn(command, args, {
        cwd: dir
    })
}

console.log('processing readme files...')
modulePaths.forEach((dir) => {
    const tocPath = path.join(dir, 'README-toc.md')
    const mdPath = path.join(dir, 'README.md')

    console.log(`generate toc: ${tocPath} > ${mdPath}`)

    const x = fs.openSync(tocPath, 'r+')
    const y = fs.openSync(mdPath, 'w+')

    spawn('mdtoc', [], {
        cwd: dir,
        stdio: [
            x, 
            y,
            'inherit']
    })
})