# MuRDA: Replicated Data Actions

MuRDA is another schema built on top of MuSchema which allows for replicated data actions across user defined documents.  It is designed to support real time collaborative editing with optimistic execution and a localized undo buffer.  It's still a work in progress so performance may not yet be optimal and APIs are all subject to change.  These modules are all designed to be used along side the MuReplica modules which implement a simple client-server protocol for synchronizing MuRDA instances.

## How it works

The basic idea in MuRDA is to turn all state transitions into a lattice of idempotent actions.  To apply an action, a client first executes it optimistically locally and sends it to the server.  The server then validates actions and broadcsts them to all clients in linearized order.  Once any pair of clients have seen the same sequence of actions from the server their states are eventually synchronized, even if they diverge temporarily. Undo and redo functions are also built into MuRDA.  These are implemented by storing a local undo buffer on each client.  A client may play back their undo buffer to rewind various local actions.

## Example usage

