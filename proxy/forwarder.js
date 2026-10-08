const http = require('node:http');
const { recordFailure, recordSuccess } = require('../pipeline/circuitBreaker');
const { buildBaseEvent, logEvent } = require('../logger/logger');
const { config } = require('../config/configLoader');

function forwardRequest(req, res, body) {
  const PORT = config.backend.port;

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  const options = {
    hostname: config.backend.hostname,
    port: PORT,
    path: pathname,
    method: method,
    headers: {
      'content-length': Buffer.byteLength(body)
    }
  };

  console.log(`PathName : ${pathname} \n`);

  const reqq = http.request(options, (ress) => {
    console.log(`STATUS: ${ress.statusCode}`);

    const statusCode = ress.statusCode;
    const headers = ress.headers;

    res.writeHead(statusCode, headers);

    let event = buildBaseEvent(req);

    event.type = "traffic";
    event.statusCode = statusCode;

    logEvent(event);

    if (statusCode >= 500) {
      recordFailure();
    } else {
      recordSuccess();
    }

    ress.pipe(res);

  });
  reqq.on('error', (e) => {
    console.error(`Problem with the request: ${e.message}`);
    recordFailure();
    })
  reqq.end(body);

}


module.exports = {
  forwardRequest
};
