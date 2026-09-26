const StateStatus = Object.freeze({
  OPEN: "OPEN",
  CLOSED: "CLOSED",
  HALF_OPEN: "HALF_OPEN"
})


const COOLDOWN_MS = 10000
const FAILURE_THRESHOLD = 5

const CircuitDS = {
  state: StateStatus.CLOSED,
  consecutiveFailures: 0,
  openedAt: null
};

const canRequest = (req) => {
  let response;
  console.log(`[canRequest] state=${CircuitDS.state} consecutiveFailures=${CircuitDS.consecutiveFailures} openedAt=${CircuitDS.openedAt}`);
  if (CircuitDS.state === StateStatus.CLOSED) {
    response = {
      pass: true
    }
  } else if (CircuitDS.state === StateStatus.OPEN) {
    if (Date.now() - CircuitDS.openedAt >= COOLDOWN_MS) {
      CircuitDS.state = StateStatus.HALF_OPEN
      response = {
        pass: true
      }
    } else {
      response = {
        pass: false,
        status: 503,
        message: "Service temporarily unavailable"
      }
    }
  } else if (CircuitDS.state === StateStatus.HALF_OPEN) {
    response = {
      pass: true
    }
  }
  return response;
}


const recordSuccess = () => {
  if (CircuitDS.state === StateStatus.CLOSED) {
    CircuitDS.consecutiveFailures = 0;
  } else if (CircuitDS.state === StateStatus.HALF_OPEN) {
    CircuitDS.state = StateStatus.CLOSED;
   CircuitDS.consecutiveFailures = 0;
    CircuitDS.openedAt = null;
  }
}

const recordFailure = () => {
  console.log(`[recordFailure] BEFORE state=${CircuitDS.state}`);
  if (CircuitDS.state === StateStatus.CLOSED) {
    CircuitDS.consecutiveFailures += 1;
    if (CircuitDS.consecutiveFailures >= FAILURE_THRESHOLD) {
      CircuitDS.state = StateStatus.OPEN;
      CircuitDS.openedAt = Date.now();
    }
  } else if (CircuitDS.state == StateStatus.HALF_OPEN) {
    CircuitDS.openedAt = Date.now();
    CircuitDS.state = StateStatus.OPEN;
  }
  console.log(`[recordFailure] AFTER state=${CircuitDS.state} openedAt=${CircuitDS.openedAt}`);
}

module.exports = {
  canRequest,
  recordFailure,
  recordSuccess
}
