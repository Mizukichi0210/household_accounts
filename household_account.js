var Botkit = require("botkit");
var mysql = require('mysql');
require('date-utils');
let now = new Date();
console.log(now.toFormat('M/D/YY'));

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

// ↓　コマンドの種類表示

controller.hears(["(help),(ヘルプ)"], ['direct_message'], (bot,message) =>{
	bot.reply(message,">目的\n支出金額\n>金額確認\n目的\n>ユーザ登録\n名前\n>help or ヘルプ");
});

// ↓　ユーザ登録の処理

controller.hears(["(ユーザ登録)"], ['direct_message'], (bot,message) =>{
	var userId;
	var name = message.text.split("\n")[1];
	
	//　↓　メッセージからユーザidの取得
	
	controller.storage.users.get(message.user, function (err, user_info) {
		if (!user_info) {
			user_info = {
				id: message.user,
            };
        }	
		controller.storage.users.save(user_info, function (err, id) {
		});
		
		//　↓　テーブルusersに登録されているかの確認。　なければ0、あれば1となる。　0の場合は2行目に入力された名前と一緒にテーブルusersにinsert。
		
		let confirm_users = "select count(*) as cnt from users where slack_id = ?";
		con.query(confirm_users,[user_info.id],function(err,result,fields){
			if(result[0].cnt == 0){
				if(name == undefined) bot.reply(message,"2行目に名前を書いて!");
				else{
					let register_users = "insert into users (slack_id,name) values (?,?)";
					con.query(register_users,[user_info.id,name],function(err,rows,firlds){
						bot.reply(message,"登録完了!");
					});
				}
			}
			else{
				bot.reply(message,"既に登録されてます～");
			}
		});
	});
});

// ↓　その他のメッセージが入力された場合の処理

controller.hears(["(.*)"], ['direct_message'], (bot,message) =>{
	bot.reply(message,"help or ヘルプ\n参照");
});