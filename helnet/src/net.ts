export type HelSessionId = string;
export type HelSessionData = any;

export type HelData = Uint8Array | string;

export type HelReadyHandler = (error?:any) => void;
export type HelMessageHandler = (data:HelData) => void;
export type HelCloseHandler = (error?:any) => void;
export type HelConnectionHandler = (socket:HelSocket) => void;

export type HelSocketSpec = {
    ready:HelReadyHandler;
    message:HelMessageHandler;
    unreliableMessage:HelMessageHandler;
    close:HelCloseHandler;
};

export interface HelSocket {
    sessionId:HelSessionId;
    open:boolean;

    start(spec:HelSocketSpec);

    send(data:HelData);
    sendUnreliable(data:HelData);
    close();
}

export type HelServerSpec = {
    ready:HelReadyHandler;
    connection:HelConnectionHandler;
};

export interface HelServer {
    clients:HelSocket[];
    open:boolean;

    start(spec:HelServerSpec);

    close();
}
