const { injectionFilter } = require("./injectionFilter");
const { rateLimiter } = require("./rateLimiter");

const runPipeline = async (req, body) => {
  const rateLimitResult = rateLimiter(req);
  if (!rateLimitResult.pass) return rateLimitResult;

  const injectionFilterResult = await injectionFilter(req, body);
  if (!injectionFilterResult.pass) return injectionFilterResult;

  return { pass: true }
}

module.exports = {
  runPipeline
}
