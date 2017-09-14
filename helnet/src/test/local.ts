import tape = require('tape');
import { createLocalClient, createLocalServer } from '../local/local';

class DBEvent {
    public type:string;
    public timestamp:number;
    public payload:any;

    constructor (type:string, payload:any) {
        this.type = type;
        this.timestamp = Date.now();
        this.payload = payload;
    }
}

// spin until some event fires or timeout
function findEvent (events:DBEvent[], pred:(event:DBEvent) => boolean) : number {
    for (let i = 0; i < events.length; ++i) {
        if (pred(events[i])) {
            return i;
        }
    }
    return -1;
}

function awaitEvent (events:DBEvent[], pred:(event:DBEvent) => boolean, done:(index:number) => void, timeout?:number) {
    const endTime = Date.now() + (timeout || Infinity);
    const interval = setInterval(
        () => {
            const idx = findEvent(events, pred);
            if (idx >= 0) {
                clearInterval(interval);
                done(idx);
                return;
            } else if (Date.now() > endTime) {
                clearInterval(interval);
                done(-1);
                return;
            }
        },
        32);
}

function createLogServer () {
    const server = createLocalServer({});
    const events:DBEvent[] = [];

    server.start({
        ready (err?:any) {
            events.push(new DBEvent('ready', {err}));
        },
        connection (socket) {
            events.push(new DBEvent('connection', {socket}));

            socket.start({
                ready(err?:any) {
                    events.push(new DBEvent('socket ready', {
                        err,
                        socket,
                    }));
                },
                message(message) {
                    events.push(new DBEvent('message', {
                        message,
                        socket,
                    }));
                },
                unreliableMessage(message) {
                    events.push(new DBEvent('~message', {
                        message,
                        socket,
                    }));
                },
                close(err?:any) {
                    events.push(new DBEvent('close', {
                        err,
                        socket,
                    }));

                },
            });
        },
    });

    function connect (sessionId:string) {
        const socket = createLocalClient(
            sessionId,
            { server });
        const clientEvents:DBEvent[] = [];

        socket.start({
            ready(err?:any) {
                clientEvents.push(new DBEvent('socket ready', {
                    socket,
                    err,
                }));
            },
            message(message) {
                clientEvents.push(new DBEvent('message', {
                    message,
                    socket,
                }));
            },
            unreliableMessage(message) {
                clientEvents.push(new DBEvent('~message', {
                    message,
                    socket,
                }));
            },
            close(err?:any) {
                clientEvents.push(new DBEvent('close', {
                    err,
                    socket,
                }));
            },
        });

        return {
            socket,
            events: clientEvents,
        };
    }

    function close () {
        server.close();
    }

    return {
        server,
        events,
        connect,
        close,
    };
}

tape('create test', function (t) {
    const server = createLogServer();
    const client = server.connect('foo');

    awaitEvent(
        client.events,
        ({type}) => type === 'socket ready',
        (idx) => {
            server.close();
            console.log(server.events);
            console.log(client.events);
            t.end();
        });
});