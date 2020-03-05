import { MuRPCServerTransport, MuRPCProtocol, MuRPCSchemas } from '../protocol';
import http = require('http');

export class MuRPCHttpServerTransport implements MuRPCServerTransport<any> {
    private _handlers:{
        [name:string]:{
            schemas:MuRPCSchemas<any>;
            recv:(auth:string, arg:MuRPCSchemas<any>['argSchema']['identity'], response:MuRPCSchemas<any>['responseSchema']['identity']) => void;
        };
    } = {};

    private _route:string;
    private _useCookie:boolean;
    private _cookie:string;

    constructor (spec:{
        route:string,
        cookie?:string,
    }) {
        this._route = spec.route;
        if ('cookie' in spec) {
            this._useCookie = true;
            this._cookie = spec.cookie || '';
        } else {
            this._useCookie = false;
            this._cookie = '';
        }
    }

    public httpHandler = (
        request:http.IncomingMessage,
        response:http.ServerResponse,
    ) => {
        const method = request.method;
        if (method !== 'post' && method !== 'POST') {
            return false;
        }

        // check if route matches

        // parse cookie

        // call handler

        return true;
    }

    public listen<Protocol extends MuRPCProtocol<any>>(
        schemas:MuRPCSchemas<Protocol>,
        recv:(auth:string, arg:MuRPCSchemas<Protocol>['argSchema']['identity'], response:MuRPCSchemas<Protocol>['responseSchema']['identity']) => void,
    ) {
        this._handlers[schemas.protocol.name] = {
            schemas,
            recv: <any>recv,
        };
    }
}