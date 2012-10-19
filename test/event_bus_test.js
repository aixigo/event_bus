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
'use strict';
/*global afterEach,assert,beforeEach,buster,describe,expect,it,Q,sinon */

buster.spec.expose();

define( [ 'event_bus/event_bus' ], function( event_bus ) {

   describe( 'event_bus module', function() {

      it( 'has a create method to create EventBus instances', function() {
         assert.isFunction( event_bus.create );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'has a create method to init the module', function() {
         assert.isFunction( event_bus.init );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'throws exception if create is called without setting Q via init before', function() {
         expect( event_bus.create ).toThrow();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'throws exception if create is called without setting nextTick via init before', function() {
         expect( event_bus.create.bind( event_bus, {} ) ).toThrow();
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'EventBus instances', function() {

      beforeEach( function() {
         event_bus.init( Q, addTickMock( this ) );
         this.eventBus_ = event_bus.create();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      afterEach( function() {
         event_bus.init( null, null );

         delete this.eventBus_;
         removeTickMock( this );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'has a publish method', function() {
         assert.isFunction( this.eventBus_.publish );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'has a subscribe method', function() {
         assert.isFunction( this.eventBus_.subscribe );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'calls a directly matching subscriber not during the current runloop', function() {
         var mySpy = sinon.spy();

         this.eventBus_.subscribe( 'message.subject', mySpy );
         this.eventBus_.publish( 'message.subject' );

         expect( mySpy.called ).toBe( false );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'eventually calls a directly matching subscriber', function() {
         var mySpy = sinon.spy();

         this.eventBus_.subscribe( 'message.subject', mySpy );
         this.eventBus_.publish( 'message.subject' );

         this.tick_();

         expect( mySpy.calledOnce ).toBe( true );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'never calls a subscriber that does not match', function() {
         var mySpy = sinon.spy();

         this.eventBus_.subscribe( 'message.other_subject', mySpy );
         this.eventBus_.publish( 'message.subject' );

         this.tick_();

         expect( mySpy.called ).toBe( false );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'EventBus.prototype.publish', function() {

      beforeEach( function() {
         event_bus.init( Q, addTickMock( this ) );
         this.eventBus_ = event_bus.create();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      afterEach( function() {
         event_bus.init( null, null );

         delete this.eventBus_;
         removeTickMock( this );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'throws when called without mandatory argument eventName', function() {
         expect( this.eventBus_.publish ).toThrow();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'adds event to the event queue', function() {
         expect( this.eventBus_.eventQueue_.length ).toBe( 0 );

         this.eventBus_.publish( 'myEvent' );

         expect( this.eventBus_.eventQueue_.length ).toBe( 1 );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'returns a promise', function() {
         var promise = this.eventBus_.publish( 'myEvent' );

         expect( promise ).toBeDefined();
         expect( promise.then ).toBeDefined();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'calls nextTick implementation once during runloop to schedule queue processing', function() {
         expect( this.savedNextTicks_.length ).toBe( 0 );

         this.eventBus_.publish( 'myEvent' );
         expect( this.savedNextTicks_.length ).toBe( 1 );

         this.eventBus_.publish( 'myEvent2' );
         expect( this.savedNextTicks_.length ).toBe( 1 );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'resolves the promise when there was no matching subscriber', function( done ) {
         this.eventBus_.publish( 'myEvent' ).then( function() {
            expect( true ).toBe( true );
            done();
         }, function() {
            assert.fail();
            done();
         } );

         this.tickAll_();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'resolves the promise when there was at least one matching subscriber', function( done ) {
         this.eventBus_.subscribe( 'myEvent', function() {} );
         this.eventBus_.publish( 'myEvent' ).then( function() {
            expect( true ).toBe( true );
            done();
         }, function() {
            assert.fail();
            done();
         } );

         this.tickAll_();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'should only resolve the promise after all subscribers had the chance to publish events on their own', function( done ) {
         var self = this;
         this.eventBus_.subscribe( 'event', function() {
            self.eventBus_.publish( 'subEvent' );

            self.tickAsync_();
         } );

         var mySpy = sinon.spy();
         this.eventBus_.subscribe( 'subEvent', mySpy );

         this.eventBus_.publish( 'event' ).then( function() {
            expect( mySpy.called ).toBe( true );
            done();
         } );

         self.tick_();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'should deliver the event object to the subscribers', function() {
         this.eventBus_.subscribe( 'myEvent', function( event ) {
            expect( event ).toBeDefined();
         } );

         this.eventBus_.publish( 'myEvent' );

         this.tick_();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'should deliver an event object with certain properties', function() {
         this.eventBus_.subscribe( 'myEvent', function( event ) {
            expect( event.name ).toBe( 'myEvent' );
         } );

         this.eventBus_.publish( 'myEvent' );

         this.tick_();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

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

         this.tick_();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'should deliver an empty object for missing data within the event object', function() {
         this.eventBus_.subscribe( 'myEvent', function( event ) {
            expect( event.data ).toEqual( {} );
         } );

         this.eventBus_.publish( 'myEvent' );

         this.tick_();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

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

         this.tick_();
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'EventBus.prototype.subscribe', function() {

      beforeEach( function() {
         event_bus.init( Q, addTickMock( this ) );
         this.eventBus_ = event_bus.create();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      afterEach( function() {
         event_bus.init( null, null );

         delete this.eventBus_;
         removeTickMock( this );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'throws when called without mandatory arguments', function() {
         expect( this.eventBus_.subscribe ).toThrow();

         // NEEDS FIX C: is there a better way to express that the second argument is also mandatory in case the first is given?
         expect( function() {
            this.eventBus_.subscribe( '' );
         }.bind( this ) ).toThrow();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'allows wildcard at the end of the event name', function() {
         var mySpy = sinon.spy();
         this.eventBus_.subscribe( 'firstLevel.secondLevel', mySpy );
         this.eventBus_.publish( 'firstLevel.secondLevel.thirdLevel' );

         this.tick_();

         expect( mySpy.called ).toBe( true );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'allows wildcard at the beginning of the event name', function() {
         var mySpy = sinon.spy();
         this.eventBus_.subscribe( '.secondLevel.thirdLevel', mySpy );
         this.eventBus_.publish( 'firstLevel.secondLevel.thirdLevel' );

         this.tick_();

         expect( mySpy.called ).toBe( true );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'allows wildcards anywhere in the event name', function() {
         var mySpy = sinon.spy();
         this.eventBus_.subscribe( 'firstLevel..thirdLevel', mySpy );
         this.eventBus_.publish( 'firstLevel.secondLevel.thirdLevel' );

         this.tick_();

         expect( mySpy.called ).toBe( true );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'allows matching of inner wildcards using minus', function() {
         var mySpy = sinon.spy();
         this.eventBus_.subscribe( 'firstLevel.secondLevel.thirdLevel', mySpy );
         this.eventBus_.publish( 'firstLevel-here.secondLevel.thirdLevel' );

         this.tick_();

         expect( mySpy.called ).toBe( true );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'allows matching of inner wildcards using minus combined with wildcards', function() {
         var mySpy = sinon.spy();
         this.eventBus_.subscribe( 'firstLevel..thirdLevel', mySpy );
         this.eventBus_.publish( 'firstLevel.secondLevel.thirdLevel-here' );

         this.tick_();

         expect( mySpy.called ).toBe( true );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'allows matching of inner wildcards using minus with wildcards only', function() {
         var mySpy = sinon.spy();
         this.eventBus_.subscribe( 'firstLevel', mySpy );
         this.eventBus_.publish( 'firstLevel.secondLevel.thirdLevel-here' );

         this.tick_();

         expect( mySpy.called ).toBe( true );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function addTickMock( thisObject ) {
      thisObject.savedNextTicks_ = [];

      thisObject.nextTick_ = function( callback ) {
         thisObject.savedNextTicks_.push( callback );
      };

      thisObject.tick_ = function() {
         var ticks = thisObject.savedNextTicks_;
         thisObject.savedNextTicks_ = [];
         for( var i = 0; i < ticks.length; ++i ) {
            ticks[ i ]();
         }
      };

      thisObject.tickAsync_ = function() {
         window.setTimeout( thisObject.tick_, 10 );
      };

      thisObject.tickAll_ = function() {
         window.setTimeout( function() {
            if( !thisObject.tick_ ) {
               // test is already finished and mock removed but there's still something in the queue
               // --> ignore it
               return;
            }

            thisObject.tick_();
            if( thisObject.savedNextTicks_.length > 0 ) {
               thisObject.tickAll_();
            }
         }, 10 );
      };

      return thisObject.nextTick_;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function removeTickMock( thisObject ) {
      delete thisObject.eventBus_;
      delete thisObject.nextTick_;
      delete thisObject.savedNextTicks_;
      delete thisObject.tickAll_;
      delete thisObject.tickAsync_;
      delete thisObject.tick_;
   }

} );