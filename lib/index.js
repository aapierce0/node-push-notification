'use strict';

const MemoryBackingStore = require('./MemoryBackingStore.js');

class PushDispatch {
  constructor (backingStore) {
    // / The backing store is an object that provides access to underlying data structure.
    this.backingStore = backingStore || new MemoryBackingStore();

    // / The set of transports that are used by this PushDispatch system.
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

  dispatch (transportIdentifier, deviceDeliveryKey, message, options, callback) {
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
    transport.send(deviceDeliveryKey, message, options, callback);
    return this;
  }

  associateDevice (deviceID, userID, callback) {
    this.backingStore.associateDevice(deviceID, userID, callback);
  }

  dissociateDevice (deviceID, userID, callback) {
    this.backingStore.dissociateDevice(deviceID, userID, callback);
  }

  sendMessageToDevice (deviceID, eventID, message, options, callback) {
    this.backingStore.createTransaction(eventID, deviceID, (error, txID) => {
      if (error) {
        callback(error);
        return;
      }

      // Fetch the device from the data store
      this.backingStore.fetchDevice(deviceID, (error, device) => {
        if (error) {
          callback(error);
          return;
        }
        const deviceDeliveryKey = device.deliveryKey;
        const transportIdentifier = device.transportIdentifier;
        this.dispatch(transportIdentifier, deviceDeliveryKey, message, {}, callback);
      });
    });
  }

  sendMessageToUser (userID, eventID, message, options, callback) {
    this.backingStore.fetchDeviceIDsForUser(userID, (error, deviceIDs) => {
      if (error) {
        callback(error);
        return;
      }

      // Create a promise for each promise
      const sendMessagePromises = Array.from(deviceIDs).map((deviceID) => {
        return new Promise((resolve, reject) => {
          this.sendMessageToDevice(deviceID, eventID, message, options, (error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
      });

      // Only call the callback once all the promises have been fulfilled
      Promise.all(sendMessagePromises).then(() => {
        callback();
      }, (error) => {
        callback(error);
      });
    });
  }
}

function noop () {}

module.exports = PushDispatch;
