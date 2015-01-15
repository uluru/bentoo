var express = require('express');
var calendar = require('node-calendar');
var router = express.Router();
var request = require('request');

var model = require('../model');
var Post = model.Post;
var Menu = model.Menu;

var url = require('url');

/* GET home page. */
router.get('/', function(req, res) {
  var todayFlg = true; //new entryを有効にするキー
  if (req.param("year") && req.param("month") && req.param("day") ) {
    var gt = new Date(req.param("year"), req.param("month"), req.param("day"));
    var cutoff = gt;
    var lt = new Date(req.param("year"), req.param("month"), parseInt(req.param("day")) + 1);
    var day = new Date();
    if ( parseInt(req.param("day")) < day.getDate()) {
      todayFlg = false;
    }  
 
  } else {
    var cutoff = new Date();
    var gt = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate());
    var lt = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate() + 1); 
  }
  //cutoff.setHours(cutoff.getHours() - 12);
  Post.find({created: {$gte: gt, $lt: lt}}, function(err, items){
    Menu.find({}, function(err, menuItems){
      res.render('index', { title: '弁当一覧', items: items, year: cutoff.getFullYear(), month: cutoff.getMonth(), day:cutoff.getDate(), todayFlg:todayFlg, menuItems: menuItems });
    });
  });
});
 
/* 品目リストの追加機能form */
router.get('/addMenu', function(req, res){
  Menu.find({}, function(err, items){
    res.render('addMenu', { title: 'メニューの追加', items:items})
  });
});

/* 品目リストの追加機能form ajaxで行う */
router.post('/addMenu', function(req, res){
  var newMenu = new Menu(req.body);
  newMenu.save(function(err){
    if (err) {
      console.log(err);
      res.redirect('back');
    } else {
      var todayFlg = true; //new entryを有効にするキー
      if(req.param("year") && req.param("month") && req.param("day") ){
        var gt = new Date(req.param("year"), req.param("month"), req.param("day"));
        var cutoff = gt;
        var lt = new Date(req.param("year"), req.param("month"), parseInt(req.param("day")) + 1);
        var day = new Date();
        if ( parseInt(req.param("day")) < day.getDate()) {
          todayFlg = false;
        }  
      } else {
        //Callendar出力する。
        var cutoff = new Date();
        var gt = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate());
        var lt = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate() + 1); 
      }
      //cutoff.setHours(cutoff.getHours() - 12);
      res.redirect("/?year=" + cutoff.getFullYear() + "&month=" + cutoff.getMonth() + "&day=" + cutoff.getDate())
    }
  });
});

router.get('/deleteMenu', function(req, res){
  Menu.remove({ _id: req.param("id") }, function(err) {
    var todayFlg = true; //new entryを有効にするキー
    if(req.param("year") && req.param("month") && req.param("day") ){
      var gt = new Date(req.param("year"), req.param("month"), req.param("day"));
      var cutoff = gt;
      var lt = new Date(req.param("year"), req.param("month"), parseInt(req.param("day")) + 1);
      var day = new Date();
      if ( parseInt(req.param("day")) < day.getDate()) {
        todayFlg = false;
      }  
    } else {
      //Callendar出力する。
      var cutoff = new Date();
      var gt = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate());
      var lt = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate() + 1); 
    }
    //cutoff.setHours(cutoff.getHours() - 12);
    res.redirect("/?year=" + cutoff.getFullYear() + "&month=" + cutoff.getMonth() + "&day=" + cutoff.getDate())
  })
});

/* Form */
router.get('/form', function(req, res) {
  if (req.param("id")) { //update
    Post.find({ _id: req.param("id") }, function(err, items) {
      res.render('form', {title:'Update Entry', items: items, year:req.param("year"), month: req.param("month"), day: req.param("day"), action: 'edit'})
    });
  } else {
    if (req.param("year") && req.param("month") && req.param("day")) {
      var created = new Date( req.param("year"), req.param("month"), req.param("day"));
      var year = req.param("year");
      var month = req.param("month");
      var day = req.param("day");
    } else {
      var created = new Date();
      var year = created.getFullYear("year");
      var month = created.getMonth("month");
      var day = created.getDate("day");
    }
    res.render('form', {title: 'New Entry', items: 0, year: year, month: month, day: day, created: created, action: 'create'})
  }
});

/* Form */
router.get('/deleteOrder', function(req, res) {
  Post.find({_id: req.param("id")}, function(err, bentoos){
    var arrayUser = bentoos[0].order_user;
    var i = 0;
    arrayUser.forEach(function(User){
      if(arrayUser[i] == User){
        arrayUser.splice(i, 1);
      }
      i++;
    })
    //削除処理
    Post.update(
      { _id: req.param("id")},
      { $set: {order_user: arrayUser }},
      { upsert: false, multi: false }, function(err) {
        if (err) {
          console.log(err);
        }
        var todayFlg = true; //new entryを有効にするキー
        if(req.param("year") && req.param("month") && req.param("day") ){
          console.log("a");
          var gt = new Date(req.param("year"), req.param("month"), req.param("day"));
          var cutoff = gt;
          var lt = new Date(req.param("year"), req.param("month"), parseInt(req.param("day")) + 1);
          var day = new Date();
          if ( parseInt(req.param("day")) < day.getDate()) {
            console.log("b");
            todayFlg = false;
          }  
        } else {
          console.log("c");
          //Callendar出力する。
          var cutoff = new Date();
          var gt = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate());
          var lt = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate() + 1); 
        }
        //cutoff.setHours(cutoff.getHours() - 12);
        console.log("d");
        res.redirect("/?year=" + cutoff.getFullYear() + "&month=" + cutoff.getMonth() + "&day=" + cutoff.getDate())
      }
    );
  })
});

/* Create */
router.post('/create', function(req, res) {
  console.log(req.body);
  var newPost = new Post(req.body);
  newPost.save(function(err){
    if (err) {
      console.log(err);
      res.redirect('back');
    } else {
      var todayFlg = true; //new entryを有効にするキー
      if(req.param("year") && req.param("month") && req.param("day") ){
        console.log("a");
        var gt = new Date(req.param("year"), req.param("month"), req.param("day"));
        var cutoff = gt;
        var lt = new Date(req.param("year"), req.param("month"), parseInt(req.param("day")) + 1);
        var day = new Date();
        if ( parseInt(req.param("day")) < day.getDate()) {
          console.log("b");
          todayFlg = false;
        }  
      } else {
        console.log("c");
        //Callendar出力する。
        var cutoff = new Date();
        var gt = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate());
        var lt = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate() + 1); 
      }
      //cutoff.setHours(cutoff.getHours() - 12);
      console.log("d");
      res.redirect("/?year=" + cutoff.getFullYear() + "&month=" + cutoff.getMonth() + "&day=" + cutoff.getDate())
    }
  });
});

/* edit */
router.post('/edit', function(req, res) {
    Post.update({ _id: req.param("id") }, { $set: {text: req.param("text"), price: req.param("price")} },
      { upsert: false, multi: false }, function(err) {
      if (err) {
        console.log(err);
        res.redirect('back');
      } else {
        var todayFlg = true; //new entryを有効にするキー
        if(req.param("year") && req.param("month") && req.param("day") ){
          console.log("a");
          var gt = new Date(req.param("year"), req.param("month"), req.param("day"));
          var cutoff = gt;
          var lt = new Date(req.param("year"), req.param("month"), parseInt(req.param("day")) + 1);
          var day = new Date();
          if ( parseInt(req.param("day")) < day.getDate()) {
            console.log("b");
            todayFlg = false;
          }  
        } else {
          console.log("c");
          //Callendar出力する。
          var cutoff = new Date();
          var gt = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate());
          var lt = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate() + 1); 
        }
        //cutoff.setHours(cutoff.getHours() - 12);
        console.log("d");
        res.redirect("/?year=" + cutoff.getFullYear() + "&month=" + cutoff.getMonth() + "&day=" + cutoff.getDate())
      }
      });
});

/* Delete post */
router.get(
    '/delete',
    function(req, res) {
      Post.remove({ _id: req.param("id") }, function(err) {
        if (err) {
          console.log(err);
          res.redirect('back');
        } else {
          var todayFlg = true; //new entryを有効にするキー
          if(req.param("year") && req.param("month") && req.param("day") ){
            console.log("a");
            var gt = new Date(req.param("year"), req.param("month"), req.param("day"));
            var cutoff = gt;
            var lt = new Date(req.param("year"), req.param("month"), parseInt(req.param("day")) + 1);
            var day = new Date();
            if ( parseInt(req.param("day")) < day.getDate()) {
              console.log("b");
              todayFlg = false;
            }  
          } else {
            console.log("c");
            //Callendar出力する。
            var cutoff = new Date();
            var gt = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate());
            var lt = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate() + 1); 
          }
          //cutoff.setHours(cutoff.getHours() - 12);
          console.log("d");
          res.redirect("/?year=" + cutoff.getFullYear() + "&month=" + cutoff.getMonth() + "&day=" + cutoff.getDate())
        }
      });
    }
);

module.exports = router;
