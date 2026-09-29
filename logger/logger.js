const fs = require('node:fs/promises');
const path = require('node:path');

const MAX_QUEUE_SIZE = 300;
const FLUSH_INTERVAL_MS = 15000;
const LOG_FILE = path.join(__dirname, 'events.log');

let logQueue = [];

const logEvent = (event) => {
  if (logQueue.length == MAX_QUEUE_SIZE) {
    logQueue.shift();
  }
  if (logQueue.length < MAX_QUEUE_SIZE ) {
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


setInterval(flush, FLUSH_INTERVAL_MS);


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
