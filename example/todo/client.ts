/*
import { MuClient } from 'mudb/client';
import { MuReplicaClient } from 'mudb/replica/client';
import { TodoRDA, TodoListRDA } from './schema';
import { MuUUID } from '../../rda';

enum AppState {
    CONNECTING,
    READY,
    CLOSED,
}

export = function (client:MuClient) {
    const model = {
        appState: AppState.CONNECTING,
        state: TodoListRDA.stateSchema.clone(TodoListRDA.stateSchema.identity),
    };

    const replica = new MuReplicaClient({
        client,
        rda: TodoListRDA,
    });
    replica.configure({
        ready: () => {
            model.appState = AppState.READY;
            render();
        },
        change: () => {
            model.state = replica.state(model.state);
            render();
        },
        close: () => {
            model.appState = AppState.CLOSED;
            render();
        },
    });

    const actions = {
        create: (title:string) => {
            replica.dispatch(
                TodoListRDA.actions.create({
                    creation: new Date(),
                    completed: false,
                    title,
                }));
        },
        setCompleted: (id:MuUUID, completed:boolean) => {
            replica.dispatch(
                TodoListRDA.actions.update(
                    id,
                    TodoRDA.actions.completed.set(completed)));
        },
        rename: (id:MuUUID, title:string) => {
            replica.dispatch(
                TodoListRDA.actions.update(
                    id,
                    TodoRDA.actions.title.set(title)));
        },
        destroy: (id:MuUUID) => {
            replica.dispatch(
                TodoListRDA.actions.destroy(id));
        },
        undo: () => {
            replica.dispatchUndo();
        },
    };

    function render () {
        // TODO
    }

    render();
};
*/