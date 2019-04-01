#!/usr/bin/env node
const path = require('path')
const exec = require('child_process').exec

const argv = process.argv.slice(2)
const exp = argv[0]
if (!exp) {
    throw new Error(`example name is missing`)
}

const mudoDir = path.join(path.resolve('..'), 'tool/mudo')
const expDir = path.join(path.resolve('.'), exp)
const sockType = argv[1] || 'web'
const cmd = `node ${mudoDir}/bin/mudo.js --client ${expDir}/client.js --server ${expDir}/server.js --socket ${sockType} --open`

exec(cmd, (err, stdout) => {
    if (err) {
        console.error(err)
        return
    }
    console.log(stdout)
})
