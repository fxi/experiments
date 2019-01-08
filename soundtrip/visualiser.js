/* jshint esversion:6 */
import {onNextFrame} from './utils.js';
export {Visualiser};

var options = {
  baseRadius: 150,
  fadeFactor: 0.01,
  scaleFactor: 1.01,
  rotateAngle: 0.005,
  fadeAlpha: 0.005,
  mode: 1,
  analyser: null,
  analyserFFT: null,
  width: 0,
  height: 0,
  message: 'Press space to start',
};

function Visualiser(opt) {
  var vis = this;
  vis.opt = {};
  vis.elCanvas = opt.elCanvas;
  vis.elCanvasBack = document.createElement('canvas');
  vis.x = 0;
  vis.y = 0;
  vis.i = 0;
  vis.enabled = false;
  vis.brushVerticesPrevious = [];
  vis.setOptions(opt);
  vis.ctx = vis.elCanvas.getContext('2d');
  vis.ctxBack = vis.elCanvasBack.getContext('2d');
  vis.setSize();
  vis.clear();
}

Visualiser.prototype.setOptions = function(opt) {
  var vis = this;
  Object.keys(options).forEach(o => {
    if (typeof opt[o] == 'undefined') {
      vis.opt[o] = options[o];
    } else {
      vis.opt[o] = opt[o];
    }
  });
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
  vis.setWidth(opt.width || vis.opt.width || vis.elCanvas.width);
  vis.setHeight(opt.height || vis.opt.height || vis.elCanvas.height);
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
  vis.mode = mode || 1;
};

Visualiser.prototype.setPosition = function(pos) {
  var vis = this;
  vis.pos = pos;
  vis.x = pos.x;
  vis.y = pos.y;
};

Visualiser.prototype.getValues = function() {
  return this.opt.analyser.getValue();
};
Visualiser.prototype.getValuesFFT = function() {
  return this.opt.analyserFFT.getValue();
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
  this.msg();
};

Visualiser.prototype.next = function() {
  var vis = this;
  onNextFrame(function() {
    vis.draw();
  });
};

Visualiser.prototype.draw = function() {
  var vis = this;
  if (!vis.enabled) return;
  vis.i++;
  var mode = vis.mode || 1;

  if (mode == 1) {
    vis.drawPolar();
  } else {
    vis.drawBrush();
  }
  vis.buildBackground();
  vis.next();
};

Visualiser.prototype.drawBrush = function() {
  var vis = this;
  var w = 1;
  var x1 = this.x;
  var x2 = 0;
  var y1 = this.y;
  var y2 = this.y;
  var values = vis.getValuesFFT();
  var c = '';
  var l = values.length;
  var ws = values.map(v => Math.round(Math.abs(1 - v)) / 5);
  var dx = ws.reduce((a, v) => v + a, 0) / 2;
  var vertices = [];

  // previous value's x
  var pX = 0;

  values.forEach((v, i) => {
    if (!isFinite(v))
      return vertices.push({
        x1: x1,
        y1: y1,
        x2: x1,
        y2: y1,
        w: 0,
      });

    w = Math.round(Math.abs(v)) / 5;
    x1 = this.x + pX - dx;
    x2 = x1 + w;
    pX = pX + w;
    return vertices.push({x1: x1, y1: y1, x2: x2, y2: y2, w: w});
  });

  if (vis.brushVerticesPrevious.length == vertices.length) {
    var vn = {};
    vis.brushVerticesPrevious.forEach((vp, i) => {
      vn = vertices[i];
      c = 'hsl(' + (i / (l - 1)) * 360 + ', ' + vn.w * 10 + '%, 50%)';
      vis.ctx.fillStyle = c;
      vis.ctx.beginPath();

      if (vn.y1 > vp.y1) {
        /**
         *  [ brush go down ]
         */
        vis.ctx.moveTo(vn.x1, vn.y1 + 1);
        vis.ctx.lineTo(vn.x2, vn.y2 + 1);
        vis.ctx.lineTo(vp.x2 + 1, vp.y2 - 1);
        vis.ctx.lineTo(vp.x1 + 1, vp.y1 - 1);
      } else {
        /**
         *  [ brush go up or does not move ]
         */
        vis.ctx.moveTo(vp.x1, vp.y1 + 1);
        vis.ctx.lineTo(vp.x2, vp.y2 + 1);
        vis.ctx.lineTo(vn.x2 + 1, vn.y2 - 1);
        vis.ctx.lineTo(vn.x1 + 1, vn.y1 - 1);
      }
      vis.ctx.fill();
    });
  }
  vis.brushVerticesPrevious = vertices;
};

Visualiser.prototype.drawPolar = function() {
  var vis = this;
  var x = 0;
  var y = 0;
  var r = vis.opt.baseRadius; // radius base
  var j = 0;
  var values = vis.getValues();
  var l = values.length * 2; // double values length for mirror
  var a = (2 * Math.PI) / (l - 1); // angle in radian
  var theta = 0;
  var vd = 0;
  var v = 0;
  vis.ctx.strokeStyle = vis.nextColor();
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
  vis.ctxBack.rotate(vis.opt.rotateAngle);
  vis.ctxBack.scale(vis.opt.scaleFactor, vis.opt.scaleFactor);
  vis.ctxBack.translate(-vis.center.x, -vis.center.y);

  /*
   * draw current canvas on background
   */
  vis.ctxBack.drawImage(vis.elCanvas, 0, 0);

  /*
   * Add fading
   */
  vis.ctxBack.fillStyle = 'rgba(0,20,0,0.01)';
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
  msg =  msg || vis.opt.message;
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
