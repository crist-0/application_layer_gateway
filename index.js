const http = require('node:http');
const { forwardRequest } = require('./proxy/forwarder');
const { runPipeline } = require('./pipeline/orchestrator');
const { readRequestBody } = require('./proxy/bodyReader');

const PORT = 3000;


const server = http.createServer( async (req, res) => {

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;


      console.log(`Incoming IP-Address : ${req.socket.remoteAddress}\n`)
      console.log(`[gateway] ${method} ${pathname}`);

      let body;
      try {
        body = await readRequestBody(req)
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ message: "Server side error" }))
        return;
      }

      const result = await runPipeline(req, body);
      if (result.pass) {
        forwardRequest(req, res, body);
      } else {
        res.writeHead(result.status, { "content-type": "application/json" });
        res.end(JSON.stringify({message: result.message }))
      }


});

server.listen(PORT, () => {
  console.log(`GATEWAY OPEN ON http://localhost:${PORT}`);
});
