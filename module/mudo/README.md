# mudo
Local development server for mudb.  Makes it easy to start mudb client/server pairs using some opinionated conventions.

# install

```
npm i mudo
```

# example usage
To run `mudo`, execute the following command:

```sh
mudo --client myclient.js --server myserver.js --open
```

Where `myclient.js` and `myserver.js` are implemented as follows:

**myclient.js**

```javascript
module.exports = function (muClient) {
    // client implementation ...

    muClient.start();
}
```

**myserver.js**
```javascript
module.exports = function (muServer) {
    // server implementation ...

    muServer.start();
}
```

By default `mudo` uses `mulocal-socket` to connect the client and server instances locally.  Multiplayer games over `muweb-socket` can be run by passing the `--socket websocket` option to mudo.

# cli

## options

### `client`
Path to the client script.  Defaults to `client.js`

### `server`
Path to the server script.  Defaults to `server.js`

### `socket`
Socket type to use.  Possible options:

* `local`: uses `mulocal-socket`  (default)
* `websocket`: uses `muweb-socket`

### `open`
Opens a browser window with the socket server contents listed

# api

**TODO**

# credits
Copyright (c) 2017 Mikola Lysenko, Shenzhen Dianmao Technology Company Limited


