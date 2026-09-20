const matchesAnyPattern = (str, patterns) => {

  let res = false;

  for (const pattern of patterns) {
    const result = pattern.test(str);
    if (result) {
      res = true;
      break;
    }
  }

  return res;

}

const injectionFilter = async (req, body) => {

  const patterns = [
    // SQL Injection
    /(?:'|")\s*(?:or|and)\s+(?:\d+\s*=\s*\d+|'[^']*'\s*=\s*'[^']*')/i,
    /(?:'|")\s*(?:or|and)\s+(?:\d+\s*=\s*\d+|'[^']*'\s*=\s*'[^']*)/i,
    /\bunion\s+(?:all\s+)?select\b/i,
    /\b(?:select|insert|update|delete)\b.{0,100}\b(?:from|into|set|where)\b/i,
    /\b(?:sleep|pg_sleep|benchmark)\s*\(/i,
    /\bwaitfor\s+(?:delay|time)\b/i,
    /(?:--|#|\/\*)/i,

    // XSS
    /<\s*script\b/i,
    /\b(?:javascript|vbscript)\s*:/i,
    /\bon[a-z]+\s*=/i,
    /<\s*\/?\s*(?:iframe|object|embed|svg|math)\b/i,
    /<[^>]+\bon[a-z]+\s*=/i
  ];

  let decodedUrl;

  try {
    decodedUrl = decodeURIComponent(req.url);
  } catch (err) {
    return {
      pass: false,
      status: 403,
      message: "Request blocked: suspicious activity detected."
    };
  }

	console.log('Checking URL:', decodedUrl);


  if (matchesAnyPattern(body,patterns) || matchesAnyPattern(decodedUrl,patterns)) {
    return {
      pass: false,
      status: 403,
      message: "Request blocked: suspicious activity detected."
    }
  } else {
    return {
      pass: true
    }
  }
}

module.exports = {
  injectionFilter
}
