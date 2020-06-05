import { MuRPCClientTransport, MuRPCProtocol, MuRPCSchemas } from '../protocol';

export class MuRPCHttpClientTransport implements MuRPCClientTransport<any> {
    private _url:string;
    private _timeout:number;

    constructor(spec:{
        url:string;
        timeout:number;
    }) {
        this._url = spec.url;
        this._timeout = spec.timeout;
    }

    public send<Protocol extends MuRPCProtocol<any>> (
        schemas:MuRPCSchemas<Protocol>,
        arg:MuRPCSchemas<Protocol>['argSchema']['identity'],
    ) {
        const xhr = new XMLHttpRequest();
        xhr.responseType = '';
        if (this._timeout < Infinity && this._timeout) {
            xhr.timeout = this._timeout;
        }
        xhr.open('POST', this._url + '/' + schemas.protocol.name, true);
        const body = JSON.stringify(schemas.argSchema.toJSON(arg));
        return new Promise<MuRPCSchemas<Protocol>['responseSchema']['identity']>((resolve, reject) => {
            let completed = false;
            xhr.onreadystatechange = () => {
                if (completed) {
                    return;
                }
                const readyState = xhr.readyState;
                if (readyState === 4) {
                    completed = true;
                    const responseText = xhr.responseText;
                    try {
                        let json:any = void 0;
                        if (0 < responseText.length) {
                            json = JSON.parse(responseText);
                        }
                        return resolve(schemas.responseSchema.fromJSON(json));
                    } catch (e) {
                        return reject(e);
                    }
                }
            };
            xhr.onabort = () => {
                if (completed) {
                    return;
                }
                reject('aborted');
            };
            xhr.onerror = () => {
                if (completed) {
                    return;
                }
                reject('error');
            };
            xhr.send(body);
        });
    }
}
