```ts
import { MuRTCSocketServer } from 'mudb/socket/webrtc/server';
import { MuRTCSocket } from 'mudb/socket/webrtc/client';

const socketServer = new MuRTCSocketServer({
    // in Node.js
    // wrtc: require('wrtc'),
    signal: (data, sessionId) => {
        socket.handleSignal(data);
    },
});

const socket = new MuRTCSocket({
    // in Node.js
    // wrtc: require('wrtc'),
    sessionId,
    signal: (data) => {
        socketServer.handleSignal(data);
    },
});
```

```ts
// say we use WebSocket for signaling

// server side
const signalingServer = new WS.Server();
const signalingChannels = {};
const socketServer = new MuRTCSocketServer({
    signal: (data, sessionId) => {
        signalingChannels[sessionId].send(JSON.stringify(data));
    },
});
signalingServer.on('connection', (channel) => {
    let sessionId;
    channel.onmessage = ({ data }) => {
        channel.onmessage = ({ data }) => {
            socketServer.handleSignal(JSON.parse(data));
        }
        sessionId = JSON.parse(data).sid;
        signalingChannels[sessionId] = channel;
    };
    channel.onclose = () => {
        delete signalingChannels[sessionId];
    }
});

// client side
const signalingChannel = new WebSocket(signalingServerURL);
const socket = new MuRTCSocket({
    sessionId,
    signal: (data) => {
        signalingChannel.send(JSON.stringify(data));
    };
});
signalingChannel.onopen = () => {
    signalingChannel.send(JSON.stringify({ sid: sessionId }));
};
signalingChannel.onmessage = ({ data }) => {
    socket.handleSignal(JSON.parse(data));
};
const client = new MuClient(socket);
client.start({
    ready: () => {
        signalingChannel.close();
    }
});
```
