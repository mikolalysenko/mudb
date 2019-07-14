A minimal CLI chatroom as an example of defining protocols in `mudb` and using `mudb` net socket.

## Setup
If you haven't done this,
1. `npm i -g tsc`
2. `cd mudb/example`
3. `npm i && tsc`

## Run
1. `cd chatroom`
2. `node server.js`
3. open another terminal and cd into the chatroom directory
4. `node client.js`

You'll be prompted to enter your nickname.  After entering the chatroom, you can also change you nickname by entering `/nick newNick`.  If you feel lonely in the chatroom, repeat 3 & 4 however many times you like.
