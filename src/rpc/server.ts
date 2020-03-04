import { MuRPCProtocol, MuRPCTypes, MuRPCSchemas, MuRPCServerTransport } from './protocol';
import { MuLogger } from '../logger';

export class MuRPCServer<Protocol extends MuRPCProtocol<any>> {
    public schemas:MuRPCSchemas<Protocol>;
    public transport:MuRPCServerTransport<Protocol>;

    constructor (spec:{
        protocol:Protocol,
        transport:MuRPCServerTransport<Protocol>,
        authorize:(auth:string) => Promise<boolean>,
        handlers:MuRPCTypes<Protocol>['handlers'],
        logger?:MuLogger,
    }) {
        const logger = spec.logger;
        const schemas = this.schemas = new MuRPCSchemas(spec.protocol);
        this.transport = spec.transport;
        this.transport.listen(
            schemas,
            async (auth, arg, response) => {
                try {
                    const method = <any>arg.type;
                    const handler = spec.handlers[method];
                    if (!handler) {
                        logger && logger.error(`invalid rpc method: ${method}. auth=${auth}`);
                        response.type = 'error';
                        response.data = `invalid rpc method: ${method}`;
                    } else if (!(await spec.authorize(auth))) {
                        response.type = 'error';
                        response.data = 'unauthorized rpc call';
                    } else {
                        const retSchema = schemas.protocol.methods[method].ret;
                        if (handler.length === 3) {
                            const ret = retSchema.alloc();
                            const actualRet = await handler(auth, arg.data, ret);
                            response.type = 'success';
                            const retInfo = response.data = schemas.retSchema.alloc();
                            retInfo.type = method;
                            if (ret === actualRet) {
                                retInfo.data = ret;
                            } else {
                                logger && logger.log(`warning, handler for ${method} did not use storage for return type`);
                                retSchema.free(ret);
                                retInfo.data = actualRet;
                            }
                        } else {
                            // if user doesn't take storage as an argument, then we just leak the response reference
                            const ret = await handler(auth, arg.data, <any>undefined);
                            response.type = 'success';
                            const retInfo = response.data = schemas.retSchema.alloc();
                            retInfo.type = method;
                            retInfo.data = retSchema.clone(ret);
                        }
                    }
                } catch (e) {
                    logger && logger.error(e);
                    response.type = 'error';
                    response.data = `internal error: ${e}`;
                }
            });
    }
}