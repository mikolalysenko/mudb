export type MuSessionId = string;

export type MuData = Uint8Array | string;

export interface MuReadyHandler {
    () : void;
}
export interface MuMessageHandler {
    (data:MuData, unreliable:boolean) : void;
}
export interface MuCloseHandler {
    (error?:any) : void;
}
export interface MuConnectionHandler {
    (socket:MuSocket) : void;
}

export enum MuSocketState {
    INIT,
    OPEN,
    CLOSED,
}

export interface MuSocketSpec {
    ready:MuReadyHandler;
    message:MuMessageHandler;
    close:MuCloseHandler;
}

export interface MuSocket {
    readonly sessionId:MuSessionId;
    state() : MuSocketState;
    open(spec:MuSocketSpec);
    send(data:MuData, unreliable?:boolean);
    close();
    reliableBufferedAmount() : number;
    unreliableBufferedAmount() : number;
}

export enum MuSocketServerState {
    INIT,
    RUNNING,
    SHUTDOWN,
}

export interface MuSocketServerSpec {
    ready:MuReadyHandler;
    connection:MuConnectionHandler;
    close:MuCloseHandler;
}

export interface MuSocketServer {
    clients:MuSocket[];
    state() : MuSocketServerState;
    start(spec:MuSocketServerSpec);
    close();
}
