import {
    MuUTF8,
    MuStruct,
    MuFloat32,
    MuUnion,
    MuInt8,
    MuArray,
} from 'mudb/schema';

const MuFloatOrString = new MuUnion({
    float: new MuFloat32(),
    string: new MuUTF8(),
});

export const PointSchema = new MuStruct({
    x: new MuInt8(),
    y: new MuInt8(),
});

export const SnakeSchema = new MuStruct({
    id: new MuUTF8(),
    body: new MuArray(PointSchema, Infinity),
    color: new MuStruct({
        head: new MuUTF8(),
        body: new MuUTF8(),
    }),
});

export const GameSchema = {
    client: { // server to client
        updateFood: new MuArray(PointSchema, Infinity),
        updateSnakes: new MuArray(SnakeSchema, Infinity),
        playerDead: new MuUTF8(),
        newPlayer: new MuUTF8(),
    },
    server: { // client to server
        redirect: new MuInt8(),
    },
};
