/*
import {
    MuString,
    MuStruct,
    MuFloat32,
    MuUnion,
    MuInt8,
    MuArray,
} from 'muschema';

const MuFloatOrString = new MuUnion({
    float: new MuFloat32(),
    string: new MuString(),
});

export const PointSchema = new MuStruct({
    x: new MuInt8(),
    y: new MuInt8(),
});

export const SnakeSchema = new MuStruct({
    id: new MuString(),
    body: new MuArray(PointSchema),
    color: new MuStruct({
        head: new MuString(),
        body: new MuString(),
    }),
});

export const GameSchema = {
    client: { // server to client
        updateFood: new MuArray(PointSchema),
        updateSnakes: new MuArray(SnakeSchema),
        playerDead: new MuString(),
        newPlayer: new MuString(),
    },
    server: { // client to server
        redirect: new MuInt8(),
    },
};
*/