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
window.specTitle = 'EventBus Specification';
window.tests = [ 'lib/event_bus/spec/event_bus_spec' ];

// Configure require js for this specific module. It is recommended to place this file within a sub
// folder called 'spec' within the module. Hence the baseUrl should point one folder up to the
// main folder of this module (most probably '../').
// Optionally it is necessary to configure the paths to all modules required by the module under test.
require.config( {
   baseUrl: '../../../',
   shim: {
      'lib/underscore/underscore': {
         exports: '_'
      }
   }
} );