export type NetSessionId = string;
export type NetSessionData = any;

export type NetData = any;

export type NetMessageHandler = (client:INetClient, data:NetData) => void;
export type NetCloseHandler = (error?:any) => void;

export type NetConnectionHandler = (
    sessionId:NetSessionId, 
    sessionData:NetSessionData,
    next:(error?:any) => void) => void;

export type NetClientSpec = {
    onMessage:NetMessageHandler;
    onUnreliableMessage:NetMessageHandler;
    onClose:NetCloseHandler;
}
    
export interface INetClient {
    sessionId:NetSessionId;

    configure(spec:NetClientSpec);

    send(data:NetData);
    sendUnreliable(data:NetData);
    close();
}


export type NetServerSpec = {
    onConnection:NetConnectionHandler;
    onClose:NetCloseHandler;
}

export interface INetServer {
    clients:INetClient[];

    configure(spec:NetServerSpec);

    broadcast(data:any);
    broadcastUnreliable(data:any);
    close();
}