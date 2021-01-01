import { MuRPCServerTransport, MuRPCProtocol, MuRPCSchemas, MuRPCConnection } from '../protocol';
import { getRawBody } from '../../util/parse-body';
import * as http from 'http';

export type MuRPCHttpCookieOptions = {
    domain:string;
    path:string;
    maxAge:number;
    sameSite:''|'none'|'lax'|'strict';
    httpOnly:boolean;
    secure:boolean;
};

function opt<Key extends keyof MuRPCHttpCookieOptions> (
    key:Key,
    options:Partial<MuRPCHttpCookieOptions>|undefined,
    defaultValue:MuRPCHttpCookieOptions[Key]) : MuRPCHttpCookieOptions[Key] {
    if (options && (key in options)) {
        return <MuRPCHttpCookieOptions[Key]>options[key];
    }
    return defaultValue;
}

export class MuRPCHttpConnection implements MuRPCConnection {
    constructor (
        public request:http.IncomingMessage,
        public response:http.ServerResponse,
        public useCookie:boolean,
        public cookie:string,
        public auth:string,
    ) {}

    public setAuth (auth:string, options?:Partial<MuRPCHttpCookieOptions>) {
        if (this.useCookie) {
            const tokens = [ `${this.cookie}=${encodeURIComponent(auth)}` ];
            if (auth === '') {
                tokens.push('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
            } else {
                const maxAge = opt('maxAge', options, 0);
                if (maxAge) {
                    tokens.push(`Max-Age=${Math.ceil(maxAge)}`);
                }
                const httpOnly = opt('httpOnly', options, false);
                if (httpOnly) {
                    tokens.push('HttpOnly');
                }
                const secure = opt('secure', options, false);
                if (secure) {
                    tokens.push('Secure');
                }
                const sameSite = opt('sameSite', options, '');
                if (sameSite) {
                    tokens.push(`SameSite=${sameSite}`);
                }
            }
            const domain = opt('domain', options, '');
            if (domain) {
                tokens.push(`Domain=${domain}`);
            }
            const path = opt('path', options, '');
            if (path) {
                tokens.push(`Path=${path}`);
            }
            this.response.setHeader('Set-Cookie', tokens.join('; '));
        }
        this.auth = auth;
    }
}

export class MuRPCHttpServerTransport implements MuRPCServerTransport<any, MuRPCHttpConnection> {
    private _handlers:{
        [name:string]:{
            schemas:MuRPCSchemas<any>;
            auth:(conn:MuRPCHttpConnection) => Promise<boolean>,
            recv:(conn:MuRPCHttpConnection, arg:MuRPCSchemas<any>['argSchema']['identity'], response:MuRPCSchemas<any>['responseSchema']['identity']) =>
                Promise<void>;
        };
    } = {};

    private _route:string;
    private _useCookie:boolean;
    private _cookie:string;
    private _matchCookie:RegExp;
    private _byteLimit:number;

    constructor (spec:{
        route:string,
        byteLimit:number,
        cookie?:string,
    }) {
        this._route = spec.route;
        this._byteLimit = spec.byteLimit;
        if (this._route.charAt(0) !== '/') {
            this._route = '/' + this._route;
        }
        if (this._route.charAt(this._route.length - 1) !== '/') {
            this._route += '/';
        }
        if ('cookie' in spec) {
            this._useCookie = true;
            const cookie = this._cookie = spec.cookie || '';
            this._matchCookie = new RegExp(`(?:^|;) *${cookie}=([^;]*)`);
        } else {
            this._useCookie = false;
            this._cookie = '';
            this._matchCookie = new RegExp('');
        }
    }

    // call this in your server as a route
    public handler = async (
        request:http.IncomingMessage,
        response:http.ServerResponse,
    ) => {
        const method = request.method;
        if (method !== 'post' && method !== 'POST') {
            return false;
        }
        const url = request.url;
        if (!url || !url.startsWith(this._route)) {
            return false;
        }
        const suffix = url.substr(this._route.length);
        const handler = this._handlers[suffix];
        if (!handler) {
            return false;
        }
        const ret = handler.schemas.responseSchema.alloc();
        const length = parseInt(request.headers['content-length'] || '', 10) || 0;
        if (this._byteLimit < length) {
            ret.type = 'error';
            ret.data = 'size limit exceeded';
        } else {
            try {
                let auth = '';
                if (this._useCookie) {
                    const cookies = request.headers.cookie;
                    if (cookies) {
                        if (Array.isArray(cookies)) {
                            for (let i = 0; i < cookies.length; ++i) {
                                const match = cookies[i].match(this._matchCookie);
                                if (match && match[1]) {
                                    auth = decodeURIComponent(match[1]);
                                    break;
                                }
                            }
                        } else {
                            const match = cookies.match(this._matchCookie);
                            if (match && match[1]) {
                                auth = decodeURIComponent(match[1]);
                            }
                        }
                    }
                }
                const connection = new MuRPCHttpConnection(
                    request,
                    response,
                    this._useCookie,
                    this._cookie,
                    auth,
                );
                if (!(await handler.auth(connection))) {
                    ret.type = 'error';
                    ret.data = 'unauthorized';
                } else {
                    const body = await getRawBody(
                        request,
                        length);
                    const bodyStr = body.toString('utf8');
                    let bodyJSON:any = void 0;
                    if (bodyStr.length > 0) {
                        bodyJSON = JSON.parse(bodyStr);
                    }
                    const arg = handler.schemas.argSchema.fromJSON(bodyJSON);
                    await handler.recv(connection, arg, ret);
                }
            } catch (e) {
                ret.type = 'error';
                if (e instanceof Error && typeof e.stack !== 'undefined') {
                    ret.data = e.stack;
                } else {
                    ret.data = '' + e;
                }
            }
        }
        response.statusCode = ret.type === 'success' ? 200 : 400;
        response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.setHeader('Expires', '0');
        response.setHeader('Pragma', 'no-cache');
        response.setHeader('Surrogate-Control', 'no-store');
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.end(JSON.stringify(handler.schemas.responseSchema.toJSON(ret)));
        handler.schemas.responseSchema.free(ret);
        return true;
    }

    public listen<Protocol extends MuRPCProtocol<any>>(
        schemas:MuRPCSchemas<Protocol>,
        auth:(conn:MuRPCHttpConnection) => Promise<boolean>,
        recv:(conn:MuRPCHttpConnection, arg:MuRPCSchemas<Protocol>['argSchema']['identity'], response:MuRPCSchemas<Protocol>['responseSchema']['identity']) => void,
    ) {
        this._handlers[schemas.protocol.name] = {
            schemas,
            auth,
            recv: <any>recv,
        };
    }
}
