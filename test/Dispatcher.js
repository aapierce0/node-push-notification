'use strict';
const Barrier = require('cb-barrier');
const Code = require('code');
const Lab = require('lab');

const PushDispatch = require('../lib');
const MemoryBackingStore = PushDispatch.MemoryBackingStore;
const Dispatcher = PushDispatch.Dispatcher;

const MockBackingStore = require('./MockBackingStore.js');
const preloadedBackingStore = require('./PreloadedMemoryBackingStore.js');


// Test shortcuts
const lab = exports.lab = Lab.script();
const { describe, it } = lab;
const { expect } = Code;


describe('Dispatcher', () => {
  describe('constructor', () => {
    it('instantiates a new PushDispatch', () => {
      const push = new Dispatcher(new MemoryBackingStore());

      expect(push.transports).to.be.an.instanceof(Map);
    });
  });

  describe('_validateBackingStore()', function () {
    function dummyBackingStore () {
      return {
        addDevice () {},
        fetchDevice () {},
        associateDevice () {},
        dissociateDevice () {},
        fetchDevicesForUser () {},
        createTransaction () {},
        fetchTransactionsForEvent () {}
      };
    }


    it('throws an error if the backing store is not an object', function () {
      expect(() => {
        Dispatcher._validateBackingStore();
      }).to.throw(Error, 'Backing store must be an object');
    });

    it('throws an error if the backing store doesn\'t have an addDevice method', function () {
      expect(() => {
        const backingStore = dummyBackingStore();
        delete backingStore['addDevice'];
        Dispatcher._validateBackingStore(backingStore);
      }).to.throw(Error, 'Backing store must have an addDevice method');
    });

    it('throws an error if the backing store doesn\'t have a fetchDevice method', function () {
      expect(() => {
        const backingStore = dummyBackingStore();
        delete backingStore['fetchDevice'];
        Dispatcher._validateBackingStore(backingStore);
      }).to.throw(Error, 'Backing store must have a fetchDevice method');
    });

    it('throws an error if the backing store doesn\'t have an associateDevice method', function () {
      expect(() => {
        const backingStore = dummyBackingStore();
        delete backingStore['associateDevice'];
        Dispatcher._validateBackingStore(backingStore);
      }).to.throw(Error, 'Backing store must have an associateDevice method');
    });

    it('throws an error if the backing store doesn\'t have a dissociateDevice method', function () {
      expect(() => {
        const backingStore = dummyBackingStore();
        delete backingStore['dissociateDevice'];
        Dispatcher._validateBackingStore(backingStore);
      }).to.throw(Error, 'Backing store must have a dissociateDevice method');
    });

    it('throws an error if the backing store doesn\'t have a fetchDevicesForUser method', function () {
      expect(() => {
        const backingStore = dummyBackingStore();
        delete backingStore['fetchDevicesForUser'];
        Dispatcher._validateBackingStore(backingStore);
      }).to.throw(Error, 'Backing store must have a fetchDevicesForUser method');
    });

    it('throws an error if the backing store doesn\'t have a createTransaction method', function () {
      expect(() => {
        const backingStore = dummyBackingStore();
        delete backingStore['createTransaction'];
        Dispatcher._validateBackingStore(backingStore);
      }).to.throw(Error, 'Backing store must have a createTransaction method');
    });

    it('throws an error if the backing store doesn\'t have a fetchTransactionsForEvent method', function () {
      expect(() => {
        const backingStore = dummyBackingStore();
        delete backingStore['fetchTransactionsForEvent'];
        Dispatcher._validateBackingStore(backingStore);
      }).to.throw(Error, 'Backing store must have a fetchTransactionsForEvent method');
    });
  });

  describe('useTransport()', () => {
    it('supports multiple transports', () => {
      const push = new Dispatcher(new MemoryBackingStore());

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
      const push = new Dispatcher(new MemoryBackingStore());

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
      const push = new Dispatcher(new MemoryBackingStore());

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
      const push = new Dispatcher(new MemoryBackingStore());

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
      const push = new Dispatcher(new MemoryBackingStore());

      expect(() => {
        push.dispatch('com.test.sns', 'mydeviceid', {});
      }).to.throw(Error, 'cannot send to unsupported transport com.test.sns');
    });
  });

  describe('addDevice()', function () {
    it('should add a new device to the backing store', function () {
      const barrier = new Barrier();
      const backingStore = new MockBackingStore({
        'addDevice': (deviceID, transportIdentifier, deliveryKey, callback) => {
          expect(deviceID).to.equal('device1');
          expect(transportIdentifier).to.equal('com.example.test1');
          expect(deliveryKey).to.equal('deliveryKey1');
          barrier.pass();
          callback();
        }
      });
      const push = new Dispatcher(backingStore);

      // Add the new device
      push.addDevice('device1', 'com.example.test1', 'deliveryKey1', (error) => {
        expect(error).to.not.exist();
      });

      return barrier;
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

      const push = new Dispatcher(mockBackingStore);
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

      const push = new Dispatcher(mockBackingStore);
      push.dissociateDevice('device1', 'user1', () => {});

      return barrier;
    });
  });


  describe('sendMessageToDeviceID()', function () {
    it('should generate an event to the proper service', function () {
      const barrier = new Barrier(2);
      const backingStore = preloadedBackingStore.basic();
      const push = new Dispatcher(backingStore);

      push.useTransport('com.example.test1', {
        send (device, message, options, callback) {
          expect(device).to.equal('deliveryKey1');
          expect(message).to.equal({ title: 'hello' });
          expect(options).to.equal({});
          callback();
          barrier.pass();
        }
      });

      push.sendMessageToDeviceID('device1', 'new_event', {title: 'hello'}, {}, (error) => {
        expect(error).to.not.exist();

        const transactions = Array.from(backingStore.transactions.values());
        expect(transactions).to.include({
          eventID: 'new_event',
          deviceID: 'device1'
        });

        barrier.pass();
      });

      return barrier;
    });


    it('reports an error from create transaction', function () {
      const barrier = new Barrier();
      const backingStore = new MockBackingStore({
        fetchDevice (deviceID, callback) {
          callback(null, {
            deviceID: 'device1',
            transportIdentifier: 'com.example.test1',
            deliveryKey: 'deliveryKey1'
          });
        },
        createTransaction (eventID, deviceID, callback) {
          callback(new Error('An error occurred when creating a transaction!'));
        }
      });

      const push = new Dispatcher(backingStore);
      push.sendMessageToDeviceID('device1', 'event1', {title: 'hello'}, {}, (error) => {
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

      const push = new Dispatcher(backingStore);
      push.sendMessageToDeviceID('device1', 'event1', {title: 'hello'}, {}, (error) => {
        expect(error).to.exist();
        expect(error).to.be.error(Error, 'An error occurred fetching the device!');
        barrier.pass();
      });

      return barrier;
    });
  });

  describe('sendMessageToUser()', function () {
    it('should dispatch the message to all of a user\'s devices on the same transport', function () {
      const barrier = new Barrier(3);
      const backingStore = preloadedBackingStore.basic();
      const push = new Dispatcher(backingStore);

      push.useTransport('com.example.test2', {
        send (device, message, options, callback) {
          expect(message).to.equal({ title: 'hello' });
          expect(options).to.equal({});

          // Pass once for each delivery key
          if (device === 'deliveryKey4') {
            barrier.pass();
          }
          if (device === 'deliveryKey5') {
            barrier.pass();
          }

          callback();
        }
      });

      push.sendMessageToUser('user3', 'new_event', {title: 'hello'}, {}, (error) => {
        expect(error).to.not.exist();

        const transactions = Array.from(backingStore.transactions.values());
        expect(transactions).to.include([
          {
            eventID: 'new_event',
            deviceID: 'device4'
          },
          {
            eventID: 'new_event',
            deviceID: 'device5'
          }
        ]);
        barrier.pass();
      });

      return barrier;
    });

    it('should dispatch the message to all of a user\'s devices on differing transports', function () {
      const barrier = new Barrier(3);
      const backingStore = preloadedBackingStore.basic();
      const push = new Dispatcher(backingStore);

      push.useTransport('com.example.test1', {
        send (device, message, options, callback) {
          expect(message).to.equal({ title: 'hello' });
          expect(options).to.equal({});
          expect(device).to.equal('deliveryKey2');
          barrier.pass();
          callback();
        }
      });

      push.useTransport('com.example.test2', {
        send (device, message, options, callback) {
          expect(message).to.equal({ title: 'hello' });
          expect(options).to.equal({});
          expect(device).to.equal('deliveryKey3');
          barrier.pass();
          callback();
        }
      });

      push.sendMessageToUser('user2', 'new_event', {title: 'hello'}, {}, (error) => {
        expect(error).to.not.exist();

        const transactions = Array.from(backingStore.transactions.values());
        expect(transactions).to.include([
          {
            eventID: 'new_event',
            deviceID: 'device2'
          },
          {
            eventID: 'new_event',
            deviceID: 'device3'
          }
        ]);
        barrier.pass();
      });

      return barrier;
    });

    it('should properly handle an error when fetching device IDs', function () {
      const barrier = new Barrier();
      const backingStore = new MockBackingStore({
        fetchDevicesForUser (userID, callback) {
          callback(new Error('An error occurred fetching devices!'));
        }
      });

      const push = new Dispatcher(backingStore);
      push.sendMessageToUser('user1', 'event1', {title: 'hello'}, {}, (error) => {
        expect(error).to.be.error(Error, 'An error occurred fetching devices!');
        barrier.pass();
      });

      return barrier;
    });

    it('should properly handle an error generated by the service', function () {
      const barrier = new Barrier();
      const backingStore = preloadedBackingStore.basic();
      const push = new Dispatcher(backingStore);

      push.useTransport('com.example.test2', {
        send (device, message, options, callback) {
          callback(new Error('An error occurred sending the message!'));
        }
      });

      push.sendMessageToUser('user3', 'new_event', {title: 'hello'}, {}, (error) => {
        expect(error).to.be.error(Error, 'An error occurred sending the message!');
        barrier.pass();
      });

      return barrier;
    });
  });
});

