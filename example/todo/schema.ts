import { MuRDAStruct, MuRDARegister, MuRDAConstant, MuRDAList } from 'mudb/rda';
import { MuBoolean, MuUTF8, MuDate } from 'mudb/schema';

export const TodoRDA = new MuRDAStruct({
    creation: new MuRDAConstant(new MuDate()),
    completed: new MuRDARegister(new MuBoolean(false)),
    title: new MuRDARegister(new MuUTF8('task')),
});

export const TodoListRDA = new MuRDAList(TodoRDA);
