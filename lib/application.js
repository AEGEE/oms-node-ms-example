var restify = require('restify');

exports.validateForm = function (req, res, next) {
  console.log("asd");
  res.json({
    success: true,
    message: "Hey",
    you: req.user,
    servicename: req.servicename
  });
  return next();
};


exports.listEventApplications = function(req, res, next) {
  res.json({
    user: req.user,
    event: req.event
  });
  return next();
};