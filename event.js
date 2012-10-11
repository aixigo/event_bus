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
   [ 'underscore' ],

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function( _ )
   {
      "use strict";

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function Event( name, subject, payload )
      {
         this.name_ = name;
         this.subject_ = subject;
         this.payload_ = payload;

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function getPayload()
         {
            return this.payload_;
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function getName()
         {
            return this.name_;
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function getSubject()
         {
            return this.subject_;
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         return {
            'getPayload': getPayload,
            'getName':    getName,
            'getSubject': getSubject
         }
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      return {
         'create': function( name, subject, payload ) {
            return new Event( name, subject, payload );
         }
      };
   }
);
