import { MuClient } from 'mudb/client';
import { MuReplicaClient } from 'mudb/replica/client';
import { PuzzleList } from './schema';
import { ExampleUi, PuzzleDetail } from './ui';

export = function (client:MuClient) {
    const replica = new MuReplicaClient({
        client,
        rda: PuzzleList,
    });

    replica.configure({
        ready: () => {
            console.log('client ready');
        },
        change: (state) => {
            ui.renderDom([...state]);
        },
    });

    const setColor = (idx:number, color:string) => {
        const action = replica.action().update(idx).color(color);
        replica.dispatch(
            action,
            true,
        );
    };

    const setRotation = (idx:number, rotation:number) => {
        const action = replica.action().update(idx).rotation(rotation);
        replica.dispatch(
            action,
            true,
        );
    };

    const setPositionX = (idx:number, x:number) => {
        replica.dispatch(
            replica.action().update(idx).position.x(x),
            true,
        );
    };

    const setPositionY = (idx:number, y:number) => {
        replica.dispatch(
            replica.action().update(idx).position.y(y),
            true,
        );
    };

    const deletePuzzle = (idx:number) => {
        replica.dispatch(
            replica.action().remove(idx),
        );
    };

    const createPuzzle = (puzzle:PuzzleDetail) => {
        replica.dispatch(
            replica.action().push([puzzle]),
        );
    };

    const ui = new ExampleUi({
        puzzleList: [],
        setX: (idx:number, x:number) => setPositionX(idx, x),
        setY: (idx:number, y:number) => setPositionY(idx, y),
        setColor: (idx:number, color:string) => setColor(idx, color),
        setRotation: (idx:number, rotation:number) => setRotation(idx, rotation),
        undo: () => replica.undo(),
        redo: () => replica.redo(),
        deletePuzzle: (idx) => deletePuzzle(idx),
        createPuzzle: (p) => createPuzzle(p),
    });

    client.start();
};