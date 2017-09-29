# testing notes

## generic testing procedure

* Construct client + server pair
* Log all events for all nodes in system
* Execute sequence of actions
* Check traces

## Behaviors to test

* Server closing socket
* Client closing socket
* Session id collision
* Unreliable message send
* Timeout
* Message delivery order
* ...?

Generic event log diffing

Write invariant on list of actions