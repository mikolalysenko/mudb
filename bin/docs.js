const fs = require('fs')
const path = require('path')
const spawn = require('child_process').spawn

const root = path.resolve(__dirname, '..')
const srcDir = `${root}/src`

const mods = fs.readdirSync(srcDir).filter((file) => {
    return /^[a-z]+$/.test(file) && file !== 'socket'
})
fs.readdirSync(`${srcDir}/socket`).forEach((dir) => mods.push(`socket/${dir}`))

const modPaths = mods.map((moduleName) => path.join(srcDir, moduleName))
modPaths.push(srcDir, root)

modPaths.forEach((dir) => {
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
