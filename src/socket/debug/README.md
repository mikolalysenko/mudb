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

   * [2 api](#section_2)
      * [2.1 class: MuDebugServer](#section_2.1)
         * [2.1.1 new MuDebugServer(spec)](#section_2.1.1)
      * [2.2 class: MuDebugSocket](#section_2.2)
         * [2.2.1 new MuDebugSocket(spec)](#section_2.2.1)
   * [3 TODO](#section_3)

## <a name="section_2"></a> 2 api

### <a name="section_2.1"></a> 2.1 class: MuDebugServer

#### <a name="section_2.1.1"></a> 2.1.1 new MuDebugServer(spec)
* `spec:object`
    * `socketServer:MuSocketServer`
    * `inLatency?:number`
    * `inJitter?:number`
    * `inPacketLoss?:number`
    * `outLatency?:number`
    * `outJitter?:number`
    * `outPacketLoss?:number`

### <a name="section_2.2"></a> 2.2 class: MuDebugSocket

#### <a name="section_2.2.1"></a> 2.2.1 new MuDebugSocket(spec)
* `spec:object`
    * `socket:MuSocket`
    * `inLatency?:number`
    * `inJitter?:number`
    * `inPacketLoss?:number`
    * `outLatency?:number`
    * `outJitter?:number`
    * `outPacketLoss?:number`

## <a name="section_3"></a> 3 TODO
* **tampered packets**
* low bandwidth
* slow open
* out-of-order packets
* duplicate packets
* throttling
