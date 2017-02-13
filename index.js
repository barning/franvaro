var dotenv = require('dotenv').config();
var SlackBot = require('slackbots');
var low = require('lowdb')

var db = low('db.json');

var params = {
    icon_emoji: ':palm_tree:'
};

var userListeners = [];

// create a bot
var bot = new SlackBot({
  token: process.env.TOKEN, // Add a bot https://my.slack.com/services/new/bot and put the token
  name: process.env.NAME
});

bot.on('start', function() {
  db.defaults({ absence: []})
  .value()
});

function setListener(user) {
  userListeners.push(user)
}

function removeListener(user) {
  var i = userListeners.indexOf(user);
  if(i != -1) {
    userListeners.splice(i, 1);
  }
}

function checkUserListener(user, text){
  var i = userListeners.indexOf(user);
  if(i != -1) {
    setNote(user, text);
  }
}

function setNote(dbUser, text) {
  if (findWord('status',text) || findWord('abwesend',text) || findWord('anwesend',text)) {
    console.log('Failed to set the status of ' + dbUser + ', because I found a keyword. I try again.');
    bot.postMessageToUser(dbUser, 'Sorry, ' + dbUser + ' kannst du mir bitte einen Satz ohne "status", "abwesend", oder "anwesend" schreiben? Ich komme sonst durcheinander.', params);
  }
  if (!findWord('status',text) && !findWord('abwesend',text) && !findWord('anwesend',text) && findWord('nein',text)) {
    console.log(dbUser + ' wants no note.');
    db.get('absence').push({ user: dbUser }).value();
    removeListener(dbUser);
    bot.postMessageToUser(dbUser, 'Ok, ' + dbUser + ' ich habe dich als abwesend eingetragen. Bis dann!', params);
  }
  if (!findWord('nein',text) && !findWord('status',text) && !findWord('abwesend',text) && !findWord('anwesend',text)) {
    console.log(dbUser + ' has a note and is on the list.');
    db.get('absence').push({ user: dbUser, note: text}).value();
    removeListener(dbUser);
    bot.postMessageToUser(dbUser, 'Ok, ' + dbUser + ' ich habe dich als abwesend eingetragen. Bis dann!', params);
  }
}

function findWord(word, str) {
  return str.split(' ').some(function(w){
    return w === word
  })
}

function returnAbsenceList() {
  var list = [];
  for (var i = 0; i < db.get('absence').size().value(); i++) {
    if (db.get('absence[' + [i] + '].user').value()) {
      list.push('\n' + db.get('absence[' + [i] + '].user').value());
    }
    if (db.get('absence[' + [i] + '].note').value()) {
      list.push(' Mit der Notiz: ' + db.get('absence[' + [i] + '].note').value());
    }
  }
  return list;
}

function checkUserStatus(c) {
  console.log('Check user Status in ' + c);
  if (db.get('absence').map('user').value() != undefined) {
    bot.postMessage(c, 'Diese Personen sind abwesend: ' + returnAbsenceList(), params);
  } else {
    bot.postMessage(c, 'Es ist niemand Abwesend', params);
  }
}

function setAway (_user, _channel) {
  var dbUser = _user;
  var channel = _channel;

  console.log('Setting ' + _user + ' as away in channel ' + _channel);

  if (db.get('absence').find({ user: dbUser }).value() == undefined) {
    bot.postMessageToUser(_user, 'Hey, bitte schreibe mir noch eine Abwesenheitsnotiz. Danach wirst du als "Abwesend" eingetragen. Um keine Notiz zu hinterlassen, scheibe einfach "Nein".', params).then(function(data) {
      setListener(dbUser);
    });
  } else {
    bot.postMessage(channel, 'Hey, ' + dbUser + ' du bist schon in der Abwesenheitsliste.', params);
  }
}

function setOnline(_user, _channel) {
  var dbUser = _user;
  var channel = _channel;

  console.log('Setting ' + _user + ' as online in channel ' + _channel);

  if (db.get('absence').find({ user: dbUser }).value() != undefined) {
    db.get('absence').remove({ user: dbUser }).value();
    bot.postMessage(channel, 'Ok, ' + dbUser + ' ich habe dich aus der Abwesenheitsliste ausgetragen.', params);
  } else {
    bot.postMessage(channel, 'Mhh, ' + dbUser + ' du scheinst nicht in der Abwesenheitsliste zu sein.', params);
  }
}

function otherUserMention(d) {
  var json = bot.getUsers()._value.members;
  var mention = { bool:false, name: undefined };

  for(var i = 0; i < json.length; i++) {
    var name = json[i].name;
    console.log(json[i], 'frommention');
    if (findWord(name,d)) {
      console.log('true');
      mention.bool= true;
      mention.name= name;
    }
    else {
      mention.bool = false;
      console.log('false');
    }

    return mention;
  }
}

function findKeyWords(msg, channel, user) {
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
    console.log('Error in channel ' + channel + ' with user ' + user);
    bot.postMessage(channel, 'hey, ' + user + ' ich habe dich nicht verstanden. Du kannst mir die Befehle "anwesend", "abwesend", oder "status" geben.', params);
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
    if (otherUserMention(msg).bool) {
      console.log('otheruser');
      findKeyWords(msg, channel, otherUserMention(msg).name);
    } else {
      var user = checkUser(d.user);
      findKeyWords(msg, channel, user);
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
  if (data.type == 'message' && checkMention(data.text)) {
    postChannel(data);
  }

  if (data.type == 'message') {
    checkUserListener(checkUser(data.user), data.text);
  }
});
