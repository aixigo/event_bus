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
   'lib/underscore/underscore'
], function( _ ) {
   'use strict';

   var Q_;
   var nextTick_;

   var PART_SEPARATOR = '.';
   var SUB_PART_SEPARATOR = '-';
   var REQUEST_MATCHER = /^(.)(.*)Request(\..+)?$/;

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function EventBus( optionalConfiguration ) {
      this.config_ = _.defaults( optionalConfiguration || {}, {
         pendingDidTimeout: 3000
      } );

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
         subscriberName: subscriberName,
         subscriptionWeight: calculateSubscriptionWeight( eventName )
      } );

      this.inspector_( {
         action: 'subscribe',
         source: subscriberName,
         target: '-',
         event: eventName,
         cycleId: this.currentCycle_
      } );
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Unsubscribes a subscriber from all subscribed events.
    *
    * NEEDS FIX B: Currently this only removes the subscriber for future events but ignores queued events
    *
    * @param {Function} subscriber the function to unsubscribe
    */
   EventBus.prototype.unsubscribe = function( subscriber ) {
      if( !_.isFunction( subscriber ) ) {
         throw new Error( 'Expected listener to be a function but got ' + subscriber );
      }

      var self = this;
      this.subscribers_ = _.filter( this.subscribers_, function( subscriberItem ) {
         if( subscriberItem.subscriber !== subscriber ) {
            return true;
         }

         self.inspector_( {
            action: 'unsubscribe',
            source: subscriberItem.subscriberName,
            target: '-',
            event: subscriberItem.name,
            cycleId: self.currentCycle_
         } );
         return false;
      } );
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Asynchronously publishes an event on the event bus.
    *
    * @param {String} eventName the name of the event to publish
    * @param {Object=} optionalEvent the event to publish
    * @return {Promise}
    */
   EventBus.prototype.publish = function publish( eventName, optionalEvent ) {
      if( !_.isString( eventName ) ) {
         throw new Error( 'Expected eventName to be a String but got ' + eventName );
      }

      var item = _.isObject( optionalEvent ) ? _.clone( optionalEvent ) : {};
      var eventItem = _.defaults( item, {
            data: {},
            cycleId: this.currentCycle_ > -1 ? this.currentCycle_ : this.cycleCounter_++,
            sender: null,
            initiator: null
         } );
      eventItem.publishedDeferred = Q_.defer(),
      eventItem.name = eventName;
      enqueueEvent( this, eventItem );

      this.inspector_( {
         action: 'publish',
         source: eventItem.sender,
         target: '-',
         event: eventName,
         eventObject: eventItem,
         cycleId: eventItem.cycleId
      } );

      return eventItem.publishedDeferred.promise;
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Asynchronously publishes an event on the event bus.
    *
    * @param {String} eventName the name of the event to publish
    * @param {Object=} optionalEvent the event to publish
    * @return {Promise}
    */
   EventBus.prototype.publishAndGatherReplies = function publishAndGatherReplies( eventName, optionalEvent ) {
      if( !_.isString( eventName ) ) {
         throw new Error( 'Expected eventName to be a String but got ' + eventName );
      }
      var matches = REQUEST_MATCHER.exec( eventName );
      if( !matches ) {
         throw new Error( 'Expected eventName to end with "Request" but got ' + eventName );
      }

      var self = this;
      var sender = optionalEvent ? optionalEvent.sender : undefined;
      var eventNameSuffix = matches[1].toUpperCase() + matches[2];
      if( matches[ 3 ] ) {
         eventNameSuffix += matches[ 3 ];
      }
      var deferred = Q_.defer();
      var willWaitingForDid = [];
      var givenDidResponses = [];
      var cycleFinished = false;

      function willCollector( event ) {
         if( typeof event.sender !== 'string' ) {
            throw new Error( 'A response with will to a request-event must contain a sender.' );
         }

         willWaitingForDid.push( event.sender );
      }
      this.subscribe( 'will' + eventNameSuffix, willCollector, sender );

      function didCollector( event ) {
         givenDidResponses.push( event );

         var senderIndex = _.indexOf( willWaitingForDid, event.sender );
         if( senderIndex !== -1 ) {
            willWaitingForDid.splice( senderIndex, 1 );
         }

         if( willWaitingForDid.length === 0 && cycleFinished ) {
            finish();
         }
      }
      this.subscribe( 'did' + eventNameSuffix, didCollector, sender );

      var timeoutRef = setTimeout( function() {
         if( willWaitingForDid.length > 0 ) {
            var message = 'Timeout while waiting for pending did' + eventNameSuffix + ' on ' + eventName +
               ' from ' + sender + ' after ' + self.config_.pendingDidTimeout + 'ms.\n' +
               '  Response missing from: ' + willWaitingForDid.join( ', ' ) + '.';
            self.errorHandler_( message );
            finish();
         }
      }, this.config_.pendingDidTimeout );

      this.publish( eventName, optionalEvent ).then( function() {
         if( willWaitingForDid.length === 0 ) {
            // either there was no will or all did reponses were already given in the same cycle as the will
            return finish();
         }

         cycleFinished = true;
      } );

      function finish() {
         clearTimeout( timeoutRef );
         self.unsubscribe( willCollector );
         self.unsubscribe( didCollector );
         deferred.resolve( givenDidResponses );
      }

      return deferred.promise;
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function enqueueEvent( self, eventItem ) {
      if( self.eventQueue_.length === 0 ) {
         nextTick_( function() {
            var queuedEvents = self.eventQueue_;

            self.eventQueue_ = [];

            processWaitingDeferreds( self, processQueue( self, queuedEvents ) );
         } );
      }
      self.eventQueue_.push( eventItem );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function processQueue( self, queuedEvents ) {
      return _.map( self.mediator_( queuedEvents ), function( eventItem ) {

         self.currentCycle_ = eventItem.cycleId;

         var deferred = eventItem.publishedDeferred;
         delete eventItem.publishedDeferred;

         _.each( findSubscribers( self, eventItem.name ), function( subscriberItem ) {
            self.inspector_( {
               action: 'deliver',
               source: eventItem.sender,
               target: subscriberItem.subscriberName,
               event: eventItem.name,
               subscribedTo: subscriberItem.name,
               cycleId: eventItem.cycleId
            } );

            try {
               subscriberItem.subscriber( eventItem, {
                  unsubscribe: function() {
                     self.unsubscribe( subscriberItem.subscriber );
                  }
               } );

            }
            catch( e ) {
               var message = 'error while calling subscriber for event ' + eventItem.name +
                  ' (subscribed to: ' + subscriberItem.name + ')';
               self.errorHandler_( message, e );
            }
         } );

         self.currentCycle_ = -1;

         return deferred;
      } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function processWaitingDeferreds( self, newDeferreds ) {
      var waitingDeferreds = self.waitingDeferreds_;
      self.waitingDeferreds_ = newDeferreds;

      _.each( waitingDeferreds, function( deferred ) {
         deferred.resolve();
      } );

      if( self.eventQueue_.length === 0 ) {
         // nothing was queued by any subscriber. The publishers can instantly be notified of delivery.
         _.each( newDeferreds, function( deferred ) {
            deferred.resolve();
         } );
         self.waitingDeferreds_ = [];
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function findSubscribers( self, eventName ) {
      var subscribers = [];

      _.each( self.subscribers_, function( subscriberItem ) {
         if( isValidSubscriber( subscriberItem, eventName ) ) {
            var weight = subscriberItem.subscriptionWeight;
            for( var index = 0; index < subscribers.length; ++index ) {
               var pushedWeight = subscribers[index].subscriptionWeight;
               if( weight[0] > pushedWeight[0] ) {
                  subscribers.splice( index, 0, subscriberItem );
                  return;
               }

               if( weight[0] === pushedWeight[0] ) {
                  if( weight[1] > pushedWeight[1] ) {
                     subscribers.splice( index, 0, subscriberItem );
                     return;
                  }
               }
            }
            subscribers.push( subscriberItem );
         }
      } );

      return subscribers;
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

   function calculateSubscriptionWeight( eventName ) {
      var parts = eventName.split( '.' );
      var weight = [ 0, 0 ];
      _.each( parts, function( part ) {
         if( part.length > 0 ) {
            weight[0]++;
            weight[1] += part.split( '-' ).length - 1;
         }
      } );
      return weight;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function defaultErrorHandler( message, optionalException ) {
      /*global console*/
      if( !console || !_.isFunction( console.log ) ) {
         return;
      }

      var errFunc = _.isFunction( console.error ) ? 'error' : 'log';
      console[ errFunc ]( message );
      if( optionalException ) {
         console.log( optionalException.message );
         if( optionalException.stack ) {
            console.log( optionalException.stack );
         }
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

      create: function( optionalConfiguration ) {
         if( !Q_ ) {
            throw new Error( 'Need a promise implementation like $q or Q' );
         }
         if( !nextTick_ ) {
            throw new Error( 'Need a next tick implementation like $timeout' );
         }

         return new EventBus( optionalConfiguration );
      },

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      init: function( Q, nextTick ) {
         Q_ = Q;
         nextTick_ = nextTick;
      }

   };

} );
