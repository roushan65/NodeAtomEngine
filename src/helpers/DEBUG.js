'use strict';
exports.__esModule = true;
var DEBUG = /** @class */ (function() {
  function DEBUG() {
  }
  DEBUG.log = function() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    if (DEBUG.isDebug == true)
      for (var i = 0; i < args.length; i++) {
        console.log(args[i]);
      }
  };
  DEBUG.err = function() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    if (DEBUG.isDebug == true)
      for (var i = 0; i < args.length; i++) {
        console.error(args[i]);
      }
  };
  DEBUG.isDebug = true;
  return DEBUG;
}());
exports.DEBUG = DEBUG;
