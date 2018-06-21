'use strict';

const MemoryBackingStore = require('../lib/MemoryBackingStore.js');

function basic () {
  const memoryBackingStore = new MemoryBackingStore();

  // Devices 1-2 belong to the "com.example.test1" transport.
  memoryBackingStore.devices.set('device1', {
    transportIdentifier: 'com.example.test1',
    deliveryKey: 'deliveryKey1'
  });

  memoryBackingStore.devices.set('device2', {
    transportIdentifier: 'com.example.test1',
    deliveryKey: 'deliveryKey2'
  });

  // Devices 3-5 belong to the "com.example.test2" transport.
  memoryBackingStore.devices.set('device3', {
    transportIdentifier: 'com.example.test2',
    deliveryKey: 'deliveryKey3'
  });

  memoryBackingStore.devices.set('device4', {
    transportIdentifier: 'com.example.test2',
    deliveryKey: 'deliveryKey4'
  });

  memoryBackingStore.devices.set('device5', {
    transportIdentifier: 'com.example.test2',
    deliveryKey: 'deliveryKey5'
  });

  // Device 6 belongs to "com.example.test1", and isn't immediately assigned to a user.
  memoryBackingStore.devices.set('device6', {
    transportIdentifier: 'com.example.test1',
    deliveryKey: 'deliveryKey6'
  });


  // User 1 has a single device
  memoryBackingStore.users.set('user1', {
    devices: new Set(['device1'])
  });

  // User 2 has one device on each platform
  memoryBackingStore.users.set('user2', {
    devices: new Set(['device2', 'device3'])
  });

  // User 3 has two devices on the same platform.
  memoryBackingStore.users.set('user3', {
    devices: new Set(['device4', 'device5'])
  });


  // Create some transactions
  // Event 1 was sent to a single device
  memoryBackingStore.transactions.set('tx1', {
    eventID: 'event1',
    deviceID: 'device1'
  });


  // Event 2 was sent to user2's two devices
  memoryBackingStore.transactions.set('tx2', {
    eventID: 'event2',
    deviceID: 'device2'
  });

  memoryBackingStore.transactions.set('tx3', {
    eventID: 'event2',
    deviceID: 'device3'
  });

  // Event 3 was sent to user3's device, before their second device was associated
  memoryBackingStore.transactions.set('tx4', {
    eventID: 'event3',
    deviceID: 'device4'
  });

  // Event 4 was sent to user2 again.
  memoryBackingStore.transactions.set('tx5', {
    eventID: 'event4',
    deviceID: 'device2'
  });

  memoryBackingStore.transactions.set('tx6', {
    eventID: 'event4',
    deviceID: 'device3'
  });

  // User associates device 5, and gets another event
  memoryBackingStore.transactions.set('tx7', {
    eventID: 'event5',
    deviceID: 'device4'
  });

  memoryBackingStore.transactions.set('tx8', {
    eventID: 'event5',
    deviceID: 'device5'
  });

  return memoryBackingStore;
}

module.exports = {
  basic: basic
};
