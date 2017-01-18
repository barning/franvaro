var dotenv = require('dotenv').config();
var SlackBot = require('slackbots');
var low = require('lowdb')

var db = low('db.json');

// create a bot
var bot = new SlackBot({
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
  var dbUser = _user;
  var channel = _channel;

  if (db.get('absence').find({ user: dbUser }).value() == undefined) {
    db.get('absence').push({ user: dbUser}).value();
    bot.postMessage(channel, 'Ok, ' + dbUser + ' ich habe dich als abwesend eingetragen.');
  } else {
    bot.postMessage(channel, 'Hey, ' + dbUser + ' du bist schon in der Abwesenheitsliste.');
  }
}

function setOnline(_user, _channel) {
  var dbUser = _user;
  var channel = _channel;

  if (db.get('absence').find({ user: dbUser }).value() != undefined) {
    db.get('absence').remove({ user: dbUser }).value();
    bot.postMessage(channel, 'Ok, ' + dbUser + ' ich habe dich aus der Abwesenheitsliste ausgetragen.');
  } else {
    bot.postMessage(channel, 'Mhh, ' + dbUser + ' du scheinst nicht in der Abwesenheitsliste zu sein.');
  }
}

function postChannel(d){
  var channel = d.channel;
  if (d.text) {
    var msg = d.text;
  }
  if (d.content) {
    var msg= d.content;
  }
  if (msg){
    var user = checkUser(d.user);

    if (findWord('abwesend',msg) == true){
      setAway(user,channel);
    }

    if (findWord('anwesend',msg) == true) {
      setOnline(user,channel);
    }

    if (findWord('status',msg) == true){
      checkUserStatus(channel);
    }

    if ( findWord('status',msg) == false && findWord('anwesend',msg) == false && findWord('abwesend',msg) == false) {
      bot.postMessage(channel, 'hey, ' + user + ' ich habe dich nicht verstanden. Du kannst mir die Befehle "anwesend", "abwesend", oder "status" geben.');
    }

  }
}

function checkMention(d) {
  if (findWord(process.env.NAME.toLowerCase(), d.toLowerCase()) || findWord('@' + process.env.NAME.toLowerCase(), '@' + d.toLowerCase())) {
    return true;
  }
}

function checkUser(id) {
  var json = bot.getUsers()._value.members;
  for(var i = 0; i < json.length; i++) {
    var obj = json[i];
    if (obj.id == id) {
      return obj.name;
    }
  }
}

bot.on('message', function(data) {
  // all ingoing events https://api.slack.com/rtm
  console.log(data, data.user);
  if (data.type == 'message' && checkMention(data.text)) {
    postChannel(data);
  }

});
