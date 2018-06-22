'use strict';

class MockBackingStore {
  constructor (methods) {
    this.methods = methods || {};
  }

  addDevice (deviceID, transportIdentifier, deliveryKey, callback) {
    const method = this.methods['addDevice'] || notImplemented;
    method(deviceID, transportIdentifier, deliveryKey, callback);
  }

  fetchDevice (deviceID, callback) {
    const method = this.methods['fetchDevice'] || notImplemented;
    method(deviceID, callback);
  }

  associateDevice (deviceID, userID, callback) {
    const method = this.methods['associateDevice'] || notImplemented;
    method(deviceID, userID, callback);
  }

  dissociateDevice (deviceID, userID, callback) {
    const method = this.methods['dissociateDevice'] || notImplemented;
    method(deviceID, userID, callback);
  }

  fetchDevicesForUser (userID, callback) {
    const method = this.methods['fetchDevicesForUser'] || notImplemented;
    method(userID, callback);
  }

  createTransaction (eventID, deviceID, callback) {
    const method = this.methods['createTransaction'] || notImplemented;
    method(eventID, deviceID, callback);
  }

  fetchTransactionsForEvent (eventID, callback) {
    const method = this.methods['fetchTransactionsForEvent'] || notImplemented;
    method(eventID, callback);
  }
}

function notImplemented () {
  throw new Error('Not implemented!');
}

module.exports = MockBackingStore;
