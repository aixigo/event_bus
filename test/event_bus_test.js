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
         var self = this;
         this.savedNextTicks_ = [];

         this.nextTick_ = function( callback ) {
            self.savedNextTicks_.push( callback );
         };

         this.tick_ = function() {
            for( var i = 0; i < this.savedNextTicks_.length; ++i ) {
               this.savedNextTicks_[ i ]();
            }
            this.savedNextTicks_ = [];
         };

         event_bus.init( Q, this.nextTick_ );
         this.eventBus_ = event_bus.create();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      afterEach( function() {
         event_bus.init( null, null );
         delete this.eventBus_;
         delete this.nextTick_;
         delete this.savedNextTicks_;
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
         this.nextTick_ = sinon.spy();
         event_bus.init( Q, this.nextTick_ );
         this.eventBus_ = event_bus.create();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      afterEach( function() {
         event_bus.init( null, null );
         this.eventBus_ = null;
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
         expect( this.nextTick_.callCount ).toBe( 0 );

         this.eventBus_.publish( 'myEvent' );
         expect( this.nextTick_.callCount ).toBe( 1 );

         this.eventBus_.publish( 'myEvent2' );
         expect( this.nextTick_.callCount ).toBe( 1 );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'EventBus.prototype.subscribe', function() {

      beforeEach( function() {
         this.nextTick_ = sinon.spy();
         event_bus.init( Q, this.nextTick_ );
         this.eventBus_ = event_bus.create();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      afterEach( function() {
         event_bus.init( null, null );
         this.eventBus_ = null;
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'throws when called without mandatory arguments', function() {
         expect( this.eventBus_.subscribe ).toThrow();

         // NEEDS FIX C: is there a better way to express that the second argument is also mandatory in case the first is given?
         expect( function() {
            this.eventBus_.subscribe( '' );
         }.bind( this ) ).toThrow();
      } );

   } );

} );