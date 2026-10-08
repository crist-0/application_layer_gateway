const fs = require('node:fs/promises');

const fsSync = require('node:fs');

const path = require('node:path');

const { config } = require("../config/configLoader");

const LOG_DIR = path.join(__dirname, 'data');
const LOG_FILE = path.join(LOG_DIR, 'events.log');

if (!fsSync.existsSync(LOG_DIR)) {
  fsSync.mkdirSync(LOG_DIR, { recursive: true });
}

let logQueue = [];

const logEvent = (event) => {
  if (logQueue.length == config.logger.maxQueueSize) {
    logQueue.shift();
  }
  if (logQueue.length < config.logger.maxQueueSize ) {
    logQueue.push(event);
  }
}


const flush = async () => {
  if (logQueue.length == 0) {
    return;
  } else {
    let totalLog = "";
    const newQueue = logQueue.splice(0, logQueue.length);
    for (const log of newQueue) {
      totalLog += JSON.stringify(log) + "\n";
    }
    try {
      await fs.appendFile(LOG_FILE, totalLog);
    } catch (err) {
      console.error("Error writing to the log : ", err);
    }

  }
}


setInterval(flush, config.logger.flushIntervalMs);


const buildBaseEvent = (req) => {

  const pathname = req.url.split('?')[0];
  const method = req.method;
  const timestamp = Date.now();
  const ipAddress = req.socket.remoteAddress;

  return {
    ip: ipAddress,
    timestamp: timestamp,
    method: method,
    path: pathname
  }

}


module.exports = {
  logEvent,
  buildBaseEvent
};
