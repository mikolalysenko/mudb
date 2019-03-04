import {
    MuUTF8,
    MuStruct,
    MuFloat32,
    MuUnion,
} from 'mudb/schema';

const MuFloatOrString = new MuUnion({
    float: new MuFloat32(),
    string: new MuUTF8(),
});

export const ChatSchema = {
    client: {
        chat: new MuStruct({
            name: new MuUTF8(),
            text: new MuUTF8(),
        }),
    },
    server: {
        say: new MuUTF8(),
        setName: new MuUTF8(),
    },
};
