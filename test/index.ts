import { test } from 'tapzero'
import { createDID, createUsername } from '../src/util.js'
import { WnfsBlobs } from '../src/index.js'
// import fs from 'fs'
// import path from 'path'
// import * as wn from 'webnative'

// const data = fs.readFileSync(path.join(__dirname, 'caracal.jpg'))
// const blob = new Blob([data as BlobPart])
// const file = new File([blob], 'caracal.jpg')

// @ts-ignore
const wn = window.webnative

const blob = new Blob(['ok'], {
    type: 'image/jpeg',
})
const file = new File([blob], 'ok.jpg', { type: 'image/jpeg' })

test('make a post', async t => {
    const APP_INFO = { name: 'test', creator: 'test' }

    const program = await wn.program({
        namespace: APP_INFO
    })
    const { crypto } = program.components
    const username = await createUsername(await createDID(crypto))

    // *must* call `register` before we use the `session`
    await program.auth.register({ username })

    const { keystore } = program.components.crypto

    const session = program.session ?? await program.auth.session()

    // constructor ({ APP_INFO, LOG_DIR_PATH, BLOB_DIR_PATH, wnfs }:wnfsBlobsArgs) {
    const wnfsBlobs = new WnfsBlobs({
        wnfs: session.fs,
        APP_INFO,
        program
    })

    const res = await wnfsBlobs.post(keystore, file, {
        text: 'testing'
    })

    t.ok(res.signature)  // @TODO -- verify signature
    t.equal(res.content.type, 'post', 'should set content.type')
    t.equal(res.content.text, 'testing', 'should set content.text')
})
