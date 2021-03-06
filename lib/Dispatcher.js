'use strict';

class Dispatcher {
  constructor (backingStore) {
    // Make sure the backing store conforms to the spec.
    Dispatcher._validateBackingStore(backingStore);

    // The backing store is an object that provides access to underlying data structure.
    this.backingStore = backingStore;

    // The set of transports that are used by this PushDispatch system.
    this.transports = new Map();
  }

  /** Throws an error if the provided backing store doesn't meet the requirements */
  static _validateBackingStore (backingStore) {
    if (typeof backingStore !== 'object') {
      throw new Error('Backing store must be an object');
    }

    if (typeof backingStore.addDevice !== 'function') {
      throw new Error('Backing store must have an addDevice method');
    }

    if (typeof backingStore.fetchDevice !== 'function') {
      throw new Error('Backing store must have a fetchDevice method');
    }

    if (typeof backingStore.associateDevice !== 'function') {
      throw new Error('Backing store must have an associateDevice method');
    }

    if (typeof backingStore.dissociateDevice !== 'function') {
      throw new Error('Backing store must have a dissociateDevice method');
    }

    if (typeof backingStore.fetchDevicesForUser !== 'function') {
      throw new Error('Backing store must have a fetchDevicesForUser method');
    }

    if (typeof backingStore.createTransaction !== 'function') {
      throw new Error('Backing store must have a createTransaction method');
    }

    if (typeof backingStore.fetchTransactionsForEvent !== 'function') {
      throw new Error('Backing store must have a fetchTransactionsForEvent method');
    }
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

  dispatch (eventID, transactionID, transportIdentifier, deviceDeliveryKey, message, options, callback) {
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

    const transport = this.transports.get(transportIdentifier);

    // Ensure the transport is available
    if (transport === undefined) {
      callback(new Error(`cannot send to unsupported transport ${transportIdentifier}`));
      return;
    }

    // Send the message to the transport.
    transport.send(eventID, transactionID, deviceDeliveryKey, message, options, callback);
    return this;
  }

  addDevice (deviceID, transportIdentifier, deliveryKey, callback) {
    this.backingStore.addDevice(deviceID, transportIdentifier, deliveryKey, callback);
  }

  associateDevice (deviceID, userID, callback) {
    this.backingStore.associateDevice(deviceID, userID, callback);
  }

  dissociateDevice (deviceID, userID, callback) {
    this.backingStore.dissociateDevice(deviceID, userID, callback);
  }

  sendMessageToDevice (device, eventID, message, options, callback) {
    const deviceID = device.deviceID;
    const deviceDeliveryKey = device.deliveryKey;
    const transportIdentifier = device.transportIdentifier;

    this.backingStore.createTransaction(eventID, deviceID, (error, txID) => {
      if (error) {
        callback(error);
        return;
      }

      this.dispatch(eventID, txID, transportIdentifier, deviceDeliveryKey, message, {}, callback);
    });
  }

  sendMessageToDeviceID (deviceID, eventID, message, options, callback) {
    // Fetch the device from the data store
    this.backingStore.fetchDevice(deviceID, (error, device) => {
      if (error) {
        callback(error);
        return;
      }

      this.sendMessageToDevice(device, eventID, message, options, callback);
    });
  }

  sendMessageToUser (userID, eventID, message, options, callback) {
    this.backingStore.fetchDevicesForUser(userID, (error, devices) => {
      if (error) {
        callback(error);
        return;
      }

      const sendMessagePromises = Array.from(devices).map((device) => {
        return new Promise((resolve, reject) => {
          this.sendMessageToDevice(device, eventID, message, options, (error) => {
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

module.exports = Dispatcher;
