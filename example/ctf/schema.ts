import {
  MuStruct,
  MuDictionary,
  MuUTF8,
  MuFloat64,
  MuInt8,
  MuArray,
} from 'mudb/schema';

function tuple<T extends any[]> (...args:T) : T {
  return args;
}

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
    player: new MuDictionary(PlayerSchema, Infinity),
    flag: new MuArray(FlagSchema, Infinity),
  }),
};

export const MsgSchema = {
  client: {
    score: new MuArray(new MuInt8(), Infinity),
    dead: new MuUTF8(),
  },
  server: {

  },
};

export const RpcSchema = {
  client: {
    joinTeam: tuple(new MuUTF8(), new MuInt8()),
  },
  server: {
    joinTeam: tuple(new MuUTF8(), new MuInt8()),
  },
};
