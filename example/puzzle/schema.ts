import { MuRDARegister, MuRDAMap, MuRDAStruct, MuRDAConstant, MuRDAList } from 'mudb/rda';
import { MuStruct, MuInt32, MuFloat64, MuUTF8 } from 'mudb/schema';

export const PuzzlePiece = new MuRDAStruct({
    color: new MuRDARegister(new MuUTF8()),
    position: new MuRDAStruct({
        x: new MuRDARegister(new MuFloat64(0)),
        y: new MuRDARegister(new MuFloat64(0)),
    }),
    rotation: new MuRDARegister(new MuFloat64(0)),
});

export const PuzzleList = new MuRDAList(PuzzlePiece);

// export const Puzzle = new MuRDAMap(new MuUTF8(), PuzzlePiece);
