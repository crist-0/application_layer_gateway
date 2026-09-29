const { buildBaseEvent, logEvent } = require("../logger/logger");
const { canRequest } = require("./circuitBreaker");
const { injectionFilter } = require("./injectionFilter");
const { rateLimiter } = require("./rateLimiter");

const runPipeline = async (req, body) => {
  const rateLimitResult = rateLimiter(req);
  if (!rateLimitResult.pass) {
    let event = buildBaseEvent(req);

    event.type = "security";
    event.source = "rateLimiter";
    event.reason = "Too many requests";

    logEvent(event);

    return rateLimitResult;
  }

  const circuitBreakerResult = canRequest();

  if (!circuitBreakerResult.pass) {

    const event = buildBaseEvent(req);

    event.type = 'security';
    event.source = 'circuitBreaker';
    event.reason = circuitBreakerResult.message;

    logEvent(event);

    return circuitBreakerResult;
  }

  const injectionFilterResult = await injectionFilter(req, body);

  if (!injectionFilterResult.pass) {
    let event = buildBaseEvent(req);

    event.type = "security";
    event.source = "injectionFilter";
    event.reason = "Suspicious pattern detected";

    logEvent(event);

    return injectionFilterResult;
  }

  return { pass: true }
}

module.exports = {
  runPipeline
}
