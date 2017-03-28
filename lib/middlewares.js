const request = require('request');
const communication = require('./communication.js');

// Joins the results of other function calls
// Usage:
// app.use(middlewares.joinResults.bind([middlewares.authenticateUser, middlewares.fetchUserDetails]));
exports.joinResults(function_arr, req, res, next) {
  Promise.all(function_arr.map((func) => {return func(req);})).then((values) => {
    values.forEach((item) => {
      // Values are in the form of:
      // {levels: ['user', 'permissions'] data: ...} 
      // and will be applied accordingly to req.user.permissions

      var cur = req;

      item.levels.forEach((level) => {
        if(!cur[level])
          cur[level] = {};
        cur = cur[level];
      });

      if(data)
        cur = data;
    });
    return next();
  }).catch((err) => {
    return next(err);
  })
}

// Returns a promise to authenticate a user
// Pass the x-auth-token header as a parameter
// It will add data to req.user.basic upon success
// On fail it will reject the promise
exports.authenticateUser = function(req) {
  var x_auth_token = req.headers('x-auth-token');
  return new Promise((resolve, reject) => {

    // Find the core service
    communication.getServiceByName('omscore', (err, service) => {
      if(err) return reject(err);

      // Get the request headers to send an auth token
      communication.getRequestHeaders((err, headers) => {
        if(err) return reject(err);

        // Query the core
        request({
          url: `${service.backend_url}/getUserByToken`,
          method: 'POST',
          headers: headers,
          form: {
            x_auth_token,
          },
        }, function(err, res, requestBody) {
          if(err) return reject(err);

          let body;
          try {
            body = JSON.parse(requestBody);
          } catch (err) {
            // Something went wrong in the core
            return reject(err);
          }

          if (!body.success) {
            // We are not authenticated
            return reject(new Error('User not authenticated'));
          }

          return resolve({
            levels: ['user', 'basic'],
            data: body.user
          });
        });
      });
    })
  });
}

// Authenticates a service
// This will add the servicename of the requesting service to req.servicename upon success
// On fail it will reject the Promise
exports.authenticateService = function(req) {
  var x_api_token = req.header('x-api-token');

  return new Promise((resolve, reject) => {
    request({
      url: `${config.registry_url}/checktoken`,
      method: 'POST',
      multipart: {
        'content-type': 'application/json',
        body: {
          instance_key: x_api_token
        }
      }
    }, function(err, res, body) {
      // Something went wrong
      if(err) return reject(err);
      if(!body.success) return reject(new Error(body.message));

      // The other service is not authenticated
      if(!body.data.valid) return reject(new Error('Service not authenticated'));

      return resolve({
        levels: ['servicename'],
        data: body.data.name
      });
    });
  });
};


