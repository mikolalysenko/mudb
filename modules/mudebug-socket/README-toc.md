# mudebug-socket
A wrapper of any `mudb` sockets simulating network conditions.

## usage

```js
// latency of ~250 ms
new MuDebugSocket({
    socket,
    latency: 250,
})

// jitter up to ~100 ms
new MuDebugSocket({
    socket,
    jitter: 100,
})

// ~10% package loss
new MuDebugSocket({
    socket,
    packageLoss: 10,
})
```

You can pass in any combinations of the above as you need.

## table of contents

## install ##

```
npm i mudebug-socket
```

## api ##

### class: MuDebugSocketServer ###

#### new MuDebugSocketServer(spec) ####
* `spec:object`
    * `socketServer:MuSocketServer`

### class: MuDebugSocket ###

#### new MuDebugSocket(spec) ####
* `spec:object`
    * `socket:MuSocket`
    * `latency?:number`
    * `jitter?:number`
    * `packageLoss?:number`

## TODO ##
* **tampered packets**
* low bandwidth
* slow open
* out-of-order packets
* duplicate packets
* throttling
