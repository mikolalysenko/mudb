export type MuSessionId = string;
export type MuSessionData = any;

export type MuData = Uint8Array | string;

export type MuReadyHandler = () => void;
export type MuMessageHandler = (data:MuData, unreliable:boolean) => void;
export type MuCloseHandler = (error?:any) => void;
export type MuConnectionHandler = (socket:MuSocket) => void;

export type MuSocketSpec = {
    ready:MuReadyHandler;
    message:MuMessageHandler;
    close:MuCloseHandler;
};

export interface MuSocket {
    sessionId:MuSessionId;
    open:boolean;

    start(spec:MuSocketSpec);
    send(data:MuData, unreliable?:boolean);
    close();
}

export type MuSocketServerSpec = {
    ready:MuReadyHandler;
    connection:MuConnectionHandler;
    close:MuCloseHandler;
};

export interface MuSocketServer {
    clients:MuSocket[];
    open:boolean;

    start(spec:MuSocketServerSpec);
    close();
}
