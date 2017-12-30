import buble from 'rollup-plugin-buble'

export default {
    input: 'src/server.js',
    output: {
        file: 'bin/server',
        format: 'cjs'
    },
    banner: '#!/usr/bin/env node',
    external: ['opts', 'pjson', 'path', 'http', 'fs', 'url'],
    paths: {
        pjson: '../package.json'
    },
    plugins: [
        buble()
    ]
}