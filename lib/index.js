'use strict';

class PushDispatch {
  constructor () {
    this.transports = new Map();
  }

  useTransport (transportIdentifier, transport) {
    // Ensure the transport identifier is valid.
    if (typeof transportIdentifier !== 'string') {
      throw new TypeError('transportIdentifier must be a string');
    }

    // Ensure the transport hasn't already been configured.
    if (this.transports.has(transportIdentifier)) {
      throw new Error(`transport ${transportIdentifier} is already configured`);
    }

    // Set the transport.
    this.transports.set(transportIdentifier, transport);
    return this;
  }

  send (transportIdentifier, device, message, options, callback) {
    const transport = this.transports.get(transportIdentifier);

    // Ensure the transport is available
    if (transport === undefined) {
      throw new Error(`cannot send to unsupported transport ${transportIdentifier}`);
    }

    // Handle a case where the options parameter is omitted
    if (typeof options === 'function') {
      callback = options;
      options = {};
    } else if (options === null || typeof options !== 'object') {
      options = {};
    }

    // Provide a default callback
    if (typeof callback !== 'function') {
      callback = noop;
    }

    // Send the message to the transport.
    transport.send(device, message, options, callback);
    return this;
  }
}

function noop () {}

module.exports = PushDispatch;
