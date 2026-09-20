const { rateLimiter } = require("./rateLimiter");

const runPipeline = (req) => {
  const result = rateLimiter(req)
  return result;
}

module.exports = {
  runPipeline
}
