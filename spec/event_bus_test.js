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

   describe( 'EventBus', function() {

      it( 'has a create method to create EventBus instances', function() {
         expect( typeof event_bus.create ).toBe( 'function' );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'has a create method to init the module', function() {
         expect( typeof event_bus.init ).toBe( 'function' );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'throws exception if create is called without setting Q via init before', function() {
         expect( event_bus.create ).toThrow();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'throws exception if create is called without setting nextTick via init before', function() {
         expect( event_bus.create.bind( event_bus, {} ) ).toThrow();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'instance', function() {


         beforeEach( function() {
            jasmine.Clock.useMock();

            event_bus.init( addQMock( this ), addTickMock( this ) );
            this.eventBus_ = event_bus.create();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         afterEach( function() {
            event_bus.init( null, null );

            delete this.eventBus_;

            removeQMock( this );
            removeTickMock( this );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'has a publish method', function() {
            expect( typeof this.eventBus_.publish ).toBe( 'function' );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'has a subscribe method', function() {
            expect( typeof this.eventBus_.subscribe ).toBe( 'function' );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'calls a directly matching subscriber not during the current runloop', function() {
            var mySpy = jasmine.createSpy();

            this.eventBus_.subscribe( 'message.subject', mySpy );
            this.eventBus_.publish( 'message.subject' );

            expect( mySpy ).not.toHaveBeenCalled();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'eventually calls a directly matching subscriber', function() {
            var mySpy = jasmine.createSpy();

            this.eventBus_.subscribe( 'message.subject', mySpy );
            this.eventBus_.publish( 'message.subject' );

            jasmine.Clock.tick( 101 );

            expect( mySpy ).toHaveBeenCalled();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'never calls a subscriber that does not match', function() {
            var mySpy = jasmine.createSpy();

            this.eventBus_.subscribe( 'message.other_subject', mySpy );
            this.eventBus_.publish( 'message.subject' );

            jasmine.Clock.tick( 101 );

            expect( mySpy ).not.toHaveBeenCalled();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         describe( 'publish', function() {

            it( 'throws when called without mandatory argument eventName', function() {
               expect( this.eventBus_.publish ).toThrow();
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'adds event to the event queue', function() {
               expect( this.eventBus_.eventQueue_.length ).toBe( 0 );

               this.eventBus_.publish( 'myEvent' );

               expect( this.eventBus_.eventQueue_.length ).toBe( 1 );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'returns a promise', function() {
               var promise = this.eventBus_.publish( 'myEvent' );

               expect( promise ).toBeDefined();
               expect( promise.then ).toBeDefined();
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'calls nextTick implementation once during runloop to schedule queue processing', function() {
               expect( this.timerCallback_.callCount ).toEqual( 0 );

               this.eventBus_.publish( 'myEvent' );
               expect( this.timerCallback_.callCount ).toEqual( 1 );

               this.eventBus_.publish( 'myEvent2' );
               expect( this.timerCallback_.callCount ).toEqual( 1 );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'resolves the promise when there was no matching subscriber', function() {
               var promise = this.eventBus_.publish( 'myEvent' );

               jasmine.Clock.tick( 101 );

               expect( promise.deferred.resolve ).toHaveBeenCalled();

            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'resolves the promise when there was at least one matching subscriber', function() {
               this.eventBus_.subscribe( 'myEvent', function() {} );
               var promise = this.eventBus_.publish( 'myEvent' );

               jasmine.Clock.tick( 101 );

               expect( promise.deferred.resolve ).toHaveBeenCalled();
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'should only resolve the promise after all subscribers had the chance to publish events on their own', function() {
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

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'should deliver the event object to the subscribers', function() {
               this.eventBus_.subscribe( 'myEvent', function( event ) {
                  expect( event ).toBeDefined();
               } );

               this.eventBus_.publish( 'myEvent' );

               jasmine.Clock.tick( 101 );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'should deliver an event object with certain properties', function() {
               this.eventBus_.subscribe( 'myEvent', function( event ) {
                  expect( event.name ).toBe( 'myEvent' );
               } );

               this.eventBus_.publish( 'myEvent' );

               jasmine.Clock.tick( 101 );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'should deliver data within the event object', function() {
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

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'should deliver an empty object for missing data within the event object', function() {
               this.eventBus_.subscribe( 'myEvent', function( event ) {
                  expect( event.data ).toEqual( {} );
               } );

               this.eventBus_.publish( 'myEvent' );

               jasmine.Clock.tick( 101 );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'should prevent from manipulating data for other subscribers', function() {
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

         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         describe( 'subscribe', function() {

            it( 'throws when called without mandatory arguments', function() {
               expect( this.eventBus_.subscribe ).toThrow();

               // NEEDS FIX C: is there a better way to express that the second argument is also mandatory in case the first is given?
               expect( function() {
                  this.eventBus_.subscribe( '' );
               }.bind( this ) ).toThrow();
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'allows wildcard at the end of the event name', function() {
               var mySpy = jasmine.createSpy();
               this.eventBus_.subscribe( 'firstLevel.secondLevel', mySpy );
               this.eventBus_.publish( 'firstLevel.secondLevel.thirdLevel' );

               jasmine.Clock.tick( 101 );

               expect( mySpy ).toHaveBeenCalled();
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'allows wildcard at the beginning of the event name', function() {
               var mySpy = jasmine.createSpy();
               this.eventBus_.subscribe( '.secondLevel.thirdLevel', mySpy );
               this.eventBus_.publish( 'firstLevel.secondLevel.thirdLevel' );

               jasmine.Clock.tick( 101 );

               expect( mySpy ).toHaveBeenCalled();
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'allows wildcards anywhere in the event name', function() {
               var mySpy = jasmine.createSpy();
               this.eventBus_.subscribe( 'firstLevel..thirdLevel', mySpy );
               this.eventBus_.publish( 'firstLevel.secondLevel.thirdLevel' );

               jasmine.Clock.tick( 101 );

               expect( mySpy ).toHaveBeenCalled();
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'allows matching of inner wildcards using minus', function() {
               var mySpy = jasmine.createSpy();
               this.eventBus_.subscribe( 'firstLevel.secondLevel.thirdLevel', mySpy );
               this.eventBus_.publish( 'firstLevel-here.secondLevel.thirdLevel' );

               jasmine.Clock.tick( 101 );

               expect( mySpy ).toHaveBeenCalled();
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'allows matching of inner wildcards using minus combined with wildcards', function() {
               var mySpy = jasmine.createSpy();
               this.eventBus_.subscribe( 'firstLevel..thirdLevel', mySpy );
               this.eventBus_.publish( 'firstLevel.secondLevel.thirdLevel-here' );

               jasmine.Clock.tick( 101 );

               expect( mySpy ).toHaveBeenCalled();
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'allows matching of inner wildcards using minus with wildcards only', function() {
               var mySpy = jasmine.createSpy();
               this.eventBus_.subscribe( 'firstLevel', mySpy );
               this.eventBus_.publish( 'firstLevel.secondLevel.thirdLevel-here' );

               jasmine.Clock.tick( 101 );

               expect( mySpy ).toHaveBeenCalled();
            } );

         } );

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