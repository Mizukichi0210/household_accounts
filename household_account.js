'use strict';
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

controller.spawn({
    token : process.env.token
}).startRTM();

// ↓　コマンドの種類表示

controller.hears(["(help)","(ヘルプ)"], ['direct_message'], (bot,message) =>{
	bot.reply(message,">支出記録 or 支出登録 or 登録 or 記録\n支出金額\n目的\n>支出確認 or 確認\n目的\n>ユーザ登録\n名前\n>目的 or 目的確認 or 目的一覧\n>help or ヘルプ");
});

// ↓　ユーザ登録の処理

controller.hears(["(ユーザ登録)"], ['direct_message'], (bot,message) =>{
	var userId;
	var slackId;
	var name = message.text.split("\n")[1];
	
	//　↓　メッセージからユーザidの取得
	
	controller.storage.users.get(message.user, function (err, user_info) {
		if (!user_info) {
			user_info = {
				id: message.user,
            };
        }	
		controller.storage.users.save(user_info, function (err, id) {
			slackId = user_info.id;
		});
	});
	
	//　↓　テーブルusersに登録されているかの確認。　なければ0、あれば1となる。　0の場合は2行目に入力された名前と一緒にテーブルusersにinsert。
		
	let confirm_users = "select count(*) as cnt from users where slack_id = ?";
	con.query(confirm_users,[slackId],function(err,result,fields){
		if(result[0].cnt == 0){
			if(name == undefined) bot.reply(message,"2行目に名前を書いて!");
			else{
				let register_users = "insert into users (slack_id,name) values (?,?)";
				con.query(register_users,[slackId,name],function(err,rows,firlds){
					bot.reply(message,"登録完了!");
				});
			}
		}
		else{
			bot.reply(message,"既に登録されてます～");
		}
	});
});

//　↓　支出登録の処理

controller.hears(["(支出登録)","(支出記録)","(登録)","(記録)"], ['direct_message'], (bot,message) =>{
	var expenditure = message.text.split("\n")[1];
	var purpose = message.text.split("\n")[2];
	var slackId;
	let now = new Date();
	
	// ↓ 金額と目的が入力されているかのチェック
	
	if(expenditure == undefined || purpose == undefined) bot.reply(message,"2行目:*金額*\n3行目:*目的*");
	else{
		if(!isNaN(expenditure)){
			//　↓　user_info.idの取得
		
			controller.storage.users.get(message.user, function (err, user_info) {
				if (!user_info) {
					user_info = {
						id: message.user,
					};
				}
				controller.storage.users.save(user_info, function (err, id) {
					slackId = user_info.id;
				});
			});
				
			// ↓ usersからuseridを取得
				
			var confirm_users = "select *,count(*) as countUsers from users where slack_id = ?";
			con.query(confirm_users,[slackId],function(err,res,fields){
				
				if(res[0].countUsers == 0){
					bot.reply(message, "ユーザデータが登録されていません");
					return;
				}
				
				var userId = res[0].id;
				
				// ↓ purposeテーブルからpurpose_idを取得
							
				var getPurposeId = "select *,count(*) as cnt from purpose where purpose = ?";
				con.query(getPurposeId,[purpose],function(err,result){
					
					if(result[0].cnt == 0){
						bot.reply(message,"目的がテーブルに登録されてません!");
						return;
					}
					
					var purposeId = result[0].id;
					
					// ↓ expenditureテーブルへinsert
				
					var registerExpenditure = "insert into expenditure (expenditure,purpose_id,user_id,date) values (?,?,?,?)";
					con.query(registerExpenditure,[expenditure,purposeId,userId,now.toFormat('YYYY-MM-DD')],function(err,row){
						bot.reply(message,"登録完了しました!");
					});
				});
			});
		}
	}
});

// ↓　登録した支出の確認。目的はあってもなくてもok

controller.hears(["(支出確認)","(確認)"],['direct_message'],(bot,message)=>{
	var purpose = message.text.split("\n")[1];
	var slackId;
	
	controller.storage.users.get(message.user, function (err, user_info) {
		if (!user_info) {
			user_info = {
				id: message.user,
			};
		}
		controller.storage.users.save(user_info, function (err, id) {
			slackId = user_info.id;
		});
	});
	
	var getUsersId = "select * from users where slack_id = ?";
	con.query(getUsersId,[slackId],function(err,result,fields){
			
			
		var userId = result[0].id;
		// ↓ 目的指定なしの使用金額確認
			
		if(purpose == undefined){
			let getExpenditure = "select purpose_id,sum(expenditure) as exp from expenditure where user_id = ? group by purpose_id";
			con.query(getExpenditure,[userId],function(err,rows,fields){
				for(let i in rows){
					let getPurpose = "select * from purpose where id = ?";
					con.query(getPurpose,[rows[i].purpose_id],function(err,res,fields){
						bot.reply(message,res[0].purpose + " : *" + rows[i].exp + "* 円\n");
					});
				}
			});
		}
			
		// ↓ 目的指定ありの使用金額確認
			
		else{
			let getPurposeId = "select *,count(*) as cntPurpose from purpose where purpose = ?";
			con.query(getPurposeId,[purpose],function(err,rows,fields){
				
				// ↓ 目的がテーブルに登録されていた場合
					
				if(rows[0].cntPurpose != 0){
					let getExpenditure = "select *,count(*) as cnt,sum(expenditure) as exp from expenditure where user_id = ? and purpose_id = ?";
					con.query(getExpenditure,[result[0].id,rows[0].id],function(err,res,fields){
						if(res[0].cnt != 0) bot.reply(message,"*" + res[0].exp + "* 円");
						else bot.reply(message,"*0* 円");
					});
				}
				
				// ↓　目的がテーブルに登録されていなかった場合
				
				else{
					bot.reply(message,"*0* 円");
				}
			});
		}
	});
});

// ↓　目的一覧表示

controller.hears(["(目的)","(目的確認)","(目的一覧)"],['direct_message'],(bot,message) =>{
	let getPurpose = "select * from purpose";
	con.query(getPurpose,function(err,result,fields){
		for(let i in result){
			bot.reply(message,result[i].purpose);
		}
	});
});

// ↓　その他のメッセージが入力された場合の処理

controller.hears(["(.*)"], ['direct_message'], (bot,message) =>{
	bot.reply(message,"*help or ヘルプ*\nを参照してください");
});