# mudebug-socket
A wrapper of any `mudb` sockets and socket servers for simulating network conditions.

## usage

To simulate network conditions on the client side.

```js
// downstream latency of ~100 ms
new MuDebugSocket({
    socket, // a MuSocket
    inLatency: 100,
})

// downstream jitter up to 30 ms
new MuDebugSocket({
    socket,
    inJitter: 30,
})

// ~1% downstream packet loss
new MuDebugSocket({
    socket,
    inPacketLoss: 1,
})

// upstream latency of ~100 ms
new MuDebugSocket({
    socket,
    outLatency: 100,
})

// upstream jitter up to 30 ms
new MuDebugSocket({
    socket,
    outJitter: 30,
})

// ~1% upstream packet loss
new MuDebugSocket({
    socket,
    outPacketLoss: 1,
})
```

You can pass in any combinations of the above to simulate the condition that you need.  Also, you can simulate the same set of network conditions on the server side.

Unlike in other `mudb` socket modules, `MuDebugSocket` and `MuDebugServer` are designed to be **asymmetrical**, meaning you don't have to use both at the same time.

## table of contents

## install ##

```
npm i mudebug-socket
```

## api ##

### class: MuDebugServer ###

#### new MuDebugServer(spec) ####
* `spec:object`
    * `socketServer:MuSocketServer`
    * `inLatency?:number`
    * `inJitter?:number`
    * `inPacketLoss?:number`
    * `outLatency?:number`
    * `outJitter?:number`
    * `outPacketLoss?:number`

### class: MuDebugSocket ###

#### new MuDebugSocket(spec) ####
* `spec:object`
    * `socket:MuSocket`
    * `inLatency?:number`
    * `inJitter?:number`
    * `inPacketLoss?:number`
    * `outLatency?:number`
    * `outJitter?:number`
    * `outPacketLoss?:number`

## TODO ##
* **tampered packets**
* low bandwidth
* slow open
* out-of-order packets
* duplicate packets
* throttling

## credits
Copyright (c) 2018 He Diyi, Shenzhen Dianmao Technology Company Limited
