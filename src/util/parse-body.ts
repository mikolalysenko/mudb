import * as http from 'http';
import * as zlib from 'zlib';

function decodeStream (req:http.IncomingMessage) {
    const encoding = req.headers['content-encoding'];
    if (encoding === 'deflate') {
        const stream = zlib.createInflate();
        req.pipe(stream);
        return stream;
    } else if (encoding === 'gzip') {
        const stream = zlib.createGunzip();
        req.pipe(stream);
        return stream;
    } else if (!encoding || encoding === 'identity') {
        return req;
    }
    throw new Error(`unknown encoding: ${encoding}`);
}

export function getRawBody (req:http.IncomingMessage, length:number) : Promise<Buffer> {
    return new Promise(function executor (resolve, reject) {
        if (length === 0) {
            return resolve(Buffer.alloc(0));
        }

        let complete = false;
        let received = 0;
        const buffers:Buffer[] = [];
        const stream = decodeStream(req);

        stream.on('aborted', onAborted);
        stream.on('close', cleanup);
        stream.on('data', onData);
        stream.on('end', onEnd);
        stream.on('error', onEnd);

        function cleanup () {
            buffers.length = 0;
            stream.removeListener('aborted', onAborted);
            stream.removeListener('data', onData);
            stream.removeListener('end', onEnd);
            stream.removeListener('error', onEnd);
            stream.removeListener('close', cleanup);
        }

        function done (error:string|undefined, buf?:Buffer) {
            complete = true;
            setImmediate(() => {
                cleanup();
                if (error) {
                    req.unpipe();
                    stream.pause();
                    reject(error);
                } else {
                    if (buf) {
                        resolve(buf);
                    } else {
                        reject(new Error('invalid buffer'));
                    }
                }
            });
        }

        function onAborted () {
            if (!complete) {
                done('request aborted');
            }
        }

        function onData (chunk:Buffer) {
            if (complete) {
                return;
            }
            received += chunk.length;
            if (received > length) {
                done('request entity too large');
            } else {
                buffers.push(chunk);
            }
        }

        function onEnd (err) {
            if (complete) {
                return;
            } else if (err) {
                return done(err);
            } else if (received !== length) {
                done('request size did not match content length');
            } else {
                done(void 0, Buffer.concat(buffers));
            }
        }
    });
}
