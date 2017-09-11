import { connectToServer } from '../ws/socket-browser';

const socket = connectToServer({
    sessionId: 'foo' + Math.random(),
    url: 'ws://' + location.host,
});

socket.start({
    onReady(err?) {
        if (err) {
            return console.log(err);
        }

        let rcounter = 0;
        setInterval(
            () => {
                socket.send(new Uint8Array([rcounter++ % 256]));
            },
            32);
    },
    onMessage(message) {
        console.log(message);
    },
    onUnreliableMessage (message) {
        console.log(message);
    },
    onClose(err) {
        if (err) {
            console.log(err);
        }
    },
});