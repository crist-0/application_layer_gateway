require('dotenv').config();
const path = require('node:path');
const express = require('express');
const session = require('express-session');
const fs = require('fs');

const app = express();

app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));


function requireLogin(req, res, next) {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect('/login');
  }
}

function readEvents() {

  const LOG_FILE = path.join(__dirname, '..', 'logger', 'events.log');


  let data;
  try {
      data = fs.readFileSync(LOG_FILE, 'utf8');
      console.log("File content:", data);
  } catch (err) {
    console.error("Error reading file:", err);
    return [];
  }

  let strArr = data.split('\n');
  let eventObjs = [];

  for (const strs of strArr) {
    if (strs == '')
      {
        continue;
      }
    try {
        eventObjs.push(JSON.parse(strs));
    }
    catch (err) {
      console.warn("Skipping malformed log line:", err.message);
    }
  }
  return eventObjs;
}


app.get('/login', (req, res) => {
  res.send(`
    <form method="POST" action="/login">
      <input type="text" name="username" placeholder="Username" required />
      <input type="password" name="password" placeholder="Password" required />
      <button type="submit">Log in</button>
    </form>
  `);
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === process.env.DASHBOARD_USER && password === process.env.DASHBOARD_PASS) {
    req.session.loggedIn = true;
    res.redirect('/dashboard');
  } else {
    res.send('Invalid credentials. <a href="/login">Try again</a>');
  }
});


app.get('/dashboard', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/api/events', requireLogin, (req, res) => {
  const events = readEvents();

  const filtered = events.filter((event) => {
    const ipMatch = !req.query.ip || event.ip === req.query.ip;
    const typeMatch = !req.query.type || event.type === req.query.type;
    const sinceMatch = !req.query.since || Number(event.timestamp) > Number(req.query.since);
    return ipMatch && typeMatch && sinceMatch;
  });

  res.json(filtered);

});



app.listen(3001, () => {
  console.log('Dashboard server running on http://localhost:3001');
});
