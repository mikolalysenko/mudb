import { MuRPCClientTransport, MuRPCProtocol, MuRPCSchemas } from '../protocol';
import http = require('http');

export class MuRPCHttpClientTransport implements MuRPCClientTransport<any> {
    private _url:string;
    private _cookies:{
        [cookie:string]:string;
    } = {};

    constructor (spec:{
        url:string;
    }) {
        this._url = spec.url;
    }

    public send<Protocol extends MuRPCProtocol<any>> (
        schemas:MuRPCSchemas<Protocol>,
        arg:MuRPCSchemas<Protocol>['argSchema']['identity'],
    ) {
        const argBuffer = new Buffer(JSON.stringify(schemas.argSchema.toJSON(arg)), 'utf8');
        return new Promise<MuRPCSchemas<Protocol>['responseSchema']['identity']>((resolve, reject) => {
            let completed = false;
            const buffers:Buffer[] = [];

            function done (error:any, payload?:Buffer) {
                if (completed) {
                    return;
                }
                completed = true;
                buffers.length = 0;
                if (error) {
                    return reject(error);
                } else if (!payload) {
                    return reject('unspecified error');
                }
                try {
                    return resolve(
                        schemas.responseSchema.fromJSON(
                            JSON.parse(payload.toString('utf8'))));
                } catch (e) {
                    return reject(e);
                }
            }

            const url = new URL(schemas.protocol.name, this._url);
            const req = http.request({
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': argBuffer.length,
                    'Cookie': Object.keys(this._cookies).map((cookie) => `${cookie}=${encodeURIComponent(this._cookies[cookie])}`).join('; '),
                },
            }, (res) => {
                const cookie = res.headers['set-cookie'];
                if (cookie) {
                    for (let i = 0; i < cookie.length; ++i) {
                        const parts = cookie[i].split('; ');
                        if (parts.length < 1) {
                            continue;
                        }
                        const tokens = parts[0].split('=');
                        this._cookies[tokens[0]] = decodeURIComponent(tokens[1]);
                    }
                }
                res.setEncoding('utf8');
                res.on('data', (chunk:Buffer) => {
                    if (completed) {
                        return;
                    }
                    buffers.push(chunk);
                });
                res.on('end', () => {
                    if (completed) {
                        return;
                    }
                    done(void 0, Buffer.concat(buffers));
                });
            });
            req.on('error', (err) => done(err));
            req.end(argBuffer);
        });
    }
}