import {
    MuString,
    MuStruct,
    MuFloat32,
    MuUnion,
    MuDictionary,
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
    },
    server: { // client to server
        redirect: new MuInt8(),
        // eatFood: new MuString(), // food id
        // dead: new MuString(), // dead info: touch border, touch own, touch other snake
        // setName: new MuString(), //TODO: user can set their name and the name can display on the snake head
    },
};
