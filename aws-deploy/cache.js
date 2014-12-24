var TinyCache = require('tinycache');

var cache = new TinyCache();

exports.put = cache.put.bind(cache);
exports.get = cache.get.bind(cache);
exports.del = cache.del.bind(cache);
