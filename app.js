var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var request = require('request');

//mongooseの読み込み
var mongoose = require( 'mongoose' );

//Modelの設定
//var db = require('./model/database');
var model = require('./model');
var Post = model.Post;

//日付
require('date-utils');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'jade');
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);
//正規表現使える？
app.use('/form', routes);
app.use('/create', routes);
app.use('/edit', routes);
app.use('/delete', routes);
app.use('/addMenu', routes);
app.use('/deleteMenu', routes);
app.use('/room', routes);

//cron
var myCron = require('cron').CronJob;
var room_id = "---";
var Token = "---";
var job = new myCron(
  '0,7,14,21,28,35,42,49,56 * 9-20 * * *',
  function(){
    var options = {
      url: 'https://api.chatwork.com/v1/rooms/' + room_id + '/messages?force=0',
      method: 'GET',
      headers: {
        'X-ChatWorkToken': Token
      }
    };
    request(options, function(error, response, body) {
      //console.log("result:");
      if (!error && response.statusCode == 200) {
        //console.log("success");
        //console.log(body) // Show the HTML for the Google homepage.
        var items = JSON.parse(body);
        //@bentooがあるか判定
        items.forEach(function(item){
          //コマンド入力の受付。時間外の時は警告する。
          if(item.body.match(/\@/)){
            var now = new Date();
            if ( now.getHours() >= 20 ){
              var confirmText = "[To:" + item.account.account_id + "]" + "受付時間外です。17:00までに注文してください。";
              //注文処理
              var options = {
                url: 'https://api.chatwork.com/v1/rooms/27496495/messages',
                method: 'POST',
                headers: {
                  'X-ChatWorkToken': Token
                },
                form: {
                  body:confirmText
                }
              };
              request(options, function(error, response, body) {
                if(error){
                  console.log(error);
                }
              });
            } else {
              if (item.body.match(/\@list/)) {
                console.log("リストを呼び出す");
                //Callendar出力する。
                var cutoff = new Date();
                var gt = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate());
                var lt = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate() + 1); 
                Post.find({created: {$gte: gt, $lt: lt}}, 
                  null,
                  {sort: {text: -1}},
                  function(err, bentoos){
                  //今日の日付を取得する。
                  var dt = new Date();
                  dt.setDate(dt.getDate() + 1);
                  var formatted = dt.toFormat("YYYY年MM月DD日");
                  var messageBody = "[To:" + item.account.account_id + "]" + "明日(" + formatted + ")の献立\n"
                  //献立リストの文字列作成
                  var list_num = 0;
                  bentoos.forEach(function(bentoo){
                    console.log(bentoo.text);
                    list_num ++;
                    messageBody += list_num +", " + bentoo.text + " - " + bentoo.price + "円\n";     
                  })
                  var options = {
                    url: 'https://api.chatwork.com/v1/rooms/27496495/messages',
                    method: 'POST',
                    headers: {
                      'X-ChatWorkToken': Token
                    },
                    form: {
                      body:messageBody
                    }
                  };
                  request(options, function(error, response, body) {
                    if (!error && response.statusCode == 200) {
                      //投稿が成功
                      //console.log("献立の投稿が成功しました。");
                    } else {
                      //error
                      console.log("献立の投稿が失敗しました。" + response.statusCode + error);
                    }
                  })
                })
              }
              if (item.body.match(/\@order/)) {
                //console.log("注文処理");
                var orderNum = item.body.match(/\d+/);
                console.log("注文番号:" + orderNum);
                var cutoff = new Date();
                var gt = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate());
                var lt = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate() + 1); 
                Post.find(
                  {created: {$gte: gt, $lt: lt}},
                  null,
                  {sort: {text: -1}},
                  function(err, bentoos){
                  var list_num = 0;
                  bentoos.forEach(function(bentoo){
                    //既に同じ弁当を注文していたら注文できないようにする。
                    //console.log(bentoo);
                    list_num ++ ;
                    console.log("弁当リスト: " + list_num + "," + bentoo.text);
                    //countの位置を代えたら良いのでは
                      if (orderNum == list_num) {
                        Post.count({_id: bentoo._id, order_user: item.account.name}, function(err, count){
                        if(count == 0) {
                          console.log( bentoo.text + "が仮注文されました。");
                          var confirmText = "[To:" + item.account.account_id + "]" + bentoo.text + "で宜しいですか？(yes/no)";
                          //注文処理
                          var options = {
                            url: 'https://api.chatwork.com/v1/rooms/27496495/messages',
                            method: 'POST',
                            headers: {
                              'X-ChatWorkToken': Token
                            },
                            form: {
                              body:confirmText
                            }
                          };
                          request(options, function(error, response, body) {
                            if (!error && response.statusCode == 200) {
                              //投稿が成功
                              //仮注文状態にする。
                              var arrayUser = bentoo.pre_order_user;//array
                              arrayUser.push(item.account.name);
                              Post.update(
                                { _id: bentoo._id },
                                { $set: {pre_order_user: arrayUser }},
                                { upsert: false, multi: false }, function(err) {
                                  if (err) {
                                    console.log(err);
                                  } 
                                }
                              );
                              //user情報
                              //console.log(item.account.name + "さん: message_id" + item.message_id + " : account_id" + item.account.account_id);
                            } else {
                              //error
                              console.log("献立の投稿が失敗しました。" + response.statusCode + error);
                            }
                          })
                        } else {
                          console.log("あなたは既に注文済みです。");
                          var confirmText = "[To:" + item.account.account_id + "]" + "あなたは既に" + bentoo.text + "を注文済みです。";
                          //chatworkに送信
                          //注文処理
                          var options = {
                            url: 'https://api.chatwork.com/v1/rooms/27496495/messages',
                            method: 'POST',
                            headers: {
                              'X-ChatWorkToken': Token
                            },
                            form: {
                              body:confirmText
                            }
                          };
                          request(options, function(error, response, body) {
                            if (!error && response.statusCode == 200) {
                              //投稿が成功
                              //仮注文状態にする。
                            } else {
                              //error
                              console.log("重複の投稿が失敗しました。" + response.statusCode + error);
                            }
                          })
                        }
                      });
                    }
                  })
                })
              }
              //注文済みの商品を確認できる。
              if(item.body.match(/\@ol/)){
                var cutoff = new Date();
                var gt = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate());
                var lt = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate() + 1); 
                Post.find(
                  {order_user: item.account.name, created: {$gte: gt, $lt: lt}},
                  null,
                  {sort: {created: -1}},
                  function(err, bentoos){
                  var dt = new Date();
                  var formatted = dt.toFormat("YYYY年MM月DD日");
                  var orderList = "[To:" + item.account.account_id + "]" + formatted + "にあなたが注文した商品はコチラ。\n\n";
                  var num = 0;
                  bentoos.forEach(function(bentoo){
                    num ++ ;
                    orderList += num+ ", " + bentoo.text + "\n";
                  });
                  orderList += "\n@del {番号} で消すことができます。"
                  var options = {
                    url: 'https://api.chatwork.com/v1/rooms/27496495/messages',
                    method: 'POST',
                    headers: {
                      'X-ChatWorkToken': Token
                    },
                    form: {
                      body:orderList
                    }
                  };
                  request(options, function(error, response, body) {
                    if (!error && response.statusCode == 200) {
                      //投稿が成功
                    } else {
                      //error
                      console.log("重複の投稿が失敗しました。" + response.statusCode + error);
                    }
                  })
                })
              }

              if (item.body.match(/\@del/)) {
                var delNum = parseInt(item.body.match(/\d+/));
                Post.find(
                  {order_user: item.account.name}, 
                  null,
                  {sort: {created: -1}},
                  function(err, bentoos){
                  var listNum = 0;
                  bentoos.forEach(function(bentoo){
                    listNum ++;
                    //console.log(listNum);
                    if(delNum == listNum){
                      //注文から名前を外す。今日の注文のみ　
                      var cutoff = new Date();
                      var gt = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate());
                      var lt = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate() + 1); 
                      Post.find ({_id: bentoo._id, created: {$gte: gt, $lt: lt}}, function(err, bentoos2) {
                        bentoos2.forEach(function(bentoo2) {
                            var arrayPreUser = bentoo2.order_user;
                            var i = 0;
                          arrayPreUser.forEach(function(User){
                            if(arrayPreUser[i] == User){
                              arrayPreUser.splice(i, 1);
                            }
                            i++;
                          })
                          Post.update(
                            { _id: bentoo2._id },
                            { $set: 
                              {order_user: arrayPreUser }
                            },
                            { upsert: false, multi: false }, function(err) {
                              if (err) {
                                console.log(err);
                              }
                              //message
                              var orderText = "[To:" + item.account.account_id + "]" + bentoo2.text + "を注文から削除しました。";
                              var options = {
                                url: 'https://api.chatwork.com/v1/rooms/27496495/messages',
                                method: 'POST',
                                headers: {
                                  'X-ChatWorkToken': Token
                                },
                                form: {
                                  body:orderText
                                }
                              };
                              //APIへ投稿
                              request(options, function(error, response, body) {
                                if(error){
                                  console.log(error);
                                }
                              });
                            })
                        });
                      });
                    }
                  })
                })
              }

              if(item.body.match(/\@yes/)){
                //pre_order_userに名前が入っていなければこの処理はできないようにする。
                var cutoff = new Date();
                var gt = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate());
                var lt = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate() + 1);
                Post.find({pre_order_user: item.account.name, created: {$gte: gt, $lt: lt}}, function(err, bentoos){
                  bentoos.forEach(function(bentoo){
                    if (!err) {
                      //注文確定処理
                      var orderText = "[To:" + item.account.account_id + "]" + item.account.name + "さん、" + bentoo.text + "の注文を承りました。";
                      var options = {
                        url: 'https://api.chatwork.com/v1/rooms/27496495/messages',
                        method: 'POST',
                        headers: {
                          'X-ChatWorkToken': Token
                        },
                        form: {
                          body:orderText
                        }
                      };
                      //APIへ投稿
                      request(options, function(error, response, body) {
                        if (!error && response.statusCode == 200) {
                          //注文確定処理
                          //user情報
                          //注文確定状態にする。
                          var arrayUser = bentoo.order_user;//array
                          arrayUser.push(item.account.name);
                          Post.update(
                            { _id: bentoo._id },
                            { $set: 
                              {order_user: arrayUser }
                            },
                            { upsert: false, multi: false }, function(err) {
                              if (err) {
                                console.log(err);
                              } 
                            }
                          );
                          //仮注文から名前を外す
                          Post.find({_id: bentoo._id}, function(err, bentoos2){
                            bentoos2.forEach(function(bentoo2){
                              var arrayPreUser = bentoo2.pre_order_user;
                              var i = 0;
                              arrayPreUser.forEach(function(User){
                                if(arrayPreUser[i] == User){
                                  arrayPreUser.splice(i, 1);
                                }
                                i++;
                              })
                              Post.update(
                                { _id: bentoo2._id },
                                { $set: 
                                  {pre_order_user: arrayPreUser }
                                },
                                { upsert: false, multi: false }, function(err) {
                                  if (err) {
                                    console.log(err);
                                  }
                                }
                              );
                            })
                          });
                          console.log(item.account.name + "さん: message_id" + item.message_id + " : account_id" + item.account.account_id);
                        } else {
                          //error
                          console.log("献立の投稿が失敗しました。" + response.statusCode + error);
                          //再入力を促す。
                          console.log("もう一度入力してください。" + response.statusCode + error);
                        }
                      })
                    } else {
                      console.log("仮注文弁当の取得に失敗しました。");
                    }
                  })
                })
              }

              if (item.body.match(/\@no/)) {
                //仮注文破棄処理
                //@noは全てをキャンセルする。
                var orderText = "まだ注文されていません。";
                var options = {
                  url: 'https://api.chatwork.com/v1/rooms/27496495/messages',
                  method: 'POST',
                  headers: {
                    'X-ChatWorkToken': Token
                  },
                  form: {
                    body:orderText
                  }
                };
                //仮注文状態を破棄する。
                var cutoff = new Date();
                var gt = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate());
                var lt = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate() + 1); 
                Post.find(
                  {pre_order_user: item.account.name,
                    created: {$gte: gt, $lt: lt}}, 
                    null,
                    {sort: {created: -1}},
                    function(err, bentoos){
                      bentoos.forEach(function(bentoo){
                        //console.log(listNum);
                        //注文から名前を外す。今日の注文のみ　
                        var arrayPreUser = bentoo.pre_order_user;
                        var i = 0;
                        arrayPreUser.forEach(function(User){
                          if(arrayPreUser[i] == User){
                            arrayPreUser.splice(i, 1);
                          }
                          i++;
                        })
                        Post.update(
                          { _id: bentoo._id },
                          { $set: 
                            {pre_order_user: arrayPreUser }
                          },
                        { upsert: false, multi: false }, function(err) {
                            if (err) {
                              console.log(err);
                            }
                            //message
                        });
                      });
                    }
                );
                var orderText = "[To:" + item.account.account_id + "]" + "仮注文をクリアしました。注文をやり直してください。\n ※ 確定分はolコマンドで確認・削除してください。";
                var options = {
                  url: 'https://api.chatwork.com/v1/rooms/27496495/messages',
                  method: 'POST',
                  headers: {
                    'X-ChatWorkToken': Token
                  },
                  form: {
                    body:orderText
                  }
                };
                //APIへ投稿
                request(options, function(error, response, body) {
                  if(error){
                    console.log(error);
                  }
                });
                //user情報
                console.log(item.account.name + "さん: message_id" + item.message_id + " : account_id" + item.account.account_id);
              }
            }
          }

          //item.account.name
        })
      } else { 
        //console.log("false" + response.statusCode + error);
      }
    });
  },
  function(){
    //none
  },
  false, //newした後即時実行するかどうか
  'Asia/Tokyo'
);
job.start();

var job2 = new myCron(
  '0 * * * * *',
  function(){
    console.log("メンバーリストを更新します。");
    router.get('/room', function(req, res) {
      //自分のIDを取得
      var options = {
        url: 'https://api.chatwork.com/v1/me',// + room_id + '/members',
        method: 'GET',
        headers: {
          'X-ChatWorkToken': Token
        }
      };
      request(options, function(error, response, body) {
        if(error){
          console.log(error);
        }
        var item = JSON.parse(body);
        var admin_account_id = item.account_id;
        console.log("管理者のID:" + admin_account_id);
        //自分のコンタクト一覧にアクセス
        //ルームにアクセス
        var options = {
          url: 'https://api.chatwork.com/v1/contacts',
          method: 'GET',
          headers: {
            'X-ChatWorkToken': Token
          }
        };
        request(options, function(error, response, body) {
          if(error){
            console.log(error);
          }
          var items = JSON.parse(body);
          var users_account_id = "";
          items.forEach(function(item){
            users_account_id += item.account_id + ",";
          })
          //招待
          var options2 = {
            url: 'https://api.chatwork.com/v1/rooms/' + room_id + '/members',
            method: 'PUT',
            headers: {
              'X-ChatWorkToken': Token
            },
            form: {
              'members_admin_ids': admin_account_id,
              'members_member_ids': users_account_id
            }
          };
          request(options2, function(error, response, body) {
            if(error){
              console.log(error);
            }
            var items = JSON.parse(body);
            console.log(items);
          }); 
        });
      });
    });
  },
  function(){
    //none
  },
  true,
  'Asia/Tokyo'
);
job2.start();

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
