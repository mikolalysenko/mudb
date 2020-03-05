/**
 * Adapted from https://github.com/stream-utils/raw-body
 */
import http = require('http');

export function getRawBody (stream:http.IncomingMessage, length:number) : Promise<Buffer> {
    return new Promise(function executor (resolve, reject) {
        let complete = false;
        let received = 0;
        const buffers:Buffer[] = [];

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
                    stream.unpipe();
                    stream.pause();
                    reject(error);
                } else {
                    resolve(buf);
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
