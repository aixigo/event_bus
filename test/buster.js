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
var config = exports;
var test = 'event_bus/test/';

config[ 'myTests' ] = {
   'environment': 'browser',
   'extensions': [
      require( 'buster-amd' ),
      require( 'buster-sinon' )
   ],
   'rootPath': '../../',
   'sources': [
      'event_bus/event_bus.js'
   ],
   'libs': [
      test + 'require_test_config.js',

      // NEEDS FIX A: how to handle libs just used as a replacement during testing?
      test + 'test_libs/q.min.js',

      'underscore/underscore-1.3.3-min.js',
      'requirejs/require.js'
   ],
   'tests': [
      test + '*_test.js'
   ]
};
