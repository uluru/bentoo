var mongoose = require('mongoose');
var db = mongoose.connect('mongodb://localhost/study');

function validator(v) {
	  return v.length > 0;
}
/*
function validatorForNum(v) {
	  return isNaN(v);
}
*/

var Post = new mongoose.Schema({
  text   : { 
    type: String, validate: [validator, "Empty Error"] 
  },
  price : {
    type: Number,
    /*, validate: [validatorForNum, "Not Number Error"]*/ 
    default: 500
  },
  order_user : {
    type: Array, //user_nameの配列を格納
    default: []
  },
  pre_order_user : {
    type: Array, //user_nameの配列を格納
    default: []
  },
  created: { 
    type: Date,
    default: Date.now
  }
});

var Menu = new mongoose.Schema({
  text   : { 
    type: String, validate: [validator, "Empty Error"] 
  },
  price : {
    type: Number,
    /*, validate: [validatorForNum, "Not Number Error"]*/ 
    default: 500
  },
  created: { 
    type: Date,
    default: Date.now
  }
});

var Member = new mongoose.Schema({
  name   : { 
    type: String, validate: [validator, "Empty Error"] 
  },
  chatworkId   : { 
    type: String, validate: [validator, "Empty Error"] 
  },
  created: { 
    type: Date,
    default: Date.now
  }
});

exports.Post = db.model('Post', Post);
exports.Menu = db.model('Menu', Menu);
exports.Member = db.model('Member', Member);
