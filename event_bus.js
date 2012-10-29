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
define( [ 'underscore' ], function( _ ) {
   'use strict';

   var Q_;
   var nextTick_;
   var PART_SEPARATOR = '.';
   var SUB_PART_SEPARATOR = '-';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function EventBus() {
      this.eventQueue_ = [];
      this.subscribers_ = [];
      this.waitingDeferreds_ = [];
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   EventBus.prototype.publish = function( eventName, optionalData ) {
      if( !_.isString( eventName ) ) {
         throw new Error( 'Expected eventName to be a String but got ' + eventName );
      }

      var eventItem = {
         name: eventName,
         data: arguments.length > 1 ? optionalData : {},
         publishedDeferred: Q_.defer()
      };

      if( this.eventQueue_.length === 0 ) {
         nextTick_( _.bind( function() {
            var subscribers = _.clone( this.subscribers_ );
            var queuedEvents = this.eventQueue_;

            this.eventQueue_ = [];

            processWaitingDeferreds( this, processQueue( queuedEvents, subscribers ) );
         }, this ) );
      }
      this.eventQueue_.push( eventItem );

      return eventItem.publishedDeferred.promise;
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
         name: eventName,
         subscriber: subscriber
      } );
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function processQueue( queuedEvents, subscribers ) {
      return _.without( _.map( queuedEvents, function( eventItem ) {

         var eventName = eventItem.name;
         _.each( subscribers, function( subscriberItem ) {

            if( isValidSubscriber( subscriberItem, eventName ) ) {
               subscriberItem.subscriber( {
                  name: eventItem.name,
                  data: _.clone( eventItem.data )
               } );
            }

         } );

         // prevent from endless loop due to never ending internal flush events when processing the deferreds.
         if( eventName === 'EventBus.internal.flushDeferreds' ) {
            return null;
         }

         return eventItem.publishedDeferred;
      } ), null );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function processWaitingDeferreds( eventBus, newDeferreds ) {
      var waitingDeferreds = eventBus.waitingDeferreds_;
      eventBus.waitingDeferreds_ = newDeferreds;

      if( eventBus.eventQueue_.length === 0 && newDeferreds.length > 0 ) {
         eventBus.publish( 'EventBus.internal.flushDeferreds' );
      }

      _.each( waitingDeferreds, function( deferred ) {
         deferred.resolve();
      } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function isValidSubscriber( subscriber, eventName ) {
      var subscribedTo = subscriber.name;
      if( subscribedTo === eventName ) {
         return true;
      }

      var subscribedToParts = subscribedTo.split( PART_SEPARATOR );
      var eventNameParts = eventName.split( PART_SEPARATOR );
      if( subscribedToParts.length > eventNameParts.length ) {
         return false;
      }

      for( var i = 0, len = eventNameParts.length; i < len; ++i ) {
         // subscribedTo is a prefix of event name
         if( i >= subscribedToParts.length ) {
            return true;
         }

         if( !matchesPart( subscribedToParts[ i ], eventNameParts[ i ] ) ) {
            return false;
         }
      }

      return true;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function matchesPart( subscribedPart, eventPart ) {
      if( subscribedPart === '' ) {
         return true;
      }
      else if( subscribedPart === eventPart ) {
         return true;
      }

      return ( eventPart.indexOf( subscribedPart + SUB_PART_SEPARATOR ) === 0 );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {

      create: function() {
         if( !Q_ ) {
            throw new Error( 'Need a promise implementation like $q or Q' );
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

   };

} );
