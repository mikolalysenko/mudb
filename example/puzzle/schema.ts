import { MuRDARegister, MuRDAMap, MuRDAStruct, MuRDAConstant, MuRDAList } from 'mudb/rda';
import { MuStruct, MuInt32, MuFloat64, MuUTF8 } from 'mudb/schema';

export const PuzzlePiece = new MuRDAStruct({
    color: new MuRDAConstant(new MuUTF8()),
    position: new MuRDARegister(new MuStruct({
        x: new MuFloat64(0),
        y: new MuFloat64(0),
    })),
    rotation: new MuRDARegister(new MuFloat64(0)),
});

export const Puzzle = new MuRDAMap(new MuUTF8(), PuzzlePiece);
