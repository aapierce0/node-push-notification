'use strict';

class MemoryBackingStore {
  constructor () {
    this.devices = new Map();
    this.users = new Map();
    this.transactions = new Map();
  }


  /** Store information about this device in memory */
  addDevice (deviceID, transportIdentifier, deliveryKey, callback) {
    const deviceDescriptor = {
      transportIdentifier: transportIdentifier,
      deliveryKey: deliveryKey
    };
    this.devices.set(deviceID, deviceDescriptor);
    callback();
  }

  /** Fetch a device from the store */
  fetchDevice (deviceID, callback) {
    const deviceDescriptor = this.devices.get(deviceID);
    if (deviceDescriptor) {
      deviceDescriptor.deviceID = deviceID;
      callback(null, deviceDescriptor);
    } else {
      callback(new Error(`Device ${deviceID} not found.`));
    }
  }


  /** Associate a deviceID with a user */
  associateDevice (deviceID, userID, callback) {
    // Create this user if it doesn't already exist.
    const user = this.users.get(userID) || {};
    const devices = user.devices || new Set();

    // Add the device to the set
    devices.add(deviceID);

    // Save the changes back to the user map
    user.devices = devices;
    this.users.set(userID, user);
    callback();
  }

  /** Disassociate a deviceID from a user */
  dissociateDevice (deviceID, userID, callback) {
    // Get the user object
    const user = this.users.get(userID) || {};
    const devices = user.devices || new Set();

    // Remove the device from the set
    devices.delete(deviceID);

    // Save the changes back to the user map
    user.devices = devices;
    this.users.set(userID, user);
    callback();
  }

  /** Fetch the set of device IDs currently associated with a user */
  fetchDevicesForUser (userID, callback) {
    // Get the devices from the user object
    const user = this.users.get(userID) || {};
    const deviceIDs = user.devices || new Set();

    const devices = Array.from(deviceIDs).map((deviceID) => {
      const device = this.devices.get(deviceID);
      device.deviceID = deviceID;
      return device;
    });

    callback(null, new Set(devices));
  }


  /** Creates a new transaction for this device and event ID, and returns the transaction ID */
  createTransaction (eventID, deviceID, callback) {
    // Generate a random transaction ID.
    // FIXME: This should really be a UUID. Preferably without a dependency.
    const txID = `${Array.from(this.transactions).length}`;
    const transaction = {
      eventID: eventID,
      deviceID: deviceID
    };

    // Set the transaction object
    this.transactions.set(txID, transaction);
    callback(null, txID);
  }

  /** Fetches the transactions for a given event ID */
  fetchTransactionsForEvent (eventID, callback) {
    const transactions = new Set();

    // Add each transaction ID that includes this event ID
    this.transactions.forEach((transaction, txID) => {
      if (transaction.eventID === eventID) {
        const device = this.devices.get(transaction.deviceID);
        device.deviceID = transaction.deviceID;

        transactions.add({
          transactionID: txID,
          eventID: transaction.eventID,
          device: device
        });
      }
    });

    callback(null, transactions);
  }
}

module.exports = MemoryBackingStore;
