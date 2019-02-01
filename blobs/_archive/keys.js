/* jshint esversion:6 */

import Tone from 'tone';


export default Blobs ;


function Blobs(opt){
  "use strict";

  if (this instanceof Blobs) {

    var blobs = this;
    blobs.opt = opt;
    blobs.elCanvas = document.querySelector(opt.selector);
    blobs.ctx = blobs.elCanvas.getContext("2d");
    blobs.members=[];
    blobs.setSize = function(h,w){
      blobs.elCanvas.width = w || opt.width || window.innerWidth;
      blobs.elCanvas.height = h || opt.height || window.innerHeight;
    };
    blobs.setSize();

  }
  else return new PixOp(config);
}

Blobs.prototype.addBlob = function(opt){
  var blobs = this;
  opt = opt || {};
  var blob = new Blob(opt);
  blobs.members.push(blob);
};



Blobs.prototype.Blob = function(opt){
  var blob = this;
  blob.canvas = circle(opt);
  blob.x = opt.x,
  blob.y = opt.y;



  return blob;
}


function circle(opt) {
  var h = opt.radius * 2 + opt.blur || 0;
  var w = opt.radius * 2 + opt.blur || 0;
  var circle = makeCanvas({
    width: w,
    height: h
  });
  ctxCircle = circle.getContext("2d");
  ctxCircle.fillStyle = opt.color;
  ctxCircle.shadowColor = opt.color;
  ctxCircle.shadowBlur = opt.blur;
  ctxCircle.arc(h / 2, w / 2, opt.radius, 0, 2 * Math.PI);
  ctxCircle.fill();  
  return circle;
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

function toBlob(imgData) {
  var d = imgData.data;
  var value = 10000;
  var intercept = 128 * (1 - value);
  for (var i = 0; i < d.length; i += 4) { //r,g,b,a
    d[i] = d[i] * value + intercept;
    d[i + 1] = d[i + 1] * value + intercept;
    d[i + 2] = d[i + 2] * value + intercept;
  }
  return imgData;
}

function makeCanvas(opt) {
  var canvas = document.createElement('canvas');
  canvas.width = opt.width;
  canvas.height = opt.height;
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return canvas;
}
