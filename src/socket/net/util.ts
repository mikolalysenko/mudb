import { MuData } from '../socket';

enum Read {
    HEADER,
    PAYLOAD,
}

const HEADER_LENGTH = 4;

// TODO minimize buffer allocation
export function messagify (socket) {
    let bufSize = 0;
    const buf:Buffer[] = [];

    let hasMsg = false;
    let next = Read.HEADER;
    let msgLength = 0;

    function readBuf (length:number) : Buffer {
        bufSize -= length;

        if (length === buf[0].length) {
            return buf.shift() as Buffer;
        }

        let result:Buffer;
        if (length < buf[0].length) {
            result = buf[0].slice(0, length);
            buf[0] = buf[0].slice(length);
            return result;
        }

        result = Buffer.allocUnsafe(length);
        let offset = 0;
        let bl;
        while (length > 0) {
            bl = buf[0].length;

            if (length >= bl) {
                buf[0].copy(result, offset);
                offset += bl;
                buf.shift();
            } else {
                buf[0].copy(result, offset, 0, length);
                buf[0] = buf[0].slice(length);
            }

            length -= bl;
        }
        return result;
    }

    function fetchMsg () {
        while (hasMsg) {
            if (next === Read.HEADER) {
                if (bufSize >= HEADER_LENGTH) {
                    next = Read.PAYLOAD;
                    msgLength = readBuf(HEADER_LENGTH).readUInt32LE(0);
                } else {
                    hasMsg = false;
                }
            } else if (next === Read.PAYLOAD) {
                if (bufSize >= msgLength) {
                    next = Read.HEADER;
                    socket.emit('message', readBuf(msgLength));
                } else {
                    hasMsg = false;
                }
            }
        }
    }

    const socketWrite = socket.write.bind(socket);
    socket.write = function (data:MuData) {
        const payload = Buffer.from(data);
        const header = Buffer.allocUnsafe(HEADER_LENGTH);
        header.writeUInt32LE(payload.length, 0);

        socketWrite(header);
        socketWrite(payload);
    };

    socket.on('data', (data) => {
        buf.push(data);
        bufSize += data.length;

        hasMsg = true;
        fetchMsg();
    });
}

export function isJSON (buf:Buffer) {
    return buf[0] === 0x7b && buf[buf.length - 1] === 0x7d;
}
