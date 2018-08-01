const { spawn } = require('child_process')
const path = require('path')

const patterns = process.argv.slice(2)
const scopeGlob = patterns.length > 0 ? `+(${patterns.join('|')})` : '*'
const repoRoot = path.resolve(__dirname, '..')

spawn(
    `lerna exec --parallel --scope "${scopeGlob}" -- tsc --watch`,
    {
        shell: true,
        cwd: repoRoot,
        stdio: 'inherit',
    },
)
