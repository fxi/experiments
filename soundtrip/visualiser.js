/* jshint esversion:6 */
import {onNextFrame} from './utils.js';
import * as dat from 'dat.gui';
import {paramsToObject,objectToState} from './utils.js';

export {Visualiser};

var options = {
  backAlpha: 0.05,
  scaleFactor: 1.02,
  gravity : 0,
  rotateSpeed: 0.005,
  fadeAlpha: 0.005,
  polarEnable : false,
  polarLineWidth : 1,
  polarBaseRadius: 150.0,
  rainbowWidthFactor : 8,
  rainbowEnable : false,
  rainbowOffsetX :0,
  rainbowOffsetY :0,
  startMessage: 'Click / tap to start',
};


Visualiser.prototype.addGui = function(){
  var vis = this;
  var opt = vis.opt;
  var gui = new dat.GUI();
  var ctrMsg = gui.add(opt, 'startMessage');
  gui.add(opt, 'backAlpha',0,0.1);
  gui.add(opt, 'scaleFactor',0.8,1.2);
  gui.add(opt, 'gravity',-20,20);
  gui.add(opt, 'rotateSpeed',-0.5,0.5);
  var optPolar = gui.addFolder('Polar mode');
  optPolar.add(opt, 'polarEnable').listen();
  optPolar.add(opt, 'polarBaseRadius',0,300);
  optPolar.add(opt, 'polarLineWidth',0,5);
  var optRainbow = gui.addFolder('Rainbow rainbow mode');
  optRainbow.add(opt,'rainbowEnable').listen();
  optRainbow.add(opt,'rainbowWidthFactor',5,10);
  optRainbow.add(opt,'rainbowOffsetX',-vis.width/2,vis.width/2);
  optRainbow.add(opt,'rainbowOffsetY',-vis.height/2,vis.height/2);
  gui.add(vis,'resetOptions' );
  gui.add(vis,'saveToClipboard');
  gui.close();
  vis.gui = gui;

  /**
  * Events
  */
  ctrMsg.onChange(function(value) {
    vis.clear();
    vis.msg(value);
  });


};


function Visualiser(config) {
  var vis = this;
  vis.opt = {};
  vis.elCanvas = config.elCanvas;
  vis.elCanvasBack = document.createElement('canvas');
  vis.analyserFFT = config.analyserFFT;
  vis.analyser = config.analyser;
  vis.width = config.with || window.innerWidth;
  vis.height = config.height || window.innerHeight;
  vis.x = 0;
  vis.y = 0;
  vis.i = 0;
  vis.enabled = false;
  vis.rainbowVerticesPrevious = [];
  vis.setOptions(config.options);
  vis.ctx = vis.elCanvas.getContext('2d');
  vis.ctxBack = vis.elCanvasBack.getContext('2d');
  vis.setSize();
  vis.clear();
  vis.msg();
}

Visualiser.prototype.setOptions = function(opt) {
  var vis = this;
  var setDefault = opt === true;
  Object.keys(options).forEach(o => {
    var def = options[o];
    var option = opt[o];

    var isNumber = typeof def == "number" ;
    var isBoolean = typeof def == "boolean" ;
    var optionType = typeof option;
  
    if ( setDefault || optionType == 'undefined') {
      vis.opt[o] = def;
    } else {
      if(isNumber && optionType != "number" ){
        option = option * 1 ;
      }
      if(isBoolean && optionType != "boolean"){
        option = option === "true" ;
      } 
      vis.opt[o] = option;
    }
  });
};


Visualiser.prototype.resetOptions = function() {
  var vis = this;
  vis.setOptions(true);
  objectToState(this.opt); 
};



Visualiser.prototype.setWidth = function(w) {
  var vis = this;
  vis.width = w;
  vis.elCanvas.width = vis.width;
  vis.elCanvasBack.width = vis.width;
  vis.updateCenter();
};

Visualiser.prototype.setHeight = function(h) {
  var vis = this;
  vis.height = h;
  vis.elCanvas.height = vis.height;
  vis.elCanvasBack.height = vis.height;
  vis.updateCenter();
};

Visualiser.prototype.setSize = function(opt) {
  opt = opt || {};
  var vis = this;
  vis.setWidth(opt.width || vis.width || vis.elCanvas.width);
  vis.setHeight(opt.height || vis.height || vis.elCanvas.height);
};

Visualiser.prototype.updateCenter = function() {
  var vis = this;
  vis.center = {
    x: vis.width / 2,
    y: vis.height / 2,
  };
};

Visualiser.prototype.setMode = function(mode) {
  var vis = this;
  vis.mode = mode || 'polar';
};

Visualiser.prototype.setPosition = function(pos) {
  var vis = this;
  vis.pos = pos;
  vis.x = pos.x;
  vis.y = pos.y;
};

Visualiser.prototype.getValues = function() {
  return this.analyser.getValue();
};
Visualiser.prototype.getValuesFFT = function() {
  return this.analyserFFT.getValue();
};

Visualiser.prototype.enable = function() {
  this.enabled = true;
};
Visualiser.prototype.disable = function() {
  this.enabled = false;
};
Visualiser.prototype.start = function() {
  var vis = this;
  vis.enable();
  vis.draw();
};

Visualiser.prototype.isEnabled = function() {
  return !!this.enabled;
};

Visualiser.prototype.stop = function() {
  this.disable();
};

Visualiser.prototype.next = function() {
  var vis = this;
  onNextFrame(function() {
    vis.draw();
  });
};



Visualiser.prototype.saveToClipboard = function(){
  objectToState(this.opt); 
  var elTemp = document.createElement('input');
  var href  = window.location.href;
  document.body.appendChild(elTemp);
  elTemp.value = href;
  elTemp.select();
  document.execCommand('copy');
  document.body.removeChild(elTemp);
  alert("Copied in clipboard !");
};



Visualiser.prototype.draw = function() {
  var vis = this;
  if (!vis.enabled){
    //vis.msg();
    return;
  }
  vis.drawing=true;
  vis.i++;

  if( vis.opt.polarEnable == false && vis.opt.rainbowEnable == false ){
    vis.opt.polarEnable = true;
  }
  if (vis.opt.polarEnable) {
    vis.drawPolar();
  }
  if(vis.opt.rainbowEnable){
    vis.drawRainbow();
  }
  vis.buildBackground();
  vis.drawing=false;
  vis.next();
};

Visualiser.prototype.enablePolar = function(enable) {
  var vis = this;
  enable = typeof enable === "undefined" ? !vis.opt.polarEnable : enable === false ? false : true;
  console.log("Polar mode = " + enable);
  vis.opt.polarEnable = enable;
};

Visualiser.prototype.enableRainbow = function(enable) {
  var vis = this;
  enable = typeof enable === "undefined" ? !vis.opt.rainbowEnable : enable === false ? false : true;
  console.log("Rainbow mode = " + enable);
  vis.opt.rainbowEnable = enable;
};

Visualiser.prototype.drawRainbow = function() {
  var vis = this;
  var wf = 10 - vis.opt.rainbowWidthFactor;
  var ox = vis.opt.rainbowOffsetX;
  var oy = vis.opt.rainbowOffsetY;
  var values = vis.getValuesFFT();
  var x = this.x + ox;
  var y = this.y + oy;
  var w = 1;
  var x1 = x;
  var x2 = 0;
  var y1 = y;
  var y2 = 0;
  var c = '';
  var l = values.length;
  var ws = values.map(v => Math.round(100-Math.abs(v)) / wf);
  var dx = ws.reduce((a, v) => v + a, 0) / 2;
  var vertices = [];
  var pX = 0; //previous value's x


  ws.forEach((w, i) => {
    if (!isFinite(w))
      return vertices.push({
        x1: x1,
        y1: y1,
        x2: x1,
        y2: y1
      });
    x1 = x + pX - dx ;
    x2 = x1 + w;
    pX = pX + w;
    return vertices.push({x1: x1, y1: y, x2: x2, y2: y});
  });

  if (vis.rainbowVerticesPrevious.length == vertices.length) {
    var vn = {};
    vis.rainbowVerticesPrevious.forEach((vp, i) => {
      vn = vertices[i];
      c = 'hsl(' + (i / (l - 1)) * 360 + ', 100%, 50%)';
      vis.ctx.fillStyle = c;
      vis.ctx.strokeStyle = c;
      vis.ctx.beginPath();
      /**
      *  LEFT SIDE (rotate clockwise ) 
      *  old (x1,y1) <--- (x2,y2) 
      *                      ^
      *                      |
      *  new (x1,x2) ---> (x2,y2)
      */
      vis.ctx.moveTo(vn.x1, vn.y1);
      vis.ctx.lineTo(vn.x2, vn.y2);
      vis.ctx.save();
      vis.ctx.translate(vis.center.x, vis.center.y);
      vis.ctx.rotate(vis.opt.rotateSpeed);
      vis.ctx.scale(vis.opt.scaleFactor, vis.opt.scaleFactor);
      vis.ctx.translate( 0, vis.opt.gravity);
      vis.ctx.translate(-vis.center.x, -vis.center.y);
      vis.ctx.lineTo(vp.x2, vp.y2);
      vis.ctx.lineTo(vp.x1, vp.y1);
      vis.ctx.restore();
      vis.ctx.stroke();
      vis.ctx.fill();
     });
  }
  vis.rainbowVerticesPrevious = vertices;
};


Visualiser.prototype.drawPolar = function() {
  var vis = this;
  var x = 0;
  var y = 0;
  var r = vis.opt.polarBaseRadius; // radius base
  var j = 0;
  var values = vis.getValues();
  var l = values.length * 2; // double values length for mirror
  var a = (2 * Math.PI) / (l - 1); // angle in radian
  var halfTurn = Math.PI/2;
  var theta = 0;
  var vd = 0;
  var v = 0;
  vis.ctx.strokeStyle = vis.nextColor();
  vis.ctx.lineWidth = vis.opt.polarLineWidth;
  vis.ctx.beginPath();
  for (var i = 0; i < l; i++) {
    if (i >= l / 2) {
      j = l - i;
    } else {
      j = i;
    }
    v = values[j];
    theta = a * i + Math.PI / 2;
    vd = r * (v + 1);
    x = vd * Math.cos(theta) + vis.x;
    y = vd * Math.sin(theta) + vis.y;
    vis.ctx.lineTo(x, y);
  }
  vis.ctx.stroke();
};

/**
 * Draw background effect
 */
Visualiser.prototype.buildBackground = function() {
  var vis = this;

  /*
   * reset matrix transform
   */
  vis.ctxBack.setTransform(1, 0, 0, 1, 0, 0);

  /*
   * set center, scale and rotate
   */
  vis.ctxBack.translate(vis.center.x, vis.center.y);
  vis.ctxBack.rotate(vis.opt.rotateSpeed);
  vis.ctxBack.scale(vis.opt.scaleFactor, vis.opt.scaleFactor);
  vis.ctxBack.translate( 0, vis.opt.gravity);
  vis.ctxBack.translate(-vis.center.x, -vis.center.y);

  /*
   * draw current canvas on background
   */
  vis.ctxBack.drawImage(vis.elCanvas, 0, 0);

  /*
   * Add fading
   */
  vis.ctxBack.fillStyle = 'rgba(0,20,0,'+vis.opt.backAlpha+')';
  vis.ctxBack.fillRect(0, 0, vis.width, vis.height);

  /*
   * Draw resulting background in main canvas
   */

  vis.ctx.drawImage(vis.elCanvasBack, 0, 0);
};

/**
 * Clear context
 */
Visualiser.prototype.clear = function() {
  var vis = this;
  vis.ctx.setTransform(1, 0, 0, 1, 0, 0);
  vis.ctx.fillStyle = 'black';
  vis.ctx.fillRect(0, 0, vis.width, vis.height);
};

/**
 * Display a message on screen
 */
Visualiser.prototype.msg = function(msg) {
  var vis = this;
  vis.clear();
  msg = typeof msg == "undefined" ? vis.opt.startMessage : msg;
  vis.ctx.setTransform(1, 0, 0, 1, 0, 0);
  vis.ctxBack.setTransform(1, 0, 0, 1, 0, 0);
  vis.ctx.font = '30px Arial';
  vis.ctx.fillStyle = 'white';
  vis.ctx.textAlign = 'center';
  vis.ctx.fillText(msg, vis.width / 2, vis.height / 2);
};

/**
 * Next hsl color
 */
Visualiser.prototype.nextColor = function(x) {
  var vis = this;
  if (!x) x = vis.i;
  return 'hsl(' + (x % 360) + ', 95%, 50%)';
};
