import {
  MuStruct,
  MuDictionary,
  MuString,
  MuFloat64,
  MuInt8,
  MuArray,
} from 'muschema';
import {
  MuFloat32,
} from '../../../muschema/float32';

export const PlayerSchema = new MuStruct({
  team: new MuInt8(),
  x: new MuFloat64(),
  y: new MuFloat64(),
});

export const FlagSchema = new MuStruct({
  team: new MuInt8(),
  x: new MuFloat64(),
  y: new MuFloat64(),
});

export const StateSchema = {
  client: PlayerSchema,
  server: new MuStruct({
    player: new MuDictionary(PlayerSchema),
    flag: new MuArray(FlagSchema),
  }),
};

export const MsgSchema = {
  client: {
    // score
  },
  server: {

  },
};

export const RpcSchema = {
  client: {
    joinTeam: {
      0: new MuString(),
      1: new MuInt8(),
    },
  },
  server: {
    joinTeam: {
      0: new MuString(),
      1: new MuInt8(),
    },
  },
};
