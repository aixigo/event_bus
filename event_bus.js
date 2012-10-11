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
define(
   [ 'underscore', './event' ],

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function( _, Event )
   {
      "use strict";

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function EventBus()
      {
         EventBus.prototype.singleton_ = this;

         this.queue_ = [];
         this.subscribers = {};
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      EventBus.prototype.singleton()
      {
         if( _.isUndefined( EventBus.prototype.singleton_ ) ) {
            EventBus.prototype.singleton_ = new EventBus();
         }

         return EventBus.prototype.singleton_;
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      EventBus.prototype.subscribe = function( subscriberId, callback )
      {
         subscribers[ subscriberId ] = { 'sendEvent': callback };
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      EventBus.prototype.unsubscribe = function( subscriberId )
      {
         delete this.subscribers[ subscriberId ];
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      EventBus.prototype.publish = function()
      {
         // Create a batch from the currently queued events as the queue might get modified during event
         // processing
         var batch = this.queue_;
         this.queue_ = [];

         // Send batch to all subscribers
         _each( batch, function( event ){
            _.each( this.subscribers, function( subscriber, subscriberId ) {
               subscriber.sendEvent( event );
            } );
         } );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      EventBus.prototype.pushEvent = function( name, subject, payload )
      {
         this.queue_.push( Event.create( name, subject, payload ) );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      return {
         /**
          * Adds an event to the event queue.
          *
          * @param name    The event name.
          * @param subject The event subject.
          * @param payload The event payload, if any.
          */
         'push': function( name, subject, payload ) {
            EventBus.singleton().pushEvent( name, subject, payload );
         },

         /**
          * Subscribes to this event bus. Subscribers will receive ALL events on the bus, i.e. they themselves
          * are responsible for selecting the one they are interested in.
          *
          * @param subscriberId The subscriber's identifier.
          * @param callback     The callback method. It takes an event as its only parameter.
          */
         'subscribe': function( subscriberId, callback ) {
            EventBus.singleton().subscribe( subscriberId, callback );
         },

         /**
          * Removes a subscriber's callback from the list of subscribers.
          *
          * @param subscriberId The subscriber's identifier.
          */
         'unsubscribe': function( subscriberId ) {
            EventBus.singleton().unsubscribe( subscriberId );
         },

         /**
          * Publishes all events currently on the bus (i.e. sends them to all subscribers) and removes them
          * from the queue.
          */
         'publish': function() {
            EventBus.singleton().publish();
         }
      };
   }
);
