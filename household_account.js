var Botkit = require("botkit");
var mysql = require('mysql');

var con = mysql.createConnection({
  host     : 'localhost',
  user     : 'test',
  password : 'test',
  database : 'household_account',
  timezone : 'jst'
});

var controller = Botkit.slackbot({
  debug: false       
  // include "log: false" to disable logging
  // or a "logLevel" integer from 0 to 7 to adjust logging verbosity
})

controller.spawn({
    token : process.env.token
}).startRTM();

controller.hears(["(help),(ヘルプ)"], ['direct_message'], (bot,message) =>{
	bot.reply(message,">目的\n支出金額\n>金額確認\n目的\n>ユーザ登録\n名前\n>help or ヘルプ");
});

controller.hears(["(.*)"], ['direct_message'], (bot,message) =>{
	bot.reply(message,"");
});