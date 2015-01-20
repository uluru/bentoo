@Bentoo
====

Chatworkから翌日の昼に食べられる弁当を予約できるCRUDアプリケーション。 
勝どきオフィスに在籍する全ての社員が利用可能です。 
node.js + expressで構成され、deamon管理はforeverを利用しています。 
一般的なCRUD機能を持っており、管理画面から注文管理ができます。 

## Description

nodeがChatWorkを監視し、ユーザからの有効なコマンドが見つかればステート遷移します。 
定期実行には[node-cron](https://github.com/ncb000gt/node-cron "node-cron")を使っています。 
ChatWorkAPIのAPI制限が100query/5分なので、最大で3秒に1回巡回することができますが、ユーザがChatWorkを通してbotとやり取りする際にクエリを消費するので、余裕を持って7秒に一回実行させています。 

また、新しく社員が加入したときの手間を減らすため、深夜帯にルームに自動で社員を追加する処理を行っています。 
これらの処理は全て/app.jsに書いています。

## expressのMVC

<dl>
  <dt>Controller</dt>
  <dd>/routes/*</dd>
  <dt>View</dt>
  <dd>/views/*</dd>
  <dt>Model</dt>
  <dd>/model.js</dd>
</dl>

ControllerとViewのフォルダはほぼ固定、Modelは自由に決定できます。 
これらの定義は/app.jsで行います。 

## Requirement

Amazon Linux AMI release 2014.09 / CentOS 6.4 ~

## Usage

<dl>ChatWorkの@Bentooルームで有効なコマンド一覧。
  <dt>@list</dt>
  <dd>明日の弁当メニューを表示します。</dd>
  <dt>@order 弁当番号</dt>
  <dd>弁当を注文します。(例:@order 2)</dd>
  <dt>@yes</dt>
  <dd>@orderで弁当を注文した後に注文を確定します。</dd>
  <dt>@no</dt>
  <dd>注文をやり直します。</dd>
  <dt>@ol</dt>
  <dd>自分の注文した弁当を確認します。</dd>
  <dt>@del 番号</dt>
  <dd>自分の注文した弁当を取り消します。</dd>
</dl>

node-cronの起動時間は9:00-20:00です。 
注文は前日17:00までに行わなければならないため、17:00を過ぎたコマンド入力には「時間外です」という警告がリプライされます。 

## Install

以下はインストール済みとします。 

node.js(0.10.29) 
npm(1.3.6) 
mongo(2.6.7) 

まずは/app.jsの51行目,52行目のroom_idとToken変数を@Bentoo用のルームIDとChatWorkのAPIトークンに書き換えます。

```JavaScript:app.js
var room_id = "---";
var Token = "---";
```

次にmongoDBにstudyという名前のテーブルを準備します。 
違うテーブル名を使いたければ/model.jsを編集します。 

```console:
$ mongo
MongoDB shell version: 2.6.7
connecting to: test
> use study
> exit
bye
```

```JavaScript:model.js
var mongoose = require('mongoose');
var db = mongoose.connect('mongodb://localhost/study');//←このstudyを書き換える。
```


設置間もない状況ではtimezone管理用の[node-time](https://github.com/TooTallNate/node-time "node-time")がインストールされていないので用意します。

```console:
$ npm install time
```

インストールできたら起動しましょう。 
念のためnpmをアップデートしておきます。



```console:
$ npm update
$ cd /var/www/bentoo
$ forever start ./bin/www
```

foreverが起動したら

http://(HostName or IP Address):3000/

で管理画面の確認ができます。 
foreverはコンソール出力をしてくれないので、もしforeverが正常に稼働しているかどうか確認したくなったら以下のコマンドを入力してください。 
以下のように出れば正常に稼働しています。

```console:
$ forever list
info:    Forever processes running
data:        uid  command       script  forever pid   id logfile                          uptime       
data:    [0] SpRf /usr/bin/node bin/www 11837   11839    /home/t_shirai/.forever/SpRf.log 0:4:53:44.134
```

foreverの使い方については[node.js node.jsスクリプトをforeverでデーモン化する。](http://onlineconsultant.jp/pukiwiki/?node.js%20node.js%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%97%E3%83%88%E3%82%92forever%E3%81%A7%E3%83%87%E3%83%BC%E3%83%A2%E3%83%B3%E5%8C%96%E3%81%99%E3%82%8B "node.js node.jsスクリプトをforeverでデーモン化する。")を参考にしてください。

## 関連Ticket(社内向け)

11368 
11384 
11415 
11423 
11422 
11430 
11433 
11439 
11441 
11458 
11465 

## Author

[bitai](https://github.com/bitai)
