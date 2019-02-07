/*
import {
  MuStruct,
  MuDictionary,
  MuString,
  MuFloat64,
  MuInt8,
  MuArray,
  MuBoolean,
} from 'muschema';
import { MuRPC } from 'murpc/rpc';

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
    score: new MuArray(new MuInt8()),
    dead: new MuString(),
  },
  server: {

  },
};

export const RpcSchema = {
  client: {
    joinTeam: MuRPC(new MuString(), new MuInt8()),
  },
  server: {
    joinTeam: MuRPC(new MuString(), new MuInt8()),
  },
};
*/