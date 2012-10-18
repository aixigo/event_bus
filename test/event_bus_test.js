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

         this.tick_();
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
         for( var i = 0; i < thisObject.savedNextTicks_.length; ++i ) {
            thisObject.savedNextTicks_[ i ]();
         }
         thisObject.savedNextTicks_ = [];
      };

      return thisObject.nextTick_;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function removeTickMock( thisObject ) {
      delete thisObject.eventBus_;
      delete thisObject.nextTick_;
      delete thisObject.savedNextTicks_;
   }

} );