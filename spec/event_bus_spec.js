/**
 Copyright (c) 2012 aixigo AG <info@aixigo.de>
 All rights reserved.

 Permission is hereby granted, free of charge, to any person obtaining a copy of
 this software and associated documentation files (the 'Software'), to deal in
 the Software without restriction, including without limitation the rights to
 use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 the Software, and to permit persons to whom the Software is furnished to do so,
 subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
define( [
   'lib/event_bus/event_bus',
   'lib/portal_mocks/portal_mocks'
], function( eventBusModule, portalMocks ) {
   'use strict';

   var Q;
   var nextTick;
   var eventBus;

   beforeEach( function() {
      jasmine.Clock.useMock();

      Q = portalMocks.mockQ();
      nextTick = portalMocks.mockTick();

      eventBusModule.init( Q, nextTick );
      eventBus = eventBusModule.create();
   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'An EventBus instance', function() {

      var mySpy;

      beforeEach( function() {
         mySpy = jasmine.createSpy();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'calls a directly matching subscriber not during the current runloop', function() {
         eventBus.subscribe( 'message.subject', mySpy );
         eventBus.publish( 'message.subject' );

         expect( mySpy ).not.toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'eventually calls a directly matching subscriber', function() {
         eventBus.subscribe( 'message.subject', mySpy );
         eventBus.publish( 'message.subject' );

         jasmine.Clock.tick( 1 );

         expect( mySpy ).toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'never calls a subscriber that does not match', function() {
         eventBus.subscribe( 'message.other_subject', mySpy );
         eventBus.publish( 'message.subject' );

         jasmine.Clock.tick( 1 );

         expect( mySpy ).not.toHaveBeenCalled();
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'Errors when calling subscribers', function() {

      var errorHandlerSpy;

      beforeEach( function() {
         errorHandlerSpy = jasmine.createSpy( 'errorHandler' );
         eventBus.setErrorHandler( errorHandlerSpy );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'can be handled by a custom error handler', function() {
         eventBus.subscribe( 'myEvent', function() {
            throw new Error( 'this is an error' );
         } );
         eventBus.publish( 'myEvent' );

         jasmine.Clock.tick( 1 );

         expect( errorHandlerSpy ).toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'don\'t prevent other subscribers from being called', function() {

         eventBus.subscribe( 'myEvent', function() {
            throw new Error( 'this is an error' );
         } );
         var mySpy = jasmine.createSpy();
         eventBus.subscribe( 'myEvent', mySpy );
         eventBus.publish( 'myEvent' );

         jasmine.Clock.tick( 1 );

         expect( mySpy ).toHaveBeenCalled();
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'An event bus can have a mediator that', function() {

      it( 'is called before calling subscribers with the current set of queued event items in order they were published', function() {
         var mediatorSpy = jasmine.createSpy();
         eventBus.setMediator( mediatorSpy );

         eventBus.publish( 'myEvent.1' );
         eventBus.publish( 'myEvent.2' );
         eventBus.publish( 'myEvent.3' );

         jasmine.Clock.tick( 1 );

         expect( mediatorSpy ).toHaveBeenCalled();
         expect( mediatorSpy.calls[0].args[0][0].name ).toEqual( 'myEvent.1' );
         expect( mediatorSpy.calls[0].args[0][1].name ).toEqual( 'myEvent.2' );
         expect( mediatorSpy.calls[0].args[0][2].name ).toEqual( 'myEvent.3' );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'can add event items', function() {
         var mySpy = jasmine.createSpy();

         eventBus.setMediator(  function( eventItems ) {
            return eventItems.concat( [ {
               name: 'myEvent.2',
               data: {
                  key: 'val'
               }
            } ] );
         } );
         eventBus.subscribe( 'myEvent.2', mySpy );
         eventBus.publish( 'myEvent.1' );

         jasmine.Clock.tick( 1 );

         expect( mySpy ).toHaveBeenCalled();
         expect( mySpy.calls[0].args[0].data.key ).toEqual( 'val' );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'can remove event items', function() {
         var mySpy1 = jasmine.createSpy( 'mySpy1' );
         var mySpy2 = jasmine.createSpy( 'mySpy2' );
         var mySpy3 = jasmine.createSpy( 'mySpy3' );

         eventBus.setMediator( function( eventItems ) {
            var res = [];
            for( var i = 0; i < eventItems.length; ++i ) {
               if( eventItems[ i ].name !== 'myEvent.2' ) {
                  res.push( eventItems[ i ] );
               }
            }
            return res;
         } );
         eventBus.subscribe( 'myEvent.1', mySpy1 );
         eventBus.subscribe( 'myEvent.2', mySpy2 );
         eventBus.subscribe( 'myEvent.3', mySpy3 );
         eventBus.publish( 'myEvent.1' );
         eventBus.publish( 'myEvent.2' );
         eventBus.publish( 'myEvent.3' );

         jasmine.Clock.tick( 1 );

         expect( mySpy1 ).toHaveBeenCalled();
         expect( mySpy2 ).not.toHaveBeenCalled();
         expect( mySpy3 ).toHaveBeenCalled();
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'an event bus can have an inspector', function() {

      var inspectorSpy;

      beforeEach( function() {
         inspectorSpy = jasmine.createSpy( 'inspector' );
         eventBus.setInspector( inspectorSpy );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'that is called for every new subscription', function() {
         eventBus.subscribe( 'someEvent', jasmine.createSpy(), 'subscriberX' );

         expect( inspectorSpy ).toHaveBeenCalled();
         expect( inspectorSpy.calls[0].args[0].action ).toEqual( 'subscribe' );
         expect( inspectorSpy.calls[0].args[0].source ).toEqual( 'subscriberX' );
         expect( inspectorSpy.calls[0].args[0].event ).toEqual( 'someEvent' );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'that is called for every publish', function() {
         eventBus.publish( 'someEvent', {
            some: 'payload'
         }, 'publisherX' );

         expect( inspectorSpy ).toHaveBeenCalled();
         expect( inspectorSpy.calls[0].args[0].action ).toEqual( 'publish' );
         expect( inspectorSpy.calls[0].args[0].source ).toEqual( 'publisherX' );
         expect( inspectorSpy.calls[0].args[0].event ).toEqual( 'someEvent' );
         expect( inspectorSpy.calls[0].args[0].data ).toEqual( { some: 'payload' } );
         expect( inspectorSpy.calls[0].args[0].cycleId ).toEqual( 0 );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'that is called every time an event is delivered to a subscriber', function() {
         eventBus.subscribe( 'someEvent', jasmine.createSpy(), 'subscriber1' );
         eventBus.subscribe( 'someEvent.withSubject', function() {
            throw new Error( 'I have to fail!' );
         }, 'subscriber2' );
         eventBus.publish( 'someEvent.withSubject', {
            some: 'payload'
         }, 'publisherX' );

         jasmine.Clock.tick( 1 );

         expect( inspectorSpy ).toHaveBeenCalled();
         expect( inspectorSpy.calls[3].args[0].action ).toEqual( 'deliver' );
         expect( inspectorSpy.calls[3].args[0].source ).toEqual( 'publisherX' );
         expect( inspectorSpy.calls[3].args[0].target ).toEqual( 'subscriber1' );
         expect( inspectorSpy.calls[3].args[0].event ).toEqual( 'someEvent.withSubject' );
         expect( inspectorSpy.calls[3].args[0].subscribedTo ).toEqual( 'someEvent' );
         expect( inspectorSpy.calls[3].args[0].cycleId ).toEqual( 0 );

         expect( inspectorSpy.calls[4].args[0].action ).toEqual( 'deliver' );
         expect( inspectorSpy.calls[4].args[0].source ).toEqual( 'publisherX' );
         expect( inspectorSpy.calls[4].args[0].target ).toEqual( 'subscriber2' );
         expect( inspectorSpy.calls[4].args[0].event ).toEqual( 'someEvent.withSubject' );
         expect( inspectorSpy.calls[4].args[0].subscribedTo ).toEqual( 'someEvent.withSubject' );
         expect( inspectorSpy.calls[4].args[0].cycleId ).toEqual( 0 );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'Publishing without providing an event name', function() {

      it( 'throws an error', function() {
         expect( eventBus.publish ).toThrow();
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'Subscribing without providing a callback', function() {

      it( 'throws an error', function() {
         expect( eventBus.subscribe ).toThrow();
         expect( function() {
            eventBus.subscribe( '' );
         } ).toThrow();
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'publishing provides a promise', function() {

      var mySpy;

      beforeEach( function() {
         mySpy = jasmine.createSpy( 'promiseSpy' );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'that is resolved when there was no matching subscriber', function() {
         var promise = eventBus.publish( 'myEvent' );
         promise.then( mySpy );

         jasmine.Clock.tick( 1 );

         expect( mySpy ).toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'that is resolved when there was at least one matching subscriber', function() {
         eventBus.subscribe( 'myEvent', function() {} );
         eventBus.publish( 'myEvent' ).then( mySpy );

         jasmine.Clock.tick( 1 );

         expect( mySpy ).toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'that is  only resolved after all subscribers had the chance to publish events on their own', function() {
         var subEventSubscriberCalled = false;
         eventBus.subscribe( 'event', function() {
            eventBus.publish( 'subEvent' );
         } );

         eventBus.subscribe( 'subEvent', function() {
            expect( mySpy ).not.toHaveBeenCalled();
            subEventSubscriberCalled = true;
         } );

         eventBus.publish( 'event' ).then( mySpy );

         jasmine.Clock.tick( 1 );

         expect( subEventSubscriberCalled ).toBe( true );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'An EventBus instance where events were published', function() {

      it( 'calls nextTick implementation exactly once during the runloop to schedule queue processing', function() {
         expect( nextTick.spy.callCount ).toEqual( 0 );

         eventBus.publish( 'myEvent' );
         expect( nextTick.spy.callCount ).toEqual( 1 );

         eventBus.publish( 'myEvent2' );
         expect( nextTick.spy.callCount ).toEqual( 1 );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'should deliver the event object to the subscribers', function() {
         eventBus.subscribe( 'myEvent', function( event ) {
            expect( event ).toBeDefined();
         } );

         eventBus.publish( 'myEvent' );

         jasmine.Clock.tick( 1 );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'should not deliver an unspecific event to a more specific subscriber', function() {
         var mySpy = jasmine.createSpy();
         eventBus.subscribe( 'firstLevel.secondLevel', mySpy );
         eventBus.publish( 'firstLevel' );

         jasmine.Clock.tick( 1 );

         expect( mySpy ).not.toHaveBeenCalled();
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'An event object', function() {

      it( 'should contain data sent with publish', function() {
         eventBus.subscribe( 'myEvent', function( event ) {
            expect( event.data ).toEqual( {
               'myNumber': 12,
               'myString': 'Hello'
            } );
         } );

         eventBus.publish( 'myEvent', {
            'myNumber': 12,
            'myString': 'Hello'
         } );

         jasmine.Clock.tick( 1 );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'should at least contain an empty object if no data was published', function() {
         eventBus.subscribe( 'myEvent', function( event ) {
            expect( event.data ).toEqual( {} );
         } );

         eventBus.publish( 'myEvent' );

         jasmine.Clock.tick( 1 );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'should prevent from manipulating data by other subscribers', function() {
         eventBus.subscribe( 'myEvent', function( event ) {
            expect( event.data ).toEqual( { 'key': 'val' } );
            event.data.key = 'evil';
         } );
         eventBus.subscribe( 'myEvent', function( event ) {
            expect( event.data ).toEqual( { 'key': 'val' } );
            event.data.key = 'evil';
         } );

         eventBus.publish( 'myEvent', {
            'key': 'val'
         } );

         jasmine.Clock.tick( 1 );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'carries a unique identifier for the current cycle', function() {
         var mySpy = jasmine.createSpy();
         eventBus.subscribe( 'myEvent', mySpy );
         eventBus.publish( 'myEvent' );
         eventBus.publish( 'myEvent' );

         jasmine.Clock.tick( 1 );

         expect( mySpy.calls[ 0 ].args[ 0 ].cycleId ).not.toEqual( mySpy.calls[ 1 ].args[ 1 ].cycleId );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'has the same cycle id in the response of an event as the original event had', function() {
         var cycleId;
         eventBus.subscribe( 'myEvent', function( event, actions ) {
            cycleId = event.cycleId;
            actions.publishResponse( 'myResponse' );
         } );
         eventBus.publish( 'myEvent' );

         var mySpy = jasmine.createSpy();
         eventBus.subscribe( 'myResponse', mySpy );

         jasmine.Clock.tick( 1 );
         expect( mySpy.calls[ 0 ].args[ 0 ].cycleId ).toEqual( cycleId );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'An action object', function() {

      it( 'is always send to subscribers additionally to the event object', function() {
         var mySpy = jasmine.createSpy();
         eventBus.subscribe( 'myEvent', mySpy );
         eventBus.publish( 'myEvent' );

         jasmine.Clock.tick( 1 );

         expect( mySpy.calls[ 0 ].args.length ).toBe( 2 );
         expect( mySpy.calls[ 0 ].args[ 1 ] ).toBeDefined();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'provides a way to directly pusblish a response to the given event', function() {
         eventBus.subscribe( 'myEvent', function( event, actions ) {
            actions.publishResponse( 'myResponse' );
         } );
         eventBus.publish( 'myEvent' );

         var mySpy = jasmine.createSpy();
         eventBus.subscribe( 'myResponse', mySpy );

         jasmine.Clock.tick( 1 );

         expect( mySpy ).toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'provides a way to directly unsubscribe the called subscriber from this event', function() {
         var calls = 0;
         eventBus.subscribe( 'myEvent', function( event, actions ) {
            ++calls;
            actions.unsubscribe();
         } );
         eventBus.publish( 'myEvent' );
         jasmine.Clock.tick( 1 );

         eventBus.publish( 'myEvent' );
         jasmine.Clock.tick( 1 );

         expect( calls ).toEqual( 1 );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'Subscribe allows wildcards', function() {

      var mySpy;

      beforeEach( function() {
         mySpy = jasmine.createSpy();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'at the end of the event name', function() {
         eventBus.subscribe( 'firstLevel.secondLevel', mySpy );
         eventBus.publish( 'firstLevel.secondLevel.thirdLevel' );

         jasmine.Clock.tick( 1 );

         expect( mySpy ).toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'at the beginning of the event name', function() {
         eventBus.subscribe( '.secondLevel.thirdLevel', mySpy );
         eventBus.publish( 'firstLevel.secondLevel.thirdLevel' );

         jasmine.Clock.tick( 1 );

         expect( mySpy ).toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'anywhere in the event name', function() {
         eventBus.subscribe( 'firstLevel..thirdLevel', mySpy );
         eventBus.publish( 'firstLevel.secondLevel.thirdLevel' );

         jasmine.Clock.tick( 1 );

         expect( mySpy ).toHaveBeenCalled();
      } );

      ///////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'as the empty string in the subscriber', function() {
         eventBus.subscribe( '', mySpy );
         eventBus.publish( 'myEvent' );

         jasmine.Clock.tick( 1 );

         expect( mySpy ).toHaveBeenCalled();
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'Subscribe allows inner wildcards', function() {

      var mySpy;

      beforeEach( function() {
         mySpy = jasmine.createSpy();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'using minus', function() {
         eventBus.subscribe( 'firstLevel.secondLevel.thirdLevel', mySpy );
         eventBus.publish( 'firstLevel-here.secondLevel.thirdLevel' );

         jasmine.Clock.tick( 1 );

         expect( mySpy ).toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'using minus combined with wildcards', function() {
         eventBus.subscribe( 'firstLevel..thirdLevel', mySpy );
         eventBus.publish( 'firstLevel.secondLevel.thirdLevel-here' );

         jasmine.Clock.tick( 1 );

         expect( mySpy ).toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'using minus with wildcards only', function() {
         eventBus.subscribe( 'firstLevel', mySpy );
         eventBus.publish( 'firstLevel.secondLevel.thirdLevel-here' );

         jasmine.Clock.tick( 1 );

         expect( mySpy ).toHaveBeenCalled();
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'An event bus supports a request-will-did pattern', function() {

      var mySpy;

      beforeEach( function() {
         mySpy = jasmine.createSpy();
         eventBus.subscribe( 'doSomethingAsyncRequest', function() {
            eventBus.publish( 'willDoSomethingAsync' );
            window.setTimeout( function() {
               eventBus.publish( 'didDoSomethingAsync.andItWorked' );
            }, 10 );
         } );
         eventBus.subscribe( 'doSomethingSyncRequest', function() {
            eventBus.publish( 'willDoSomethingSync' );
            eventBus.publish( 'didDoSomethingSync.andItWorked' );
         } );
         eventBus.subscribe( 'doSomethingSyncRequest.subTopic', function() {
            eventBus.publish( 'willDoSomethingSync.subTopic' );
            eventBus.publish( 'didDoSomethingSync.subTopic.andItWorked' );
         } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'throws when the event name doesn\'t end with "Request"', function() {
         expect( function() {
            eventBus.publishAndGatherReplies( 'wronglyNamedEvent' );
         } ).toThrow();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'accepts if there is a subject part after the "Request"', function() {
         expect( function() {
            eventBus.publishAndGatherReplies( 'mySimpleRequest.someSubject' );
         } ).not.toThrow();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'whose promise is resolved only after all will-did replies were given asynchronously', function() {
         eventBus.publishAndGatherReplies( 'doSomethingAsyncRequest' ).then( mySpy );

         jasmine.Clock.tick( 11 );

         expect( mySpy ).toHaveBeenCalled();
         expect( mySpy.calls[0].args[0].length ).toEqual( 1 );
         expect( mySpy.calls[0].args[0][0].name ).toEqual( 'didDoSomethingAsync.andItWorked' );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'whose promise is resolved only after all will-did replies were given synchronously', function() {
         eventBus.publishAndGatherReplies( 'doSomethingSyncRequest' ).then( mySpy );

         jasmine.Clock.tick( 1 );

         expect( mySpy ).toHaveBeenCalled();
         expect( mySpy.calls[0].args[0].length ).toEqual( 1 );
         expect( mySpy.calls[0].args[0][0].name ).toEqual( 'didDoSomethingSync.andItWorked' );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'only listens to did/will answers for the given subject', function() {
         eventBus.subscribe( 'doSomethingSyncRequest', function() {
            eventBus.publish( 'willDoSomethingSync.subTopic' );
            eventBus.publish( 'didDoSomethingSync.subTopic.andItDidntWork' );
         } );

         eventBus.publishAndGatherReplies( 'doSomethingSyncRequest.subTopic' ).then( mySpy );

         jasmine.Clock.tick( 1 );

         expect( mySpy ).toHaveBeenCalled();
         expect( mySpy.calls[0].args[0].length ).toEqual( 2 );
         expect( mySpy.calls[0].args[0][0].name ).toEqual( 'didDoSomethingSync.subTopic.andItWorked' );
         expect( mySpy.calls[0].args[0][1].name ).toEqual( 'didDoSomethingSync.subTopic.andItDidntWork' );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'resolves even if no one answered the request', function() {
         eventBus.publishAndGatherReplies( 'myUnknownRequest' ).then( mySpy );

         jasmine.Clock.tick( 1 );

         expect( mySpy ).toHaveBeenCalled();
         expect( mySpy.calls[0].args[0].length ).toEqual( 0 );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'EventBus unsubscribing', function() {

      it( 'can take place for all subscribers', function() {
         var mySpy = jasmine.createSpy();
         eventBus.subscribe( 'myEvent', mySpy );

         eventBus.unsubscribeAll();

         eventBus.publish( 'myEvent' );

         jasmine.Clock.tick( 1 );

         expect( mySpy ).not.toHaveBeenCalled();

      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'as a specific subscriber', function() {

         var subscriberSpy;

         beforeEach( function() {
            subscriberSpy = jasmine.createSpy();

            eventBus.subscribe( 'myEvent', subscriberSpy );
            eventBus.subscribe( 'myEvent.subitem', subscriberSpy );
            eventBus.subscribe( '.subitem', subscriberSpy );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'throws if the callback is no function', function() {
            expect( eventBus.unsubscribe ).toThrow();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'removes it from all subscribed events', function() {
            eventBus.unsubscribe( subscriberSpy );

            eventBus.publish( 'myEvent' );
            eventBus.publish( 'myEvent.subitem' );

            jasmine.Clock.tick( 1 );

            expect( subscriberSpy ).not.toHaveBeenCalled();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'ignores successive calls to unsubscribe', function() {
            eventBus.unsubscribe( subscriberSpy );
            eventBus.unsubscribe( subscriberSpy );

            eventBus.publish( 'myEvent' );

            jasmine.Clock.tick( 1 );

            expect( subscriberSpy ).not.toHaveBeenCalled();
         } );

      } );

   } );

} );