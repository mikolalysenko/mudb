const { spawn } = require('child_process')
const path = require('path')

const moduleNames = process.argv.slice(2).map((moduleName) => {
    return /^\*/.test(moduleName) ? moduleName : `*${moduleName}`
})
const watchGlob = moduleNames.length > 0 ? `+(${moduleNames.join('|')})` : '*'
const repoRoot = path.resolve(__dirname, '..')

// lerna exec --parallel --scope <watchGlob> -- tsc --watch
spawn('lerna', [
    'exec',
    '--parallel',
    '--scope', watchGlob,
    '--',
    'tsc --watch',
], {
    cwd: repoRoot,
    stdio: 'inherit',
})
