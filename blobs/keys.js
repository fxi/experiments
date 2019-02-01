/* jshint esversion:6 */

export { Keys, randomHsl, onNextFrame }  ;


function Keys(opt){
  "use strict";

  if (this instanceof Keys) {
    if(!opt) return;
    var ks = this;
    ks.opt = opt;
    ks.opt.enabled=false;
    ks.opt.members=[];
    ks.opt.elCanvas = document.querySelector(opt.selector);
    ks.opt.ctx = ks.opt.elCanvas.getContext("2d");
    ks.opt.ctx.save();

    ks.getSize = function(){
      return({
        width : opt.width ||  window.innerWidth,
        height :  opt.height || window.innerHeight
      });
    };
    ks.setSize = function(){
      var s = ks.getSize();
      ks.opt.elCanvas.width = s.width;
      ks.opt.elCanvas.height = s.height; 
    };
    ks.clear = function(){
      var s = ks.getSize();
      ks.opt.ctx.globalCompositeOperation = "source-over";
      ks.opt.ctx.fillStyle = opt.color;
      ks.opt.ctx.fillRect(0,0,s.width,s.height);
    };
    ks.setSize();
    //ks.clear();
  }
  else return new Keys(opt);
}

Keys.prototype.animate = function(enable){

  var ks = this;
  ks.opt.enabled = enable;
  var dim = ks.getSize();

  function animate(){
    var xCurr = 0;
    var yCurr = 0;
    var offset = 0; 
    var speed = 0.2;
    var outXmin = 0;
    var outXmax = 0;
    var outYmin = 0;
    var outYmax = 0;

    ks.each(k => {
      k.move();
    });

    ks.render();

    if(ks.opt.enabled)
      setTimeout(animate,50);
  }

  animate();

};

Keys.prototype.render = function(opt){
  var ks = this;
  opt = opt || {};

  onNextFrame(()=>{

    ks.clear();
    ks.each(k => {
      k.draw();
    });

    ks.opt.onRender(ks);
  });
};




Keys.prototype.addKey = function(opt){
  var ks = this;
  opt = opt || {};
  opt.keys = ks;
  var k = new Key(opt);
  ks.opt.members.push(k);
};

Keys.prototype.removeKey = function(key){
  var ks = this;
  var pos = ks.opt.members.indexOf(key);
  ks.opt.members.splice(pos,1);
};

Keys.prototype.getContext = function(){
  var ks = this;
  return ks.opt.ctx;
};
Keys.prototype.getCanvas = function(){
  var ks = this;
  return ks.opt.elCanvas;
};



Keys.prototype.each = function(cb){
  var ks = this;
  ks.opt.members.forEach(cb);
};
Keys.prototype.getById = function(id){
  return this.opt.members.find( k => k.id == id );
};


/**
* Key
*/
function Key(opt){
  var k = this;
  k.opt = opt;
  
  k.setCoord  = function(coord){
    var isEvent = coord instanceof Event;
    var isBusy = k.isBusy();
    var pos = isEvent ? {x:coord.clientX,y:coord.clientY} : coord;
    if( (isBusy && isEvent) || (!isBusy  && !isEvent) ){
      k.opt.x = pos.x;
      k.opt.y = pos.y;
    }
  };
  k.setCircle = function(opt){
    k.opt.img = circle( opt || k.opt);
  };
  k.getCoord  = function(){
    return {
      x : k.opt.x,
      y : k.opt.y
    };
  };
  k.getPercentTopLeft = function(){
      var d = opt.keys.getSize();
      var c = k.getCoord();
      return {
        left : c.x / d.width,
        top : c.y / d.height
      };
  };
  k.remove = function(){
     opt.keys.removeKey(k);
  };
  k.getOffset = function(blur){
    return opt.radius + ( blur ? opt.blur : 0);
  };
  k.setBusy = function(busy){
    k.opt.busy = busy;
  };
  k.isBusy = function(){
    return k.opt.busy === true;
  };

  k.getDistanceTo = function(key) {
    var isKey = key instanceof Key;
    var isEvent = key instanceof Event;
    var a = k.getCoord();
    var b = isKey ? key.getCoord() : isEvent ? {x:key.clientX,y:key.clientY} : {x:0,y:0} ;
    var dx = Math.abs(a.x-b.x);
    var dy = Math.abs(a.y-b.y);
    var dist =  Math.sqrt(Math.pow(dx,2)+Math.pow(dy,2));
    return dist;
  };
  k.draw = function(){
    var ctx = opt.keys.getContext();
    var cX = k.opt.x - ( opt.radius + opt.blur / 2 );
    var cY = k.opt.y - ( opt.radius + opt.blur / 2 );
    ctx.drawImage(k.opt.img, cX, cY);
    k.testTouchAny();
  };
  k.addLabel = function(label){
    var ctx = opt.keys.getContext();
    var coord = k.getCoord();
    ctx.font = "20px Monaco";
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.fillText(label || k.opt.id, coord.x , coord.y);
  };
  k.setSpeed = function(speed){
    speed = speed || opt.speed;
    k.opt.speed = speed;
  };
  k.getSpeed = function(){
    var speed  = opt.speed;
    return speed instanceof Function ? speed(k) : speed || 1;
  };
  k.setRadius = function(radius){
    radius = radius || opt.radius;
    opt.radius = radius;
  };
  k.getRadius = function(radius){
    return opt.radius ;
  };
  k.getArea = function(){
    return Math.pow(opt.radius,2) * Math.PI ;
  };
  k.setArea = function(area){
    opt.radius = Math.sqrt(area/Math.PI) ;
  };
  k.getAngle = function(){
    return opt.angle;
  };
  k.setAngle = function(angle){
    opt.angle = angle;
  };

  /**
  * Touch/ collision evaluation
  */
  k._touchStore = [];
  k.testTouchSingle = function(key,threshold){
    var isKey = key instanceof Key;
    if(!threshold) threshold = isKey ? key.getOffset() : 0;
    threshold = threshold + k.getOffset();
    var dist = k.getDistanceTo(key);
    return dist <= threshold;
  };
  k.testTouchAny = function(tOpt){
    tOpt = tOpt || {};
    if( opt.keys ){
      opt.keys.each( key => {
        if(k == key) return;
        if( k.testTouchSingle(key) ){
          if( !tOpt.skipForceBack ) k.forceBack(key);
          if( k.touches(key) ) return;
          if( opt.onCollision ) opt.onCollision({
            k1:k,
            k2:key,
            keys:opt.keys
          });
          k.addToTouchStore(key);
        }else{

          k.removeFromTouchStore(key);
        }
      });
    }
  };
  k.touches = function(key){
    return k.touchesSingle(key) || key.touchesSingle(k) ;
  };
  k.touchesSingle = function(key){
    return k._touchStore.indexOf(key) > -1;
  };
  k.addToTouchStore = function(key){
    k._touchStore.push(key);
  };

  k.forceBack = function(key){
    key.setCoord({
      y:key.getCoord().y + 5,
      x:key.getCoord().x
    });
    k.testTouchAny({
      skipForceBack : true
    });
  };
  k.removeFromTouchStore = function(key){
    var pos =  k._touchStore.indexOf(key);
    if(pos == -1 ) return;
    k._touchStore.splice(pos,1);
  };
  k.move = function(){
    var dim = k.opt.keys.getSize();
    var angle = k.getAngle();
    var offset = k.getOffset(true);
    var speed = k.getSpeed();
    var coord = k.getCoord();
    var xCurr = coord.x;
    var yCurr = coord.y;
    var xNew = xCurr + ( speed * Math.cos(Math.PI / 180 * angle));
    var yNew = yCurr + ( speed * Math.sin(Math.PI / 180 * angle));
    
    var outXmax = xNew > dim.width + offset; 
    var outYmax = yNew > dim.height + offset; 
    var outXmin = xNew < 0 - offset; 
    var outYmin = yNew < 0 - offset; 

    k.setCoord({
      x : ( outXmax ? 0 - offset : outXmin ? dim.width + offset : xNew),
      y : ( outYmax ? 0 - offset : outYmin ? dim.height + offset : yNew)
    });

    //k.setCoord({
      //x : coord.x + adj,
      //y : coord.y + opp
    /*});*/
  };
  /**
  * Init
  */
  k.init = function(){

    k.setCircle();
    k.setSpeed();

    k.setCoord({
      x : opt.x,
      y : opt.y
    });
  };

  k.init();
 
}


function circle(opt) {
  opt.radius = opt.radius || 50;
  opt.blur = opt.blur || 10;
  var h = opt.radius * 2 + opt.blur;
  var w = opt.radius * 2 + opt.blur;
  var circle = makeCanvas({
    width: w,
    height: h
  });
  var ctxCircle = circle.getContext("2d");
  ctxCircle.fillStyle = ! opt.color || opt.color == "random" ? randomHsl() : opt.color ;
  ctxCircle.shadowColor = opt.color;
  ctxCircle.shadowBlur = opt.blur;
  ctxCircle.arc(h / 2, w / 2, opt.radius, 0, 2 * Math.PI);
  ctxCircle.fill();  

  return circle;
}

function randomHsl(opacity, random, saturation, lightness) {
  if (opacity === undefined) opacity = 1;
  if (saturation === undefined) saturation = 100;
  if (lightness == undefined) lightness = 50;
  if (random < 0 || random > 1 || random === undefined) random = Math.random();
  var res = "hsla(" + (random * 360) +
    ", " + saturation + "% " +
    ", " + lightness + "% " +
    ", " + opacity + ")";
  return res;
}

var nf = window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  function(callback) {
    window.setTimeout(callback, 1000 / 60);
  };

/**
 * Do something on next frame
 * @param {Function} cb Callback function to execute on next animation frame
 */
function onNextFrame(cb){
  nf(cb);
}

function makeCanvas(opt) {
  var canvas = document.createElement('canvas');
  canvas.width = opt.width;
  canvas.height = opt.height;
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return canvas;
}
