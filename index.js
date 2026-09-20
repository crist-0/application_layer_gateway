const http = require('node:http');
const { forwardRequest } = require('./proxy/forwarder');
const { runPipeline } = require('./pipeline/orchestrator');

const PORT = 3000;


const server = http.createServer((req, res) => {

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;


      console.log(`Incoming IP-Address : ${req.socket.remoteAddress}\n`)
      console.log(`[gateway] ${method} ${pathname}`);
      const result = runPipeline(req);
      if (result.pass) {
        forwardRequest(req, res);
      } else {
        res.writeHead(result.status, { "content-type": "application/json" });
        res.end(JSON.stringify({message: result.message }))
      }


});

server.listen(PORT, () => {
  console.log(`GATEWAY OPEN ON http://localhost:${PORT}`);
});
