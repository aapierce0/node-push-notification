'use strict';
const Barrier = require('cb-barrier');
const Code = require('code');
const Lab = require('lab');
const MemoryBackingStore = require('../lib/MemoryBackingStore.js');
const preloadedBackingStore = require('./PreloadedMemoryBackingStore.js');

// Test shortcuts
const lab = exports.lab = Lab.script();
const { describe, it } = lab;
const { expect } = Code;

describe('MemoryBackingStore', function () {
  describe('constructor', function () {
    it('should instantiate a new MemoryBackingStore with empty properties', function () {
      const backingStore = new MemoryBackingStore();

      expect(backingStore.transactions).to.be.an.instanceof(Map);
      expect(backingStore.users).to.be.an.instanceof(Map);
      expect(backingStore.devices).to.be.an.instanceof(Map);
    });
  });

  describe('addDevice()', function () {
    it('should add a new device to the store', function () {
      const barrier = new Barrier();
      const backingStore = preloadedBackingStore.basic();

      // Make sure this device doesn't already exist
      expect(backingStore.devices.get('test_device1')).to.not.exist();

      // Add the new device
      backingStore.addDevice('test_device1', 'com.example.apns', 'test_deliveryKey', (error) => {
        expect(error).to.not.exist();

        const device = backingStore.devices.get('test_device1');
        expect(device).to.exist();
        expect(device.transportIdentifier).to.equal('com.example.apns');
        expect(device.deliveryKey).to.equal('test_deliveryKey');
        barrier.pass();
      });

      return barrier;
    });

    it('should overwrite an exisiting device if it\'s passed in', function () {
      const barrier = new Barrier();
      const backingStore = preloadedBackingStore.basic();

      // Make sure this device already exists
      expect(backingStore.devices.get('device1')).to.exist();

      // Overwrite the device
      backingStore.addDevice('device1', 'com.example.apns', 'test_deliveryKey', (error) => {
        expect(error).to.not.exist();

        const device = backingStore.devices.get('device1');
        expect(device).to.exist();
        expect(device.transportIdentifier).to.equal('com.example.apns');
        expect(device.deliveryKey).to.equal('test_deliveryKey');
        barrier.pass();
      });
    });
  });

  describe('fetchDevice()', function () {
    it('should return the device for a deviceid', function () {
      const barrier = new Barrier();
      const backingStore = preloadedBackingStore.basic();

      backingStore.fetchDevice('device1', (error, device) => {
        expect(error).to.not.exist();

        expect(device).to.exist();
        expect(device.transportIdentifier).to.equal('com.example.test1');
        expect(device.deliveryKey).to.equal('deliveryKey1');
        barrier.pass();
      });

      return barrier;
    });

    it('should generate an error for an unknown device', function () {
      const barrier = new Barrier();
      const backingStore = preloadedBackingStore.basic();

      // Make sure the device doesn't already exist.
      expect(backingStore.devices.get('some_unknown_device')).to.not.exist();

      // Attempt to fetch the device that doesn't exist.
      backingStore.fetchDevice('some_unknown_device', (error, device) => {
        expect(error).to.be.error(Error, 'Device some_unknown_device not found.');
        expect(device).to.not.exist();
        barrier.pass();
      });

      return barrier;
    });
  });


  describe('associateDevice()', function () {
    it('should associate the device with an existing user', function () {
      const barrier = new Barrier();
      const backingStore = preloadedBackingStore.basic();

      // Verify that 'user2' doesn't already have device 6 to avoid a false positive.
      const user = backingStore.users.get('user2');
      expect(Array.from(user.devices)).to.not.include('device6');

      // Associate device 6 (currently unassigned to anyone) to user2
      backingStore.associateDevice('device6', 'user2', (error) => {
        expect(error).to.not.exist();

        // Verify that the device was added
        const user = backingStore.users.get('user2');
        expect(Array.from(user.devices)).to.include('device6');
        barrier.pass();
      });
    });

    it('should associate the device with a new user', function () {
      const barrier = new Barrier();
      const backingStore = preloadedBackingStore.basic();

      // Verify that 'new_user' doesn't already exist
      expect(backingStore.users.get('new_user')).to.not.exist();

      // Associate the device
      backingStore.associateDevice('device6', 'new_user', (error) => {
        expect(error).to.not.exist();

        // Verify that the new user object was created and that the device is added to it.
        const user = backingStore.users.get('new_user');
        expect(user).to.exist();
        expect(user.devices).to.be.an.instanceof(Set);
        expect(Array.from(user.devices)).to.only.include('device6');
        barrier.pass();
      });

      return barrier;
    });
  });

  describe('dissociateDevice()', function () {
    it('should dissociate the device from an existing user', function () {
      const barrier = new Barrier();
      const backingStore = preloadedBackingStore.basic();

      // Verify that user2 exists, and that it owns 'device3'
      const user = backingStore.users.get('user2');
      expect(Array.from(user.devices)).to.include('device3');

      // Attempt to dissociate the device
      backingStore.dissociateDevice('device3', 'user2', (error) => {
        expect(error).to.not.exist();

        // Verify that the device was removed.
        const user = backingStore.users.get('user2');
        expect(user).to.exist();
        expect(user.devices).to.be.an.instanceof(Set);
        expect(Array.from(user.devices)).to.not.include('device3');
        barrier.pass();
      });

      return barrier;
    });

    it('should gracefully handle when the user doesn\'t exist', function () {
      const barrier = new Barrier();
      const backingStore = preloadedBackingStore.basic();

      // Verify that the user doesn't exist
      expect(backingStore.users.get('new_user')).to.not.exist();

      // Attempt to remove the device from the user
      backingStore.dissociateDevice('device1', 'new_user', (error) => {
        expect(error).to.not.exist();
        barrier.pass();
      });

      return barrier;
    });
  });

  describe('fetchDeviceIDsForUser()', function () {
    it('should fetch all the devices for a user', function () {
      const barrier = new Barrier();
      const backingStore = preloadedBackingStore.basic();

      backingStore.fetchDeviceIDsForUser('user2', (error, deviceIDs) => {
        expect(error).to.not.exist();

        expect(deviceIDs).to.exist();
        expect(deviceIDs).to.be.an.instanceof(Set);
        expect(Array.from(deviceIDs)).to.only.include(['device2', 'device3']);
        barrier.pass();
      });

      return barrier;
    });

    it('should provide no devices for an unknown user', function () {
      const barrier = new Barrier();
      const backingStore = new MemoryBackingStore();

      // Verify that the user indeed doesn't exist
      expect(backingStore.users.get('unknown_user')).to.not.exist();

      backingStore.fetchDeviceIDsForUser('unknown_user', (error, deviceIDs) => {
        expect(error).to.not.exist();

        expect(deviceIDs).to.exist();
        expect(deviceIDs).to.be.an.instanceof(Set);
        expect(Array.from(deviceIDs)).to.be.empty();
        barrier.pass();
      });

      return barrier;
    });
  });

  describe('createTransaction()', function () {
    it('should create a new transaction with the specified event ID and device ID', function () {
      const barrier = new Barrier();
      const backingStore = new MemoryBackingStore();

      backingStore.createTransaction('new_event', 'device1', (error, txID) => {
        expect(error).to.not.exist();
        expect(txID).to.be.a.string();

        const tx = backingStore.transactions.get(txID);
        expect(tx).to.exist();
        expect(tx.eventID).to.equal('new_event');
        expect(tx.deviceID).to.equal('device1');
        barrier.pass();
      });

      return barrier;
    });
  });

  describe('transactionsForEvent()', function () {
    it('should find all the transactions for a specified event ID', function () {
      const barrier = new Barrier();
      const backingStore = preloadedBackingStore.basic();

      backingStore.fetchTransactionsForEvent('event4', (error, txIDs) => {
        expect(error).to.not.exist();

        expect(txIDs).to.be.an.instanceof(Set);
        expect(Array.from(txIDs)).to.only.include(['tx5', 'tx6']);
        barrier.pass();
      });

      return barrier;
    });
  });
});
