var Botkit = require("botkit");
var mysql = require('mysql');
require('date-utils');
let now = new Date();

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

/*
function search_purpose_id(purpose){
	var confirm_users = "select * from users where slack_id = ?";
	con.query(confirm_users,[user_info.id],function(err,res,fields){
		if(res[0].id == undefined) return bot.reply()
	});
}
*/

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

//　↓　支出登録の処理

controller.hears(["(支出登録)"], ['direct_message'], (bot,message) =>{
	var expenditure = message.text.split("\n")[1];
	var purpose = message.text.split("\n")[2];
	
	// ↓ 金額と目的が入力されているかのチェック
	
	if(expenditure == undefined || purpose == undefined) bot.reply(message,">2行目:金額\n>3行目:目的");
	else{
		//　↓　user_info.idの取得
		
		controller.storage.users.get(message.user, function (err, user_info) {
			if (!user_info) {
				user_info = {
					id: message.user,
				};
			}	
			controller.storage.users.save(user_info, function (err, id) {
			});
			// ↓ usersからuseridを取得
			var confirm_users = "select * from users where slack_id = ?";
			con.query(confirm_users,[user_info.id],function(err,res,fields){
				if(res[0].id == undefined) return bot.reply(message,"入力した目的がテーブルに登録されてません!");
				else{
					
					// ↓ purposeテーブルからpurpose_idを取得
		
					var getPurposeId = "select * from purpose where purpose = ?";
					con.query(getPurposeId,[purpose],function(err,result){
						if(result[0].id == undefined) return bot.reply(message,"")
			
						// ↓ expenditureテーブルへinsert
				
						var registerExpenditure = "insert into expenditure (expenditure,purpose_id,user_id,date) values (?,?,?,?)";
						con.query(registerExpenditure,[expenditure,result[0].id,res[0].id,now.toFormat('YYYY-MM-DD')],function(err,row){
							bot.reply(message,"登録完了しました!");
						});
					});
				}
			});
		});
	}
});

// ↓　その他のメッセージが入力された場合の処理

controller.hears(["(.*)"], ['direct_message'], (bot,message) =>{
	bot.reply(message,"help or ヘルプ\n参照");
});