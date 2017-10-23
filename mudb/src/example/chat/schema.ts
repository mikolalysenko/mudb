import {
    MuString,
    MuStruct,
} from 'muschema';

export const ChatSchema = {
    client: {
        chat: new MuStruct({
            name: new MuString(),
            text: new MuString(),
        }),
    },
    server: {
        setName: new MuString('anon'),
        say: new MuString(),
    },
};