import { RPCSchema } from './schema';
import { MuClient } from 'mudb/client';
import { MuRPCClient } from '../client';

export  = function (client:MuClient) {
    const protocol = new MuRPCClient(client, RPCSchema);
    const browser = getBrowser();
    let serverEnvironment = '';

    protocol.configure({
        rpc: {
            combine: (arg, next) => {
                let result = 0;
                arg.forEach((element) => { result += element; });
                next(undefined, result);
            },
            getEnvironment: (arg, next) => {
                if (arg) {
                    console.log('server node version:', arg);
                    serverEnvironment = arg;
                    next(undefined, browser);
                 }
            },
        },
        ready: () => {
            console.log('client ready');
            protocol.server.rpc.combine([4, 10, 15], (result) => {
                console.log('rpc combine result:', result);
            });
        },
    });
    client.start();

    function getBrowser() {
        // Opera 8.0+
        if ((!!(<any>window).opr && !!(<any>window).opr.addons) || !!(<any>window).opera || navigator.userAgent.indexOf(' OPR/') >= 0) { return 'Opera'; }

        // Firefox 1.0+
        if (typeof InstallTrigger !== 'undefined') { return 'FireBox'; }

        // Safari 3.0+ "[object HTMLElementConstructor]"
        if (/constructor/i.test((<any>window).HTMLElement) || (function (p) { return p.toString() === '[object SafariRemoteNotification]'; })(!window['safari'] || (typeof (<any>window).safari !== 'undefined' && (<any>window).safari.pushNotification))) { return 'safari'; }

        // Internet Explorer 6-11
        if (/*@cc_on!@*/false || !!window.document['documentMode']) { return 'IE'; }

        // Edge 20+
        if (!!(<any>window).StyleMedia) { return 'Edge'; }

        // Chrome 1+
        if (!!(<any>window).chrome && !!(<any>window).chrome.webstore) { return 'Chrome'; }

        return 'unknown browser type';
    }
};
