# MuRDA: Replicated Data Actions

murda is another schema language built on top of muschema which allows for replicated data actions across user defined documents.

Specifically it is designed to support real time collaborative editing with optimistic execution and a localized undo buffer.

Performance is still a work-in-progress, and we may make optimizations to these data structures in the future.

The basic idea behind MuRDA is something like a mixture of CRDTs and operational transforms.  Unlike CRDTs, every operation in MuRDA is required to be invertible, and MuRDA operations are ultimately linearized on a single server.  Unlike operational transforms MuRDA doesn't try to implement 