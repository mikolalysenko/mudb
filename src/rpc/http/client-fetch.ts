import { MuRPCClientTransport, MuRPCProtocol, MuRPCSchemas } from '../protocol';

export class MuRPCFetchClientTransport implements MuRPCClientTransport<any> {
    private _url:string;
    constructor(spec:{
        url:string;
    }) {
        this._url = spec.url;
    }

    public async send<Protocol extends MuRPCProtocol<any>> (
        schemas:MuRPCSchemas<Protocol>,
        arg:MuRPCSchemas<Protocol>['argSchema']['identity'],
    ) {
        const body = JSON.stringify(schemas.argSchema.toJSON(arg));
        const response = await (await fetch(this._url + '/' + schemas.protocol.name, {
            method: 'POST',
            mode: 'same-origin',
            cache: 'no-cache',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            redirect: 'follow',
            body,
        })).json();
        return schemas.responseSchema.fromJSON(response);
    }
}
