'use strict';
const Barrier = require('cb-barrier');
const Code = require('code');
const Lab = require('lab');

const PushDispatch = require('../lib');
const MemoryBackingStore = require('../lib/MemoryBackingStore.js');

const MockBackingStore = require('./MockBackingStore.js');

// Test shortcuts
const lab = exports.lab = Lab.script();
const { describe, it } = lab;
const { expect } = Code;


describe('PushDispatch', () => {
  describe('constructor', () => {
    it('instantiates a new PushDispatch', () => {
      const push = new PushDispatch();

      expect(push.transports).to.be.an.instanceof(Map);
    });
  });

  describe('useTransport()', () => {
    it('supports multiple transports', () => {
      const push = new PushDispatch();

      const t1 = {platform: 'APNS'};
      push.useTransport('com.example.apns', t1);

      const t2 = {platform: 'Firebase'};
      push.useTransport('com.example.firebase', t2);

      expect(push.transports.size).to.equal(2);

      // Verify that platforms are case insensitive.
      expect(push.transports.get('com.example.apns')).to.equal(t1);
      expect(push.transports.get('com.example.firebase')).to.equal(t2);

      // Verify that existing transports are not overwritten.
      expect(() => {
        push.useTransport('com.example.apns', {platform: 'Apple'});
      }).to.throw(Error, 'transport com.example.apns is already configured');

      // Verify that the platform name must be a string.
      expect(() => {
        push.useTransport(null, {platform: 'Email'});
      }).to.throw(TypeError, 'transportIdentifier must be a string');
    });
  });

  describe('dispatch()', () => {
    it('calls the transport\'s send() method', () => {
      const barrier = new Barrier();
      const push = new PushDispatch();

      push.useTransport('com.test.sns', {
        send (device, message, options, callback) {
          expect(device).to.equal('mydeviceid');
          expect(message).to.equal({ title: 'hello' });
          expect(options).to.equal({});
          callback();
        }
      });
      push.dispatch('com.test.sns', 'mydeviceid', { title: 'hello' }, (err) => {
        expect(err).to.not.exist();
        barrier.pass();
      });

      return barrier;
    });

    it('callback is a noop if one is not provided', () => {
      const barrier = new Barrier();
      const push = new PushDispatch();

      push.useTransport('com.test.sns', {
        send (device, message, options, callback) {
          expect(device).to.equal('mydeviceid');
          expect(message).to.equal({ title: 'hello', body: 'world!' });
          expect(options).to.equal({});
          expect(callback.name).to.equal('noop');
          callback();
          barrier.pass();
        }
      });
      push.dispatch('com.test.sns', 'mydeviceid', { title: 'hello', body: 'world!' });

      return barrier;
    });

    it('the options argument is forced to an empty object', () => {
      const barrier = new Barrier();
      const push = new PushDispatch();

      push.useTransport('com.test.sns', {
        send (device, message, options, callback) {
          expect(device).to.equal('mydeviceid');
          expect(message).to.equal({ title: 'hello' });
          expect(options).to.equal({});
          callback();
          barrier.pass();
        }
      });
      push.dispatch('com.test.sns', 'mydeviceid', { title: 'hello' }, null);

      return barrier;
    });

    it('throws if a transport does not exist for the platform', () => {
      const push = new PushDispatch();

      expect(() => {
        push.dispatch('com.test.sns', 'mydeviceid', {});
      }).to.throw(Error, 'cannot send to unsupported transport com.test.sns');
    });
  });

  describe('associateDevice()', function () {
    it('should call the backing store to associate the device', function () {
      const barrier = new Barrier();
      const mockBackingStore = new MockBackingStore({
        'associateDevice': (deviceID, userID, callback) => {
          expect(deviceID).to.equal('device1');
          expect(userID).to.equal('user1');
          expect(callback).to.be.a.function();
          barrier.pass();
        }
      });

      const push = new PushDispatch(mockBackingStore);
      push.associateDevice('device1', 'user1', () => {});

      return barrier;
    });
  });

  describe('associateDevice()', function () {
    it('should call the backing store to dissociate the device', function () {
      const barrier = new Barrier();
      const mockBackingStore = new MockBackingStore({
        'dissociateDevice': (deviceID, userID, callback) => {
          expect(deviceID).to.equal('device1');
          expect(userID).to.equal('user1');
          expect(callback).to.be.a.function();
          barrier.pass();
        }
      });

      const push = new PushDispatch(mockBackingStore);
      push.dissociateDevice('device1', 'user1', () => {});

      return barrier;
    });
  });


  describe('sendMessageToDevice()', function () {
    it('should generate an event to the proper service', function () {
      const barrier = new Barrier(2);
      const backingStore = new MemoryBackingStore();
      backingStore.devices.set('device1', {
        transportIdentifier: 'com.example.test1',
        deliveryKey: 'deliveryKey'
      });
      const push = new PushDispatch(backingStore);

      push.useTransport('com.example.test1', {
        send (device, message, options, callback) {
          expect(device).to.equal('deliveryKey');
          expect(message).to.equal({ title: 'hello' });
          expect(options).to.equal({});
          callback();
          barrier.pass();
        }
      });

      push.sendMessageToDevice('device1', 'event1', {title: 'hello'}, {}, (error) => {
        expect(error).to.not.exist();

        const transactions = Array.from(backingStore.transactions.values());
        expect(transactions).to.only.include({
          eventID: 'event1',
          deviceID: 'device1'
        });

        barrier.pass();
      });

      return barrier;
    });


    it('reports an error from create transaction', function () {
      const barrier = new Barrier();
      const backingStore = new MockBackingStore({
        createTransaction (eventID, deviceID, callback) {
          callback(new Error('An error occurred when creating a transaction!'));
        }
      });

      const push = new PushDispatch(backingStore);
      push.sendMessageToDevice('device1', 'event1', {title: 'hello'}, {}, (error) => {
        expect(error).to.exist();
        expect(error).to.be.error(Error, 'An error occurred when creating a transaction!');
        barrier.pass();
      });

      return barrier;
    });

    it('reports an error from fetch device', function () {
      const barrier = new Barrier();
      const backingStore = new MockBackingStore({
        createTransaction (eventID, deviceID, callback) {
          callback(null, 'some_transaction_id');
        },
        fetchDevice (deviceID, callback) {
          callback(new Error('An error occurred fetching the device!'));
        }
      });

      const push = new PushDispatch(backingStore);
      push.sendMessageToDevice('device1', 'event1', {title: 'hello'}, {}, (error) => {
        expect(error).to.exist();
        expect(error).to.be.error(Error, 'An error occurred fetching the device!');
        barrier.pass();
      });

      return barrier;
    });
  });

  describe('sendMessageToUser()', function () {
    it('should send the message to all of a user\'s devices', function () {
      const barrier = new Barrier(3);
      const backingStore = new MemoryBackingStore();
      backingStore.devices.set('device1', {
        transportIdentifier: 'com.example.test1',
        deliveryKey: 'deliveryKey1'
      });

      backingStore.devices.set('device2', {
        transportIdentifier: 'com.example.test1',
        deliveryKey: 'deliveryKey2'
      });

      backingStore.users.set('user1', {
        devices: new Set(['device1', 'device2'])
      });

      const push = new PushDispatch(backingStore);
      push.useTransport('com.example.test1', {
        send (device, message, options, callback) {
          expect(message).to.equal({ title: 'hello' });
          expect(options).to.equal({});

          // Pass once for each delivery key
          if (device === 'deliveryKey1') {
            barrier.pass();
          }
          if (device === 'deliveryKey2') {
            barrier.pass();
          }

          callback();
        }
      });

      push.sendMessageToUser('user1', 'event1', {title: 'hello'}, {}, (error) => {
        expect(error).to.not.exist();

        const transactions = Array.from(backingStore.transactions.values());
        expect(transactions).to.only.include([
          {
            eventID: 'event1',
            deviceID: 'device1'
          },
          {
            eventID: 'event1',
            deviceID: 'device2'
          }
        ]);
        barrier.pass();
      });

      return barrier;
    });

    it('should properly handle an error when fetching device IDs', function () {
      const barrier = new Barrier();
      const backingStore = new MockBackingStore({
        fetchDeviceIDsForUser (userID, callback) {
          callback(new Error('An error occurred fetching device IDs!'));
        }
      });

      const push = new PushDispatch(backingStore);
      push.sendMessageToUser('user1', 'event1', {title: 'hello'}, {}, (error) => {
        expect(error).to.be.error(Error, 'An error occurred fetching device IDs!');
        barrier.pass();
      });

      return barrier;
    });

    it('should properly handle an error generated by the service', function () {
      const barrier = new Barrier();
      const backingStore = new MemoryBackingStore();
      backingStore.devices.set('device1', {
        transportIdentifier: 'com.example.test1',
        deliveryKey: 'deliveryKey1'
      });

      backingStore.devices.set('device2', {
        transportIdentifier: 'com.example.test1',
        deliveryKey: 'deliveryKey2'
      });

      backingStore.users.set('user1', {
        devices: new Set(['device1', 'device2'])
      });

      const push = new PushDispatch(backingStore);
      push.useTransport('com.example.test1', {
        send (device, message, options, callback) {
          callback(new Error('An error occurred sending the message!'));
        }
      });

      push.sendMessageToUser('user1', 'event1', {title: 'hello'}, {}, (error) => {
        expect(error).to.be.error(Error, 'An error occurred sending the message!');
        barrier.pass();
      });

      return barrier;
    });
  });
});

