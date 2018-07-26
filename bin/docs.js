const fs = require('fs')
const path = require('path')
const spawn = require('child_process').spawn

const repoRoot = path.resolve(__dirname, '..')
const modulesRoot = `${repoRoot}/modules`
const moduleNames = fs.readdirSync(modulesRoot).filter((moduleName) => /^[A-Za-z0-9-]+$/.test(moduleName))

const modulePaths = moduleNames.map((moduleName) => path.join(modulesRoot, moduleName))
modulePaths.push(repoRoot)

modulePaths.forEach((dir) => {
    const tocPath = path.join(dir, 'README-toc.md')
    const mdPath = path.join(dir, 'README.md')

    console.log(`generate toc: ${tocPath} > ${mdPath}`)

    spawn('mdtoc', [], {
        cwd: dir,
        stdio: [
            fs.openSync(tocPath, 'r+'),
            fs.openSync(mdPath, 'w+'),
            'inherit',
        ],
    })
})
