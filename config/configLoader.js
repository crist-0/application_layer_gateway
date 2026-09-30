const fs = require('node:fs');
const yaml = require('js-yaml');
const path = require('node:path');

const CONFIG_PATH = path.join(__dirname, 'config.yaml');

const config = {
  rateLimiter: { window: 10000, limit: 3 },
  circuitBreaker: { failureThreshold: 5, cooldownMs: 10000 },
  logger: { maxQueueSize: 300, flushIntervalMs: 15000 }
};

function validateConfig(parsed) {

  if (typeof (parsed.rateLimiter.window) != 'number' || typeof (parsed.rateLimiter.limit) != 'number') {
    return false;
  } else if(typeof(parsed.circuitBreaker.failureThreshold) != 'number' || typeof(parsed.circuitBreaker.cooldownMs) != 'number') {
    return false;
  } else if (typeof (parsed.logger.maxQueueSize) != 'number' || typeof (parsed.logger.flushIntervalMs) != 'number') {
    return false;
  } else {
    return true;
  }
}

function loadConfig() {
  try {
    const fileContents = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = yaml.load(fileContents);

    if (!validateConfig(parsed)) {
      throw new Error('Config validation failed');
    }

    config.rateLimiter = parsed.rateLimiter;
    config.circuitBreaker = parsed.circuitBreaker;
    config.logger = parsed.logger;

    console.log('Config loaded successfully');
  } catch (err) {
    console.error('Failed to load config, keeping previous values:', err.message);
  }
}




loadConfig();

fs.watch(CONFIG_PATH, () => {
    loadConfig();
});

console.log('Current config:', JSON.stringify(config, null, 2));

module.exports = { config };
