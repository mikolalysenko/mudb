import {
    MuString,
    MuStruct,
    MuFloat32,
    MuUnion,
    MuDictionary,
    MuInt8,
} from 'muschema';

const MuFloatOrString = new MuUnion({
    float: new MuFloat32(),
    string: new MuString(),
});

export const SnakeSchema = {
    client: {
        addFood: new MuStruct({
            x: new MuInt8(),
            y: new MuInt8(),
        }),
        // snakes: new MuDictionary(new MuStruct({
        //     clientId: new MuString(),
        //     body: new MuDictionary(new MuStruct({
        //         pointX: new MuInt8(),
        //         pointY: new MuInt8(),
        //         color: new MuString(),
        //     })),
        // })),
    },
    server: {
        redirect: new MuString(),
        // eatFood: new MuString(), // food id
        // dead: new MuString(), // dead info: touch border, touch own, touch other snake
        // setName: new MuString(), //TODO: user can set their name and the name can display on the snake head
    },
};
