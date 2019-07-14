import {
    MuUTF8,
    MuStruct,
} from 'mudb/schema';

export const ChatSchema = {
    client: {
        chat: new MuStruct({
            name: new MuUTF8(),
            msg: new MuUTF8(),
        }),
        notice: new MuUTF8(),
    },
    server: {
        join: new MuUTF8(),
        nick: new MuUTF8(),
        say: new MuUTF8(),
    },
};
