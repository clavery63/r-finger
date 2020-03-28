const express = require('express');
const request = require('request');
const axios = require('axios');
const bodyParser = require('body-parser')

const Game = require('./game');
 
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const oAuthToken = process.env.AUTH_TOKEN;

console.log(clientId)
console.log(clientSecret)
console.log(oAuthToken)


const PORT=4390;

const app = express();
const { get, post } = axios.create({
  baseURL: 'https://slack.com/api/',
  headers: {
    'Content-type': 'application/json',
    'Authorization': `Bearer ${oAuthToken}`
  }
});

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.listen(PORT, function () {
  console.log('Example app listening on port ' + PORT);
});

app.get('/', function(req, res) {
  res.send('R Finger base path: ' + req.url);
});

app.get('/oauth', function(req, res) {
  if (!req.query.code) {
    res.status(500);
    res.send({'Error': 'Looks like we\'re not getting code.'});
    console.log('Looks like we\'re not getting code.');
  } else {
    request({
      url: 'https://slack.com/api/oauth.access',
      qs: {code: req.query.code, client_id: clientId, client_secret: clientSecret},
      method: 'GET',
    }, function (error, response, body) {
      if (error) {
        console.log(error);
      } else {
        res.json(body);
      }
    })
  }
});

const games = new Map();

app.post('/event', function(req, res) {
  if (req.body.challenge) {
    res.status(200);
    res.send(req.body.challenge);
    console.log('challenge accepted');
  } else {
    const { event } = req.body;
    if (games.has(event.channel) && !event.bot_id) {
      games.get(event.channel).receiveEvent(event);
    }
    res.sendStatus(200);
  }
});

const makeSay = channel => (text, delay = 1000) => new Promise(resolve => {
  post('/chat.postMessage', {
    channel,
    text
  });

  setTimeout(resolve, delay);
});

const makeEnd = channel => () => {
  games.delete(channel);
};

app.post('/command', function(req, res) {
  const { channel_id, text, user_id } = req.body;

  if (text === 'stop' && games.has(channel_id)) {
    games.delete(channel_id);
    res.send('Game ended.');
  } else if (text === 'stop' && !games.has(channel_id)) {
    res.send('No one is playing R Finger here.');
  } else if (text === 'start' && games.has(channel_id)) {
    res.send('A game is already underway in this channel.');
  } else if (text === 'start') {
    games.set(channel_id, new Game(makeSay(channel_id), makeEnd(channel_id), user_id));
    res.send('Game started successfully!');
  } else {
    res.send('Looks like you\'re trying to play a game of R Finger! Usage:\n\`/rfinger start\`: Start a game of R Finger.\n\`/rfinger stop`\: Stop a game of R Finger.\n');
  }
});
