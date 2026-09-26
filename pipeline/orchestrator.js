const { canRequest } = require("./circuitBreaker");
const { injectionFilter } = require("./injectionFilter");
const { rateLimiter } = require("./rateLimiter");

const runPipeline = async (req, body) => {
  const rateLimitResult = rateLimiter(req);
  if (!rateLimitResult.pass) return rateLimitResult;

  const circuitBreakerResult = canRequest();

  if (!circuitBreakerResult.pass) return circuitBreakerResult;

  const injectionFilterResult = await injectionFilter(req, body);
  if (!injectionFilterResult.pass) return injectionFilterResult;

  return { pass: true }
}

module.exports = {
  runPipeline
}
