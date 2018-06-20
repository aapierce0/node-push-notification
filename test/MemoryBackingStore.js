'use strict';
const Barrier = require('cb-barrier');
const Code = require('code');
const Lab = require('lab');
const MemoryBackingStore = require('../lib/MemoryBackingStore.js');

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
      const backingStore = new MemoryBackingStore();

      backingStore.addDevice('device1', 'com.example.test1', 'deliveryKey', (error) => {
        expect(error).to.not.exist();

        const device = backingStore.devices.get('device1');
        expect(device).to.exist();
        expect(device.transportIdentifier).to.equal('com.example.test1');
        expect(device.deliveryKey).to.equal('deliveryKey');
        barrier.pass();
      });

      return barrier;
    });
  });

  describe('fetchDevice()', function () {
    it('should return the device for a deviceid', function () {
      const barrier = new Barrier();
      const mockDevice = {
        transportIdentifier: 'com.example.test1',
        deliveryKey: 'deliveryKey'
      };
      const backingStore = new MemoryBackingStore();
      backingStore.devices.set('device1', mockDevice);

      backingStore.fetchDevice('device1', (error, device) => {
        expect(error).to.not.exist();

        expect(device).to.exist();
        expect(device.transportIdentifier).to.equal('com.example.test1');
        expect(device.deliveryKey).to.equal('deliveryKey');
        barrier.pass();
      });

      return barrier;
    });
  });

  describe('associateDevice()', function () {
    it('should associate the device with an existing user', function () {
      const barrier = new Barrier();
      const backingStore = new MemoryBackingStore();
      const mockDevice = {
        transportIdentifier: 'com.example.test1',
        deliveryKey: 'deliveryKey'
      };
      backingStore.devices.set('device1', mockDevice);

      const mockUser = {
        devices: new Set(['device1'])
      };
      backingStore.users.set('user1', mockUser);

      backingStore.associateDevice('device2', 'user1', (error) => {
        expect(error).to.not.exist();

        const user = backingStore.users.get('user1');
        expect(user).to.exist();
        expect(user.devices).to.be.an.instanceof(Set);
        expect(Array.from(user.devices)).to.only.include(['device1', 'device2']);
        barrier.pass();
      });
    });

    it('should associate the device with a new user', function () {
      const barrier = new Barrier();
      const backingStore = new MemoryBackingStore();

      backingStore.associateDevice('device1', 'user1', (error) => {
        expect(error).to.not.exist();

        const user = backingStore.users.get('user1');
        expect(user).to.exist();
        expect(user.devices).to.be.an.instanceof(Set);
        expect(Array.from(user.devices)).to.only.include('device1');
        barrier.pass();
      });

      return barrier;
    });
  });

  describe('dissociateDevice()', function () {
    it('should dissociate the device from an existing user', function () {
      const barrier = new Barrier();
      const backingStore = new MemoryBackingStore();
      const mockDevice = {
        transportIdentifier: 'com.example.test1',
        deliveryKey: 'deliveryKey'
      };
      backingStore.devices.set('device1', mockDevice);

      const mockUser = {
        devices: new Set(['device1'])
      };
      backingStore.users.set('user1', mockUser);

      backingStore.dissociateDevice('device1', 'user1', (error) => {
        expect(error).to.not.exist();

        const user = backingStore.users.get('user1');
        expect(user).to.exist();
        expect(user.devices).to.be.an.instanceof(Set);
        expect(Array.from(user.devices)).to.be.empty();
        barrier.pass();
      });

      return barrier;
    });

    it('should gracefully handle when the user doesn\'t exist', function () {
      const barrier = new Barrier();
      const backingStore = new MemoryBackingStore();

      backingStore.dissociateDevice('device1', 'user1', (error) => {
        expect(error).to.not.exist();
        barrier.pass();
      });

      return barrier;
    });
  });

  describe('fetchDeviceIDsForUser()', function () {
    it('should fetch all the devices for a user', function () {
      const barrier = new Barrier();
      const backingStore = new MemoryBackingStore();
      const mockDevice = {
        transportIdentifier: 'com.example.test1',
        deliveryKey: 'deliveryKey'
      };
      backingStore.devices.set('device1', mockDevice);

      const mockUser = {
        devices: new Set(['device1'])
      };
      backingStore.users.set('user1', mockUser);

      backingStore.fetchDeviceIDsForUser('user1', (error, deviceIDs) => {
        expect(error).to.not.exist();

        expect(deviceIDs).to.exist();
        expect(deviceIDs).to.be.an.instanceof(Set);
        expect(Array.from(deviceIDs)).to.only.include('device1');
        barrier.pass();
      });

      return barrier;
    });

    it('should provide no devices for an unknown user', function () {
      const barrier = new Barrier();
      const backingStore = new MemoryBackingStore();

      backingStore.fetchDeviceIDsForUser('user1', (error, deviceIDs) => {
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

      backingStore.createTransaction('event1', 'device1', (error, txID) => {
        expect(error).to.not.exist();
        expect(txID).to.be.a.string();

        const tx = backingStore.transactions.get(txID);
        expect(tx).to.exist();
        expect(tx.eventID).to.equal('event1');
        expect(tx.deviceID).to.equal('device1');
        barrier.pass();
      });

      return barrier;
    });
  });

  describe('transactionsForEvent()', function () {
    it('should find all the transactions for a specified event ID', function () {
      const barrier = new Barrier();
      const backingStore = new MemoryBackingStore();

      const mockTransaction1 = {
        eventID: 'event1',
        deviceID: 'device1'
      };
      backingStore.transactions.set('transaction1', mockTransaction1);

      const mockTransaction2 = {
        eventID: 'event2',
        deviceID: 'device1'
      };
      backingStore.transactions.set('transaction2', mockTransaction2);

      backingStore.fetchTransactionsForEvent('event1', (error, txIDs) => {
        expect(error).to.not.exist();

        expect(txIDs).to.be.an.instanceof(Set);
        expect(Array.from(txIDs)).to.only.include('transaction1');
        barrier.pass();
      });

      return barrier;
    });
  });
});
