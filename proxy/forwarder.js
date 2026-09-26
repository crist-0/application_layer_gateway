const http = require('node:http');
const { recordFailure, recordSuccess } = require('../pipeline/circuitBreaker');

function forwardRequest(req, res, body) {
  const PORT = 4000;

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  const options = {
    hostname: '127.0.0.1',
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
