import { MuRPCClientTransport, MuRPCProtocol, MuRPCSchemas } from '../protocol';
import * as http from 'http';

export class MuRPCHttpClientTransport implements MuRPCClientTransport<any> {
    private _url:string;
    private _cookies:{
        [cookie:string]:string;
    } = {};
    private _headers;

    constructor (spec:{
        url:string;
        timeout:number;
        headers?:object;
    }) {
        this._url = spec.url;
        this._headers = spec.headers || {};
    }

    public send<Protocol extends MuRPCProtocol<any>> (
        schemas:MuRPCSchemas<Protocol>,
        arg:MuRPCSchemas<Protocol>['argSchema']['identity'],
    ) {
        const argBuffer = Buffer.from(JSON.stringify(schemas.argSchema.toJSON(arg)), 'utf8');
        return new Promise<MuRPCSchemas<Protocol>['responseSchema']['identity']>((resolve, reject) => {
            let completed = false;
            const chunks:string[] = [];

            function done (error:any, payload?:string) {
                if (completed) {
                    return;
                }
                completed = true;
                chunks.length = 0;
                if (error) {
                    return reject(error);
                } else if (!payload) {
                    return reject('unspecified error');
                }
                try {
                    let json:any = void 0;
                    if (payload.length > 0) {
                        json = JSON.parse(payload);
                    }
                    return resolve(schemas.responseSchema.fromJSON(json));
                } catch (e) {
                    return reject(e);
                }
            }

            const url = new URL(this._url + '/' + schemas.protocol.name);
            const req = http.request({
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': argBuffer.length,
                    'Cookie': Object.keys(this._cookies).map((cookie) => `${cookie}=${encodeURIComponent(this._cookies[cookie])}`).join('; '),
                    ...this._headers,
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
                res.on('data', (chunk) => {
                    if (completed) {
                        return;
                    } else if (typeof chunk === 'string') {
                        chunks.push(chunk);
                    } else {
                        chunks.push(chunk.toString('utf8'));
                    }
                });
                res.on('end', () => {
                    if (completed) {
                        return;
                    }
                    done(void 0, chunks.join(''));
                });
            });
            req.on('error', (err) => done(err));
            req.end(argBuffer);
        });
    }
}