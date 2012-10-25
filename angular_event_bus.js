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
define( [ 'angular', './event_bus' ], function( angular, event_bus ) {
   'use strict';

   var module = angular.module( 'lib.event_bus', [] );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   module.run( [ '$q', '$timeout', function( $q, $timeout ) {
      event_bus.init( $q, $timeout );
   } ] );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   module.factory( 'EventBus', [ function() {
      return {
         create: function() {
            return event_bus.create();
         }
      };
   } ] );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return module;

} );