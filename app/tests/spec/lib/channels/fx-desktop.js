/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';


define([
  'mocha',
  'chai',
  '/tests/mocks/window.js',
  '/tests/mocks/router.js',
  'lib/session',
  'lib/channels/fx-desktop'
],
function(mocha, chai, WindowMock, RouterMock, Session, FxDesktopChannel) {
  var assert = chai.assert;
  var channel;

  describe('lib/channel/fx-desktop', function() {
    var windowMock;
    var routerMock;

    function dispatchEvent(status, data) {
      windowMock.dispatchEvent({
        detail: {
          command: 'message',
          data: {
            status: status,
            data: data
          }
        },
      });
    }

    beforeEach(function() {
      routerMock = new RouterMock();
      windowMock = new WindowMock();

      channel = new FxDesktopChannel();
      channel.init({
        router: routerMock,
        window: windowMock,
        retryInterval: 10
      });
    });

    afterEach(function() {
      if (channel) channel.teardown();
    });

    describe('init', function() {
      it('sends the user to the settings page if signed in', function(done) {
        channel.on('session_status', function() {
          assert.equal(routerMock.page, 'settings');
          done();
        });

        dispatchEvent('session_status', {
          email: 'testuser@testuser.com'
        });
      });

      it('sends the user to the signup page if not signed in', function(done) {
        channel.on('session_status', function() {
          assert.equal(routerMock.page, 'signup');
          done();
        });

        // no data from session_status signifies no user is signed in.
        dispatchEvent('session_status');
      });
    });

    describe('send', function() {
      it('sends a message to the browser', function() {
        channel.send('test-command', { key: 'value' });
        assert.isTrue(windowMock.dispatchedEvents['test-command']);
      });

      it('retries sending until a response is received from the browser',
        function(done) {
        channel.send('wait-for-response', { key: 'value' }, function(err) {
          assert.isNull(err);
          done();
        });

        setTimeout(function() {
          // This is a bit of a hackity hack because we are not using
          // the real event system.
          dispatchEvent('wait-for-response');
        }, 50);
      });

      it('times out if browser does not respond', function(done) {
        channel.send('wait-for-response', { key: 'value' }, function(err) {
          assert.equal(String(err), 'Error: too many retries');

          done();
        });
      });
    });

    describe('on', function() {
      it('registers a callback to be called when the browser sends ' +
            'the registered message', function(done) {

        channel.on('call-the-callback', function(event) {
          done();
        });

        dispatchEvent('call-the-callback');
      });
    });
  });
});


