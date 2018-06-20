'use strict';

class MockBackingStore {
  constructor (methods) {
    this.methods = methods || {};
  }

  addDevice (deviceID, transportIdentifier, deliveryKey, callback) {
    const method = this.methods['addDevice'] || noop;
    method(deviceID, transportIdentifier, deliveryKey, callback);
  }

  fetchDevice (deviceID, callback) {
    const method = this.methods['fetchDevice'] || noop;
    method(deviceID, callback);
  }

  associateDevice (deviceID, userID, callback) {
    const method = this.methods['associateDevice'] || noop;
    method(deviceID, userID, callback);
  }

  dissociateDevice (deviceID, userID, callback) {
    const method = this.methods['dissociateDevice'] || noop;
    method(deviceID, userID, callback);
  }

  fetchDeviceIDsForUser (userID, callback) {
    const method = this.methods['fetchDeviceIDsForUser'] || noop;
    method(userID, callback);
  }

  createTransaction (eventID, deviceID, callback) {
    const method = this.methods['createTransaction'] || noop;
    method(eventID, deviceID, callback);
  }

  fetchTransactionsForEvent (eventID, callback) {
    const method = this.methods['fetchTransactionsForEvent'] || noop;
    method(eventID, callback);
  }
}

function noop () {}

module.exports = MockBackingStore;
