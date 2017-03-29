var restify = require('restify');

exports.validateForm = function (req, res, next) {
  res.json({
    success: true,
    message: "Hey",
    you: req.user
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