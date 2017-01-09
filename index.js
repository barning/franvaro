var dotenv = require('dotenv').config();
const SlackBot = require('slackbots');
const low = require('lowdb')

var db = low('db.json');

// create a bot
const bot = new SlackBot({
  token: process.env.TOKEN, // Add a bot https://my.slack.com/services/new/bot and put the token
  name: process.env.NAME
});

bot.on('start', function() {
  db.defaults({ absence: []})
  .value()
});

function findWord(word, str) {
  return str.split(' ').some(function(w){return w === word})
}

function checkUserStatus(c) {
  if (db.get('absence').map('user').value() != undefined) {
    bot.postMessage(c, 'Diese Personen sind abwesend: ' + db.get('absence').map('user').value());
  } else {
    bot.postMessage(c, 'Es ist niemand Abwesend');
  }
}

function setAway (_user, _channel) {
  let dbUser = _user;
  let channel = _channel;

  if (db.get('absence').find({ user: dbUser }).value() == undefined) {
    db.get('absence').push({ user: dbUser}).value();
    bot.postMessage(channel, 'Ok, ' + dbUser + ' ich habe dich als abwesend eingetragen.');
  } else {
    bot.postMessage(channel, 'Hey, ' + dbUser + ' du bist schon in der Abwesenheitsliste.');
  }
}

function setOnline(_user, _channel) {
  let dbUser = _user;
  let channel = _channel;

  if (db.get('absence').find({ user: dbUser }).value() != undefined) {
    db.get('absence').remove({ user: dbUser }).value();
    bot.postMessage(channel, 'Ok, ' + dbUser + ' ich habe dich aus der Abwesenheitsliste ausgetragen.');
  } else {
    bot.postMessage(channel, 'Mhh, ' + dbUser + ' du scheinst nicht in der Abwesenheitsliste zu sein.');
  }
}

function postChannel(d){
  let channel = d.channel;
  if (d.content){
    let user = d.content.substring(0, d.content.indexOf(':'));

    if (findWord('abwesend',d.content) == true){
      setAway(user,channel);
    }

    if (findWord('anwesend',d.content) == true) {
      setOnline(user,channel);
    }

    if (findWord('status',d.content) == true){
      checkUserStatus(channel);
    }

    if ( findWord('status',d.content) == false && findWord('anwesend',d.content) == false && findWord('abwesend',d.content) == false) {
      bot.postMessage(channel, 'hey, ' + user + ' ich habe dich nicht verstanden. Du kannst mir die Befehle "anwesend", "abwesend", oder "status" geben.');
    }

  }
}

bot.on('message', function(data) {
  // all ingoing events https://api.slack.com/rtm
  if (data.type == 'desktop_notification'){
    postChannel(data);
  }

});
