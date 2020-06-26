# scheduler
for unifying the usage of schedulers to make it possible to inject mocks

## example

```ts
import { MuServer, MuClient } from 'mudb'
import { createLocalSocketServer, createLocalSocket } from 'mudb/socket/local'
import { MuMockScheduler } from 'mudb/scheduler/mock'

const mockScheduler = new MuMockScheduler()
const socketServer = createLocalSocketServer({
    scheduler: mockScheduler,
})
const server = new MuServer(socketServer)

const socket = createLocalSocket({
    sessionId: Math.random().toString(16).substring(2),
    server: socketServer,
    scheduler: mockScheduler,
})
const client = new MuClient(socket)

// trigger one scheduled event at a time in order
while (mockScheduler.poll()) { }
```

## API
* [`MuScheduler`](#muscheduler)
* [`MuSystemScheduler`](#musystemscheduler)
* [`MuMockScheduler`](#mumockscheduler)

### `MuScheduler`
the interface

#### methods

```ts
setTimeout(
    callback:(...args:any[]) => void,
    delay:number,
    ...args:any[],
) : any
```

```ts
clearTimeout(handle:any) : void;
```

```ts
setInterval(
    callback:(...args:any[]) => void,
    delay:number,
    ...args:any[],
) : any;
```

```ts
clearInterval(handle:any) : void;
```

```ts
requestAnimationFrame(callback:(time:number) => void) : number
```

```ts
cancelAnimationFrame(handle:number) : void
```

```ts
requestIdleCallback(
    callback:(deadline:{
        didTimeout:boolean;
        timeRemaining:() => number;
    }) => void,
    options?:{ timeout:number },
) : any
```

```ts
cancelIdleCallback(handle:any) : void
```

```ts
nextTick(callback:(...args:any[]) => void) : void
```
for `process.nextTick()`

```ts
now() : number
```
for `performance.now()`

---

### `MuSystemScheduler`
a singleton of type [`MuScheduler`](#muscheduler)

This is the default value of all the `scheduler` parameters.  It provides indirections to all the native schedulers, uses polyfills as necessary.

---

### `MuMockScheduler`
class `MuMockScheduler` implements [`MuScheduler`](#muscheduler)

```ts
import { MuMockScheduler } from 'mudb/scheduler/mock'

new MuMockScheduler()
```

It provides mocks to all the schedulers, which share the same event queue that can be polled, to give you some control over "the passage of time".

#### methods

```ts
poll() : boolean
```
returns false if the event queue is empty, otherwise pops one event and returns true
