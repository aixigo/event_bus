/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (C) 2000-2012
//    by aixigo AG, Aachen, Germany.
//
//  All rights reserved. This material is confidential and proprietary to AIXIGO AG and no part of this
//  material should be reproduced, published in any form by any means, electronic or mechanical including
//  photocopy or any information storage or retrieval system nor should the material be disclosed to third
//  parties without the express written authorization of AIXIGO AG.
//
//  aixigo AG
//  http://www.aixigo.de
//  Aachen, Germany
//
define( [ 'event_bus' ], function( event_bus ) {
   'use strict';

   beforeEach( function() {
      jasmine.Clock.useMock();

      event_bus.init( addQMock( this ), addTickMock( this ) );
      this.eventBus_ = event_bus.create();
   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   afterEach( function() {
      event_bus.init( null, null );

      delete this.eventBus_;

      removeQMock( this );
      removeTickMock( this );
   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'An EventBus instance', function() {

      it( 'calls a directly matching subscriber not during the current runloop', function() {
         var mySpy = jasmine.createSpy();

         this.eventBus_.subscribe( 'message.subject', mySpy );
         this.eventBus_.publish( 'message.subject' );

         expect( mySpy ).not.toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'eventually calls a directly matching subscriber', function() {
         var mySpy = jasmine.createSpy();

         this.eventBus_.subscribe( 'message.subject', mySpy );
         this.eventBus_.publish( 'message.subject' );

         jasmine.Clock.tick( 101 );

         expect( mySpy ).toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'never calls a subscriber that does not match', function() {
         var mySpy = jasmine.createSpy();

         this.eventBus_.subscribe( 'message.other_subject', mySpy );
         this.eventBus_.publish( 'message.subject' );

         jasmine.Clock.tick( 101 );

         expect( mySpy ).not.toHaveBeenCalled();
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'Errors when calling subscribers', function() {

      beforeEach( function() {
         this.errorHandlerSpy_ = jasmine.createSpy( 'errorHandler' );
         this.eventBus_.setErrorHandler( this.errorHandlerSpy_ );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      afterEach( function() {
         this.eventBus_.setErrorHandler( null );
         delete this.errorHandlerSpy_;
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'can be handled by a custom error handler', function() {
         this.eventBus_.subscribe( 'myEvent', function() {
            throw new Error( 'this is an error' );
         } );
         this.eventBus_.publish( 'myEvent' );

         jasmine.Clock.tick( 101 );

         expect( this.errorHandlerSpy_ ).toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'don\'t prevent other subscribers from being called', function() {

         this.eventBus_.subscribe( 'myEvent', function() {
            throw new Error( 'this is an error' );
         } );
         var mySpy = jasmine.createSpy();
         this.eventBus_.subscribe( 'myEvent', mySpy );
         this.eventBus_.publish( 'myEvent' );

         jasmine.Clock.tick( 101 );

         expect( mySpy ).toHaveBeenCalled();
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'An event bus can have a mediator that', function() {

      it( 'is called before calling subscribers with the current set of queued event items in order they were published', function() {
         var mediatorSpy = jasmine.createSpy();
         this.eventBus_.setMediator( mediatorSpy );

         this.eventBus_.publish( 'myEvent.1' );
         this.eventBus_.publish( 'myEvent.2' );
         this.eventBus_.publish( 'myEvent.3' );

         jasmine.Clock.tick( 101 );

         expect( mediatorSpy ).toHaveBeenCalled();
         expect( mediatorSpy.calls[0].args[0][0].name ).toEqual( 'myEvent.1' );
         expect( mediatorSpy.calls[0].args[0][1].name ).toEqual( 'myEvent.2' );
         expect( mediatorSpy.calls[0].args[0][2].name ).toEqual( 'myEvent.3' );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'can add event items', function() {
         var mySpy = jasmine.createSpy();

         this.eventBus_.setMediator(  function( eventItems ) {
            return eventItems.concat( [ {
               name: 'myEvent.2',
               data: {
                  key: 'val'
               }
            } ] );
         } );
         this.eventBus_.subscribe( 'myEvent.2', mySpy );
         this.eventBus_.publish( 'myEvent.1' );

         jasmine.Clock.tick( 101 );

         expect( mySpy ).toHaveBeenCalled();
         expect( mySpy.calls[0].args[0].data.key ).toEqual( 'val' );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'can remove event items', function() {
         var mySpy1 = jasmine.createSpy( 'mySpy1' );
         var mySpy2 = jasmine.createSpy( 'mySpy2' );
         var mySpy3 = jasmine.createSpy( 'mySpy3' );

         this.eventBus_.setMediator( function( eventItems ) {
            var res = [];
            for( var i = 0; i < eventItems.length; ++i ) {
               if( eventItems[ i ].name !== 'myEvent.2' ) {
                  res.push( eventItems[ i ] );
               }
            }
            return res;
         } );
         this.eventBus_.subscribe( 'myEvent.1', mySpy1 );
         this.eventBus_.subscribe( 'myEvent.2', mySpy2 );
         this.eventBus_.subscribe( 'myEvent.3', mySpy3 );
         this.eventBus_.publish( 'myEvent.1' );
         this.eventBus_.publish( 'myEvent.2' );
         this.eventBus_.publish( 'myEvent.3' );

         jasmine.Clock.tick( 101 );

         expect( mySpy1 ).toHaveBeenCalled();
         expect( mySpy2 ).not.toHaveBeenCalled();
         expect( mySpy3 ).toHaveBeenCalled();
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'an event bus can have an inspector', function() {

      beforeEach( function() {
         this.inspectorSpy_ = jasmine.createSpy( 'inspector' );
         this.eventBus_.setInspector( this.inspectorSpy_ );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      afterEach( function() {
         this.eventBus_.setInspector( null );
         delete this.inspectorSpy_;
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'that is called for every new subscription', function() {
         this.eventBus_.subscribe( 'someEvent', jasmine.createSpy(), 'subscriberX' );

         expect( this.inspectorSpy_ ).toHaveBeenCalled();
         expect( this.inspectorSpy_.calls[0].args[0].action ).toEqual( 'subscribe' );
         expect( this.inspectorSpy_.calls[0].args[0].source ).toEqual( 'subscriberX' );
         expect( this.inspectorSpy_.calls[0].args[0].event ).toEqual( 'someEvent' );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'that is called for every publish', function() {
         this.eventBus_.publish( 'someEvent', {
            some: 'payload'
         }, 'publisherX' );

         expect( this.inspectorSpy_ ).toHaveBeenCalled();
         expect( this.inspectorSpy_.calls[0].args[0].action ).toEqual( 'publish' );
         expect( this.inspectorSpy_.calls[0].args[0].source ).toEqual( 'publisherX' );
         expect( this.inspectorSpy_.calls[0].args[0].event ).toEqual( 'someEvent' );
         expect( this.inspectorSpy_.calls[0].args[0].data ).toEqual( { some: 'payload' } );
         expect( this.inspectorSpy_.calls[0].args[0].cycleId ).toEqual( 0 );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'that is called every time an event is delivered to a subscriber', function() {
         this.eventBus_.subscribe( 'someEvent', jasmine.createSpy(), 'subscriber1' );
         this.eventBus_.subscribe( 'someEvent.withSubject', function() {
            throw new Error( 'I fail!' );
         }, 'subscriber2' );
         this.eventBus_.publish( 'someEvent.withSubject', {
            some: 'payload'
         }, 'publisherX' );

         jasmine.Clock.tick( 101 );

         expect( this.inspectorSpy_ ).toHaveBeenCalled();
         expect( this.inspectorSpy_.calls[3].args[0].action ).toEqual( 'deliver' );
         expect( this.inspectorSpy_.calls[3].args[0].source ).toEqual( 'publisherX' );
         expect( this.inspectorSpy_.calls[3].args[0].target ).toEqual( 'subscriber1' );
         expect( this.inspectorSpy_.calls[3].args[0].event ).toEqual( 'someEvent.withSubject' );
         expect( this.inspectorSpy_.calls[3].args[0].subscribedTo ).toEqual( 'someEvent' );
         expect( this.inspectorSpy_.calls[3].args[0].success ).toEqual( true );
         expect( this.inspectorSpy_.calls[3].args[0].cycleId ).toEqual( 0 );

         expect( this.inspectorSpy_.calls[4].args[0].action ).toEqual( 'deliver' );
         expect( this.inspectorSpy_.calls[4].args[0].source ).toEqual( 'publisherX' );
         expect( this.inspectorSpy_.calls[4].args[0].target ).toEqual( 'subscriber2' );
         expect( this.inspectorSpy_.calls[4].args[0].event ).toEqual( 'someEvent.withSubject' );
         expect( this.inspectorSpy_.calls[4].args[0].subscribedTo ).toEqual( 'someEvent.withSubject' );
         expect( this.inspectorSpy_.calls[4].args[0].success ).toEqual( false );
         expect( this.inspectorSpy_.calls[4].args[0].cycleId ).toEqual( 0 );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'Publishing', function() {

      it( 'throws an error if the event name is missing', function() {
         expect( this.eventBus_.publish ).toThrow();
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'Subscribing', function() {

      it( 'throws an error when called without event name or subscriber callback', function() {
         var eventBus = this.eventBus_;

         expect( eventBus.subscribe ).toThrow();
         expect( function() {
            eventBus.subscribe( '' );
         } ).toThrow();
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'publishing provides a promise', function() {

      it( 'that is resolved when there was no matching subscriber', function() {
         var promise = this.eventBus_.publish( 'myEvent' );

         jasmine.Clock.tick( 101 );

         expect( promise.deferred.resolve ).toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'that is resolved when there was at least one matching subscriber', function() {
         this.eventBus_.subscribe( 'myEvent', function() {} );
         var promise = this.eventBus_.publish( 'myEvent' );

         jasmine.Clock.tick( 101 );

         expect( promise.deferred.resolve ).toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'that is  only resolved after all subscribers had the chance to publish events on their own', function() {
         var eventBus = this.eventBus_;
         var subEventSubscriberCalled = false;
         this.eventBus_.subscribe( 'event', function() {
            eventBus.publish( 'subEvent' );
         } );

         this.eventBus_.subscribe( 'subEvent', function() {
            expect( promise.deferred.resolve ).not.toHaveBeenCalled();
            subEventSubscriberCalled = true;
         } );

         var promise = this.eventBus_.publish( 'event' );

         jasmine.Clock.tick( 101 );

         expect( subEventSubscriberCalled ).toBe( true );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'An EventBus instance where events were published', function() {

      it( 'calls nextTick implementation exactly once during the runloop to schedule queue processing', function() {
         expect( this.timerCallback_.callCount ).toEqual( 0 );

         this.eventBus_.publish( 'myEvent' );
         expect( this.timerCallback_.callCount ).toEqual( 1 );

         this.eventBus_.publish( 'myEvent2' );
         expect( this.timerCallback_.callCount ).toEqual( 1 );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'should deliver the event object to the subscribers', function() {
         this.eventBus_.subscribe( 'myEvent', function( event ) {
            expect( event ).toBeDefined();
         } );

         this.eventBus_.publish( 'myEvent' );

         jasmine.Clock.tick( 101 );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'should not deliver an unspecific event to a more specific subscriber', function() {
         var mySpy = jasmine.createSpy();
         this.eventBus_.subscribe( 'firstLevel.secondLevel', mySpy );
         this.eventBus_.publish( 'firstLevel' );

         jasmine.Clock.tick( 101 );

         expect( mySpy ).not.toHaveBeenCalled();
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'An event object', function() {

      it( 'should contain data sent with publish', function() {
         this.eventBus_.subscribe( 'myEvent', function( event ) {
            expect( event.data ).toEqual( {
               'myNumber': 12,
               'myString': 'Hello'
            } );
         } );

         this.eventBus_.publish( 'myEvent', {
            'myNumber': 12,
            'myString': 'Hello'
         } );

         jasmine.Clock.tick( 101 );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'should at least contain an empty object if no data was published', function() {
         this.eventBus_.subscribe( 'myEvent', function( event ) {
            expect( event.data ).toEqual( {} );
         } );

         this.eventBus_.publish( 'myEvent' );

         jasmine.Clock.tick( 101 );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'should prevent from manipulating data by other subscribers', function() {
         this.eventBus_.subscribe( 'myEvent', function( event ) {
            expect( event.data ).toEqual( { 'key': 'val' } );
            event.data.key = 'evil';
         } );
         this.eventBus_.subscribe( 'myEvent', function( event ) {
            expect( event.data ).toEqual( { 'key': 'val' } );
            event.data.key = 'evil';
         } );

         this.eventBus_.publish( 'myEvent', {
            'key': 'val'
         } );

         jasmine.Clock.tick( 101 );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'carries a unique identifier for the current cycle', function() {
         var mySpy = jasmine.createSpy();
         this.eventBus_.subscribe( 'myEvent', mySpy );
         this.eventBus_.publish( 'myEvent' );
         this.eventBus_.publish( 'myEvent' );

         jasmine.Clock.tick( 101 );

         expect( mySpy.calls[ 0 ].args[ 0 ].cycleId ).not.toEqual( mySpy.calls[ 1 ].args[ 1 ].cycleId );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'has the same cycle id in the response of an event as the original event had', function() {
         var cycleId;
         this.eventBus_.subscribe( 'myEvent', function( event, actions ) {
            cycleId = event.cycleId;
            actions.publishResponse( 'myResponse' );
         } );
         this.eventBus_.publish( 'myEvent' );

         var mySpy = jasmine.createSpy();
         this.eventBus_.subscribe( 'myResponse', mySpy );

         jasmine.Clock.tick( 101 );
         expect( mySpy.calls[ 0 ].args[ 0 ].cycleId ).toEqual( cycleId );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'An action object', function() {

      it( 'is always send to subscribers additionally to the event object', function() {
         var mySpy = jasmine.createSpy();
         this.eventBus_.subscribe( 'myEvent', mySpy );
         this.eventBus_.publish( 'myEvent' );

         jasmine.Clock.tick( 101 );

         expect( mySpy.calls[ 0 ].args.length ).toBe( 2 );
         expect( mySpy.calls[ 0 ].args[ 1 ] ).toBeDefined();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'provides a way to directly pusblish a response to the given event', function() {
         this.eventBus_.subscribe( 'myEvent', function( event, actions ) {
            actions.publishResponse( 'myResponse' );
         } );
         this.eventBus_.publish( 'myEvent' );

         var mySpy = jasmine.createSpy();
         this.eventBus_.subscribe( 'myResponse', mySpy );

         jasmine.Clock.tick( 101 );

         expect( mySpy ).toHaveBeenCalled();
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'Subscribe allows wildcards', function() {

      it( 'at the end of the event name', function() {
         var mySpy = jasmine.createSpy();
         this.eventBus_.subscribe( 'firstLevel.secondLevel', mySpy );
         this.eventBus_.publish( 'firstLevel.secondLevel.thirdLevel' );

         jasmine.Clock.tick( 101 );

         expect( mySpy ).toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'at the beginning of the event name', function() {
         var mySpy = jasmine.createSpy();
         this.eventBus_.subscribe( '.secondLevel.thirdLevel', mySpy );
         this.eventBus_.publish( 'firstLevel.secondLevel.thirdLevel' );

         jasmine.Clock.tick( 101 );

         expect( mySpy ).toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'anywhere in the event name', function() {
         var mySpy = jasmine.createSpy();
         this.eventBus_.subscribe( 'firstLevel..thirdLevel', mySpy );
         this.eventBus_.publish( 'firstLevel.secondLevel.thirdLevel' );

         jasmine.Clock.tick( 101 );

         expect( mySpy ).toHaveBeenCalled();
      } );

      ///////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'as the empty string in the subscriber', function() {
         var mySpy = jasmine.createSpy();
         this.eventBus_.subscribe( '', mySpy );
         this.eventBus_.publish( 'myEvent' );

         jasmine.Clock.tick( 101 );

         expect( mySpy ).toHaveBeenCalled();
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'Subscribe allows inner wildcards', function() {

      it( 'using minus', function() {
         var mySpy = jasmine.createSpy();
         this.eventBus_.subscribe( 'firstLevel.secondLevel.thirdLevel', mySpy );
         this.eventBus_.publish( 'firstLevel-here.secondLevel.thirdLevel' );

         jasmine.Clock.tick( 101 );

         expect( mySpy ).toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'using minus combined with wildcards', function() {
         var mySpy = jasmine.createSpy();
         this.eventBus_.subscribe( 'firstLevel..thirdLevel', mySpy );
         this.eventBus_.publish( 'firstLevel.secondLevel.thirdLevel-here' );

         jasmine.Clock.tick( 101 );

         expect( mySpy ).toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'using minus with wildcards only', function() {
         var mySpy = jasmine.createSpy();
         this.eventBus_.subscribe( 'firstLevel', mySpy );
         this.eventBus_.publish( 'firstLevel.secondLevel.thirdLevel-here' );

         jasmine.Clock.tick( 101 );

         expect( mySpy ).toHaveBeenCalled();
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'An EventBus cleanup mechanism', function() {

      it( 'removes all subscribers for all events', function() {
         var mySpy = jasmine.createSpy();
         this.eventBus_.subscribe( 'myEvent', mySpy );

         this.eventBus_.unsubscribeAll();

         this.eventBus_.publish( 'myEvent' );

         jasmine.Clock.tick( 101 );

         expect( mySpy ).not.toHaveBeenCalled();

      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function addTickMock( thisObject ) {
      thisObject.timerCallback_ = jasmine.createSpy( 'timerCallback_' );
      return function( func ) {
         thisObject.timerCallback_();
         window.setTimeout( func, 0 );
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function removeTickMock( thisObject ) {
      delete thisObject.timerCallback_;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function addQMock( thisObject ) {
      var i = 0;
      thisObject.Q_ =  {
         defer: function() {

            var spies = {
               resolve: jasmine.createSpy( 'resolve_' + i ),
               reject: jasmine.createSpy( 'reject_' + i ),
               then: jasmine.createSpy( 'then_' + i++ )
            };

            var deferred = {
               resolve: spies.resolve,
               reject: spies.reject,
               promise: {
                  then: spies.then
               }
            };
            // grant access to the original deferred from the returned promise
            deferred.promise.deferred = deferred;

            return deferred;
         }
      };
      return thisObject.Q_;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function removeQMock( thisObject ) {
      delete thisObject.Q_;
   }

} );