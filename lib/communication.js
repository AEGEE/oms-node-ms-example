const request = require('request');
const config = require('./config/config.json');
const fs = require('fs');
const log = require('./config/log.js');

var namecache = {};
var catcache = {};
var authtoken = {};

exports.getServiceByName = function(name, callback) {
  // If we already fetched that name, just return it as it is not going to change quickly
  if(namecache.hasOwnProperty(name))
    return callback(null, namecache[name]);

  // Right after startup we will have to query the registry for the data
  request(`${config.registry_url}/service/${name}`, function(err, res, body) {
    if(err)
      return callback(err, null);
    try {
      body = JSON.parse(body);
    } catch (err) {
      return reject(err);
    }

    if(!body.success)
      return callback(new Error('Error when looking up service, registry replied: ' + body.message), null);

    namecache[name] = body.data;
    return callback(null, body.data);
  });
};

exports.getServiceByCategory = function(category, callback) {
  // Also the categories are cachable for quite some time
  if(catcache.hasOwnProperty(category))
    return callback(null, catcache[category]);

  // We have to query the registry
  request(`${config.registry_url}/category/${category}`, function(err, res, body) {
    if(err)
      return callback(err, null);
    try {
      body = JSON.parse(body);
    } catch (err) {
      return reject(err);
    }
    if(!body.success)
      return callback(new Error('Error when looking up category, registry replied: ' + body.message), null);

    catcache[category] = body.data;
    return callback(null, body.data);
  });
};

const getAuthToken = function(callback) {
  // If we already have a valid token, just return it
  if(authtoken.instance_key && (new Date(authtoken.expires)) > (new Date()))
    return callback(null, authtoken.instance_key);

  // Otherwise we need to get one from the registry
  fs.readFile(config.registry_api_key, 'utf8', function(err, data) {
    if(err)
      return callback(err, null);

    request({
      url: `${config.registry_url}/gettoken`,
      method: 'POST',
      json: true,
      body: {
        api_key: data,
        name: config.servicename
      }
    }, function(err, res, body) {

      if(err)
        return callback(err, null);

      /*try {
        body = JSON.parse(body);
      } catch (err) {
        console.log(body);
        return callback(err, null);
      }*/

      if(!body.success)
        return callback(new Error('Error when getting access token, registry replied: ' + body.message), null);

      authtoken = body.data;
      return callback(null, body.data);
    });
  });
}
exports.getAuthToken = getAuthToken;

// Sorry for asyncness, this is javascript
// calls the callback with a document you can add to your interservice request headers for authentication
exports.getRequestHeaders = function(callback) {

  getAuthToken(function(err, res) {
    if(err) return callback(err, null);
    return callback(null, {
      'X-Requested-With': 'XMLHttpRequest',
      'X-Api-Key': res.x_api_key
    });
  });
};