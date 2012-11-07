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
      this.cycleCounter_ = 0;
      this.eventQueue_ = [];
      this.subscribers_ = [];
      this.waitingDeferreds_ = [];
      this.currentCycle_ = -1;
      this.errorHandler_ = defaultErrorHandler;
      this.mediator_ = defaultMediator;
      this.inspector_ = defaultInspector;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   EventBus.prototype.setErrorHandler = function( optionalErrorHandler ) {
      this.errorHandler_ = _.isFunction( optionalErrorHandler ) ? optionalErrorHandler : defaultErrorHandler;
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   EventBus.prototype.setMediator = function( optionalMediator ) {
      this.mediator_ = _.isFunction( optionalMediator ) ? optionalMediator : defaultMediator;
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   EventBus.prototype.setInspector = function( optionalInspector ) {
      this.inspector_ = _.isFunction( optionalInspector ) ? optionalInspector : defaultInspector;
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Asynchronously publishes an event on the event bus.
    *
    * @param {String} eventName the name of the event to publish
    * @param {Object=} optionalData data to send as payload with the event
    * @param {String=} optionalPublisherName a name for the publisher (for debugging purpose)
    * @return {Promise}
    */
   EventBus.prototype.publish = function publish( eventName, optionalData, optionalPublisherName ) {
      if( !_.isString( eventName ) ) {
         throw new Error( 'Expected eventName to be a String but got ' + eventName );
      }

      var eventItem = {
         name: eventName,
         data: arguments.length > 1 ? optionalData : {},
         publishedDeferred: Q_.defer(),
         cycleId: this.currentCycle_ === -1 ? this.cycleCounter_++ : this.currentCycle_,
         publisherName: _.isString( optionalPublisherName ) ? optionalPublisherName : ''
      };
      enqueueEvent( this, eventItem );

      if( eventName !== 'EventBus.internal.flushDeferreds' ) {
         this.inspector_( {
            action: 'publish',
            source: eventItem.publisherName,
            event: eventName,
            data: eventItem.data,
            cycleId: eventItem.cycleId
         } );
      }

      return eventItem.publishedDeferred.promise;
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Subscribes to a specific event.
    *
    * @param {String} eventName the name of the event to subscribe to
    * @param {Function} subscriber a function to call when the event is published
    * @param {String=} optionalSubscriberName a name for the subscriber (for debugging purpose)
    */
   EventBus.prototype.subscribe = function subscribe( eventName, subscriber, optionalSubscriberName ) {
      if( !_.isString( eventName ) ) {
         throw new Error( 'Expected eventName to be a String but got ' + eventName );
      }
      if( !_.isFunction( subscriber ) ) {
         throw new Error( 'Expected listener to be a function but got ' + subscriber );
      }

      var subscriberName = _.isString( optionalSubscriberName ) ? optionalSubscriberName : '';
      this.subscribers_.push( {
         name: eventName,
         subscriber: subscriber,
         subscriberName: subscriberName
      } );

      this.inspector_( {
         action: 'subscribe',
         source: subscriberName,
         event: eventName
      } );
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function enqueueEvent( self, eventItem ) {
      if( self.eventQueue_.length === 0 ) {
         nextTick_( function() {
            var subscribers = _.clone( self.subscribers_ );
            var queuedEvents = self.eventQueue_;

            self.eventQueue_ = [];

            processWaitingDeferreds( self, processQueue( self, queuedEvents, subscribers ) );
         } );
      }
      self.eventQueue_.push( eventItem );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function processQueue( self, queuedEvents, subscribers ) {

      queuedEvents = self.mediator_( _.reject( queuedEvents, function( eventItem ) {
         return eventItem.name === 'EventBus.internal.flushDeferreds';
      } ) );

      var deferreds = _.map( queuedEvents, function( eventItem ) {

         var eventName = eventItem.name;
         _.each( subscribers, function( subscriberItem ) {

            if( isValidSubscriber( subscriberItem, eventName ) ) {
               var success = true;
               try {
                  subscriberItem.subscriber( {
                     name: eventItem.name,
                     data: _.clone( eventItem.data ),
                     cycleId: eventItem.cycleId || 0
                  }, {
                     publishResponse: function( eventName, optionalData ) {
                        self.currentCycle_ = eventItem.cycleId;
                        self.publish( eventName, optionalData );
                        self.currentCycle_ = -1;
                     }
                  } );

               }
               catch( e ) {
                  self.errorHandler_( e, eventItem, subscriberItem );
                  success = false;
               }

               self.inspector_( {
                  action: 'deliver',
                  source: eventItem.publisherName,
                  target: subscriberItem.subscriberName,
                  event: eventName,
                  subscribedTo: subscriberItem.name,
                  cycleId: eventItem.cycleId,
                  success: success
               } );
            }

         } );

         return eventItem.publishedDeferred;
      } );

      return _.filter( deferreds, _.isObject );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function processWaitingDeferreds( self, newDeferreds ) {
      var waitingDeferreds = self.waitingDeferreds_;
      self.waitingDeferreds_ = newDeferreds;

      if( self.eventQueue_.length === 0 && newDeferreds.length > 0 ) {
         self.publish( 'EventBus.internal.flushDeferreds' );
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

   function defaultErrorHandler( e, eventItem, subscriberItem ) {
      /*global console*/
      if( !console || !_.isFunction( console.log ) ) {
         return;
      }

      var errFunc = _.isFunction( console.error ) ? 'error' : 'log';
      console[ errFunc ]( 'error while calling subscriber for event ' + eventItem.name +
         ' (subscribed to: ' + subscriberItem.name + ')' );
      console.log( e.message );
      if( e.stack ) {
         console.log( e.stack );
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function defaultMediator( eventItems ) {
      return eventItems;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function defaultInspector( inspectionEvent ) {}

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
