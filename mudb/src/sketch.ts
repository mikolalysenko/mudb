const myProtocol = {
    state: MyState,
    message: MyMessage,
    rpc: MyRPC
};

// how to compose multiple services?
//
// goals:
//      separation of concerns
//      reusability
//
//  example: clock synchronization module
//  example: chat
//  example: login
//

// maybe:
//  const service = client.service(name, protocol)
//  service.configure(...)
//
//  // etc.
//
//  client.start()
//

//
// host/server = collection of services
// each service gets a state feed + rpc
//