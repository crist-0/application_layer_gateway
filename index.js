const http = require('node:http');
const { forwardRequest } = require('./proxy/forwarder');

const PORT = 3000;


const server = http.createServer((req, res) => {

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;



      console.log(`[gateway] ${method} ${pathname}`);
      forwardRequest(req, res);


});

server.listen(PORT, () => {
  console.log(`GATEWAY OPEN ON http://localhost:${PORT}`);
});
