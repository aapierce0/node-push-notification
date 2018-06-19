'use strict';
const Barrier = require('cb-barrier');
const Code = require('code');
const Lab = require('lab');
const PushDispatch = require('../lib');

// Test shortcuts
const lab = exports.lab = Lab.script();
const { describe, it } = lab;
const { expect } = Code;


describe('PushDispatch', () => {
  describe('constructor', () => {
    it('instantiates a new NodePush', () => {
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

  describe('send()', () => {
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
      push.send('com.test.sns', 'mydeviceid', { title: 'hello' }, (err) => {
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
      push.send('com.test.sns', 'mydeviceid', { title: 'hello', body: 'world!' });

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
      push.send('com.test.sns', 'mydeviceid', { title: 'hello' }, null);

      return barrier;
    });

    it('throws if a transport does not exist for the platform', () => {
      const push = new PushDispatch();

      expect(() => {
        push.send('com.test.sns', 'mydeviceid', {});
      }).to.throw(Error, 'cannot send to unsupported transport com.test.sns');
    });
  });
});
