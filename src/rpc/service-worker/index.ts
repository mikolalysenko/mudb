import { MuLogger } from '../../logger';
import { MuRPCConnection, MuRPCProtocol, MuRPCSchemas, MuRPCServerTransport } from '../protocol';

interface FetchEvent extends Event {
    request:Request;
    respondWith(response:Promise<Response>|Response) : any;
    waitUntil(fn:Promise<any>) : any;
}

export class MuRPCServiceWorkerConnection implements MuRPCConnection {
    constructor (public fetchEvent:FetchEvent) {}

    public auth:string = '';
    public setAuth (x:string) {
        this.auth = x;
    }
}

export class MuRPCServiceWorkerTransport implements MuRPCServerTransport<MuRPCProtocol<any>, MuRPCServiceWorkerConnection> {
    private _handlers:{
        [name:string]:{
            schemas:MuRPCSchemas<any>;
            auth:(conn:MuRPCServiceWorkerConnection) => Promise<boolean>,
            recv:(conn:MuRPCServiceWorkerConnection, arg:MuRPCSchemas<any>['argSchema']['identity'], response:MuRPCSchemas<any>['responseSchema']['identity']) => Promise<void>;
        };
    } = {};
    private _routePrefix:string;
    private _logger:MuLogger|null = null;

    constructor (spec:{
        url:string,
        logger?:MuLogger,
    }) {
        this._routePrefix = spec.url;
        if (spec.logger) {
            this._logger = spec.logger;
        }
    }

    public listen (schemas:any, auth:any, recv:any) {
        this._handlers[schemas.protocol.name] = {
            schemas,
            auth,
            recv,
        };
    }

    public handler (event:FetchEvent) {
        if (event.request.method !== 'POST') {
            return false;
        }

        if (!event.request.url.startsWith(this._routePrefix)) {
            return false;
        }

        const suffix = event.request.url.substr(this._routePrefix.length + 1);

        const handler = this._handlers[suffix];
        if (!handler) {
            return false;
        }

        event.respondWith((async () => {
            const conn = new MuRPCServiceWorkerConnection(event);
            try {
                const auth = await handler.auth(conn);
                if (!auth) {
                    return new Response(JSON.stringify({
                        type: 'error',
                        data: 'Permission denied',
                    }), {
                        status: 500,
                        statusText: 'NOT OK',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                } else {
                    const result = await event.request.text();
                    if (!result) {
                        throw new Error('Missing body');
                    }

                    // call the handler, generate JSON response
                    const arg = handler.schemas.argSchema.fromJSON(JSON.parse(result));
                    const res = handler.schemas.responseSchema.alloc();
                    await handler.recv(conn, arg, res);
                    const jsonResponse = JSON.stringify(handler.schemas.responseSchema.toJSON(res));
                    handler.schemas.responseSchema.free(res);

                    return new Response(jsonResponse, {
                        status: 200,
                        statusText: 'OK',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                }
            } catch (e) {
                if (e) {
                    return new Response(JSON.stringify({
                        type: 'error',
                        data: e.stack || e.toString(),
                    }), {
                        status: 500,
                        statusText: 'NOT OK',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                }
            }
            return new Response(JSON.stringify({
                type: 'error',
                data: 'Unspecified error',
            }), {
                status: 500,
                statusText: 'NOT OK',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        })());

        return true;
    }
}
