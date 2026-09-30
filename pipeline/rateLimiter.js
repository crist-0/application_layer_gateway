const { config } = require("../config/configLoader");

const ipMap = new Map();



function rateLimiter(req) {
  const ip_adrs = req.socket.remoteAddress
  const time = Date.now()

  let res;

  if (ipMap.has(ip_adrs)) {
    const stmps = ipMap.get(ip_adrs)
    const filtered = stmps.filter(tm => time - tm <= config.rateLimiter.window)
    if (filtered.length < config.rateLimiter.limit) {
      res = {
        pass: true
      }
      filtered.push(time)
    } else {
      res = {
        pass: false,
        status: 429,
        message: "Too many requests"
      }

    }
    ipMap.set(ip_adrs, filtered)
  } else {
    const ar = new Array();
    ar.push(time)
    ipMap.set(ip_adrs, ar);
    res = {
      pass: true
    }
  }

  return res;

}


module.exports = {
  rateLimiter
}
