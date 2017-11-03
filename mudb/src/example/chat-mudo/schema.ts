import {
    MuString,
    MuStruct,
    MuFloat32,
    MuUnion,
} from 'muschema';

const MuFloatOrString = new MuUnion({
    float: new MuFloat32(),
    string: new MuString(),
});

export const ChatSchema = {
    client: {
        chat: new MuStruct({
            name: new MuString(),
            text: new MuString(),
        }),
    },
    server: {
        say: new MuString(),
    },
};