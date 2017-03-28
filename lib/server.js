var restify = require('restify'), // require the restify library.
server = restify.createServer(); // create an HTTP server.

server.get('/hello', function (req, res, next) {
  res.send("Hello World!");
  return next();
});

server.listen(process.env.PORT || 8085, function () { // bind server to port 8085.
  console.log('%s listening at %s', server.name, server.url);
});