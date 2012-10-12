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

define( [ 'underscore' ], function( _ ) {

   var Q_
     , nextTick_;

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function EventBus() {
      this.eventQueue_ = [];
      this.subscribers_ = [];
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   EventBus.prototype.publish = function( eventName, optionalData ) {
      if( !_.isString( eventName ) ) {
         throw new Error( 'Expected eventName to be a String but got ' + eventName );
      }

      var eventItem = {
         'eventName': eventName,
         'calledDeferred': Q_.defer()
      };

      if( this.eventQueue_.length === 0 ) {
         nextTick_( _.bind( this.processQueue_, this ) );
      }
      this.eventQueue_.push( eventItem );

      return eventItem.calledDeferred.promise;
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   EventBus.prototype.subscribe = function( eventName, subscriber ) {
      if( !_.isString( eventName ) ) {
         throw new Error( 'Expected eventName to be a String but got ' + eventName );
      }
      if( !_.isFunction( subscriber ) ) {
         throw new Error( 'Expected listener to be a function but got ' + subscriber );
      }

      this.subscribers_.push( {
         'eventName': eventName,
         'subscriber': subscriber
      } );
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   EventBus.prototype.processQueue_ = function() {
      var queuedEvents = this.eventQueue_;
      var subscribers = this.subscribers_;
      this.eventQueue_  = [];

      _.each( queuedEvents, function( eventItem ) {

         var eventName = eventItem.eventName;
         _.each( subscribers, function( subscriberItem ) {

            if( subscriberItem.eventName === eventName ) {
               subscriberItem.subscriber();
            }

         } );
      } );

   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {

      create: function() {
         if( !Q_ ) {
            throw new Error( 'Need a promise implementation like Q' );
         }
         if( !nextTick_ ) {
            throw new Error( 'Need a next tick implementation like $timeout' );
         }
         return new EventBus();
      },

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      init: function( Q, nextTick ) {
         Q_ = Q;
         nextTick_ = nextTick;
      }

   }

} );
