const request = require('request');
const communication = require('./communication.js');
const config = require('./config/config.json');
const log = require('./config/log.js');
const restify = require('restify');
const Event = require('./models/Event.js');

// Joins the results of other function calls
// Usage:
// app.use(middlewares.joinResults.bind(null, [middlewares.authenticateUser, middlewares.fetchUserDetails]));
exports.joinResults = function(function_arr, req, res, next) {
  if(!Array.isArray(function_arr))
    function_arr = [function_arr];

  Promise.all(function_arr.map((func) => {return func(req);})).then(() => {
    return next();
  }).catch((err) => {
    log.error(err);
    return next(err);
  })
};

// Returns a promise to authenticate a user
// Pass the x-auth-token header as a parameter
// It will add data to req.user.basic upon success
// On fail it will reject the promise
exports.authenticateUser = function(req) {
  var x_auth_token = req.header('x-auth-token');
  return new Promise((resolve, reject) => {
    if(!x_auth_token)
      return reject(new Error('No auth token provided'));


    // Find the core service
    communication.getServiceByName('omscore-nginx', (err, service) => {
      if(err) return reject(err);

      // Get the request headers to send an auth token
      communication.getRequestHeaders((err, headers) => {
        if(err) return reject(err);

        // Query the core
        request({
          url: `${service.backend_url}getUserByToken`,
          method: 'POST',
          headers: headers,
          form: {
            token: x_auth_token,
          },
        }, function(err, res, requestBody) {
          if(err) return reject(err);
          let body;
          try {
            body = JSON.parse(requestBody);
          } catch (err) {
            // Something went wrong in the core
            //log.error('Could not parse core response', requestBody);
            return reject(err);
          }

          if (!body.success) {
            // We are not authenticated
            return reject(new Error('User not authenticated'));
          }

          if(!req.user)
            req.user = {};
          req.user.basic = body.user;
          return resolve();
        });
      });
    })
  });
};

// Authenticates a service
// This will add the servicename of the requesting service to req.servicename upon success
// On fail it will reject the Promise
exports.authenticateService = function(req) {
  const x_api_key = req.header('x-api-key');

  return new Promise((resolve, reject) => {
    if(!x_api_key)
      return reject(new restify.ForbiddenError('No auth token provided'));

    request({
      url: `${config.registry_url}/checktoken`,
      method: 'POST',
      json: true,
      body: {
        x_api_key: x_api_key
      }
    }, function(err, res, body) {
      // Something went wrong
      if(err) return reject(err);

      if(!body.success) 
        return reject(new restify.ForbiddenError('Service not authenticated'));
      req.servicename = body.data.name;
      return resolve();
    });
  });
};

// Authenticate either service or user, depending what is in the headers, if you don't really care about who fired the request
exports.authenticate = function(req) {
  if(req.header('x-auth-token'))
    return authenticateUser(req);
  return authenticateService(req);
};

// Fetches the event in req.params.event_id and store is in req.event
exports.fetchEvent = function(req) {
  // Use the user's token to authenticate against events
  const x_auth_token = req.header('x-auth-token');
  const event_id = req.params.event_id;

  return new Promise((resolve, reject) => {
    communication.getServiceByName('omsevents', (err, service) => {
      if(err) return reject(err);

      request({
        url: `${service.backend_url}/single/${event_id}`,
        method: 'GET',
        headers: {
          'x-auth-token': x_auth_token
        }
      }, function(err, res, body) {
        if(err) return reject(err);
        try {
         body = JSON.parse(body);
        } catch (err) {
          // Reply was not valid json
          return reject(err);
        }

        if(!body.success) return reject(new restify.InternalError('Could not fetch event, oms-events replied: ' + body.message));

        req.event_external = body.data;
        return resolve();
      });
    });
  });
};

// This fetches all the event data we have stored in our db which is related to that event
exports.fetchEventFromDB = function(req) {
  const event_id = req.params.event_id;

  return new Promise((resolve, reject) => {
    Event.findOne({foreign_id: event_id}).exec((err, event) => {
      if(err) return reject(err);

      req.event = event;
      return resolve();
    });
  });
};
