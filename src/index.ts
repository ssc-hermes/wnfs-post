import * as wn from "webnative"
import stringify from 'json-stable-stringify'
import timestamp from 'monotonic-timestamp'

interface appInfo {
    name:string,
    creator:string
}

interface newPost {
    text:string,
    alt: string,
    author: string
}

interface wnfsBlobsArgs {
    APP_INFO: appInfo,
    LOG_DIR_PATH?: string,
    wnfs: wn.FileSystem
    BLOB_DIR_PATH?: string
}

export class WnfsBlobs {
    APP_INFO:appInfo
    LOG_DIR_PATH:string
    BLOB_DIR_PATH:string
    wnfs:wn.FileSystem

    constructor ({ APP_INFO, LOG_DIR_PATH, BLOB_DIR_PATH, wnfs }:wnfsBlobsArgs) {
        this.APP_INFO = APP_INFO
        this.wnfs = wnfs
        this.LOG_DIR_PATH = LOG_DIR_PATH || 'log'
        this.BLOB_DIR_PATH = BLOB_DIR_PATH || 'blob'
    }

    /**
     * @description Write a new post to the `wnfs`. This will find the latest
     * the correct sequence number for the post, and get the signature of the 
     * last post
     * @param file the image File
     * @param newPost content for the new post
     */
    async post (file:File, { text, alt, author }:newPost):Promise<string> {
        const logPath = wn.path.appData(
            this.APP_INFO,
            wn.path.directory(this.LOG_DIR_PATH)
        )

        await this.wnfs.mkdir(logPath)
        const existingPosts = await this.wnfs.ls(logPath)
        const ns = (Object.keys(existingPosts) || [])
            .map(key => parseInt(key.split('.')[0]))
            .sort((a,b) => b - a) // sort descending order

        const n = ns.length ? (ns[0] + 1) : 0

        // get filepath for the post JSON
        // posts are like /log-dir/1.json
        const newPostPath = wn.path.appData(
            this.APP_INFO,
            wn.path.file(this.LOG_DIR_PATH, n + '.json')
        )

        // write the JSON
        const newPost:string = createPostFromContent(text, {
            sequence: n,
            alt,
            author
        })
        await this.wnfs.write(
            newPostPath,
            new TextEncoder().encode(newPost)
        )

        const imgFilepath = wn.path.appData(
            this.APP_INFO,
            // __@TODO__ -- handle other file extensions
            wn.path.file(this.BLOB_DIR_PATH, n + '-0.jpg')
            // ^ we are only supporting single image per post right now
        )

        const reader = new FileReader()
        reader.onloadend = async () => {
            await this.wnfs.write(imgFilepath, reader.result as Uint8Array)
            console.log('img path written...', imgFilepath)
            await this.wnfs.publish()
        }

        return newPost
    }
}

interface newPostArgs {
    sequence: number,  // post sequence number
    alt?: string,  // alt text for image
    author: string  // author DID
}

/**
 * @description Create a stringified post from given content.
 */
function createPostFromContent (text:string,
{ sequence, alt, author }:newPostArgs):string {
    return stringify({
        sequence,
        timestamp: +timestamp(),
        author,
        content: {
            type: 'post',
            text: text,
            alt: alt || '',
            mentions: [sequence + '-0.jpg']  // handle 1 image per post
        }
    })
}
