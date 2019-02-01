/* jshint esversion:6 */
import './style.css';
import { Keys, randomHsl, onNextFrame } from './keys.js';
import { synth, boom } from './synth.js';
import fx from 'glfx';


/**
* Main keys container
*/
window.keys = new Keys({
  selector : "#keys",
  contrast : 1,
  rendering : "exclusion",
  color : "rgb(0,1,0)",
  // Additional things
  onRender : onRender,
  fxCanvas : fx.canvas()
});

/*
* Start animation
*/
 
keys.animate(true);

/**
* Register new keys
*/

var dim = keys.getSize();
var col = "#d1f6fd";
var id = 0;
for(; id < 20; id++){
  keys.addKey(randomKey(id));
}

function randomKey(id,x,y){
  return {
    speed : function(k){ return (1/k.getRadius())*30; },
    id : id,
    synth : synth,
    x: x || Math.random() * dim.width,
    y: y || Math.random() * dim.height,
    angle : Math.random() * 360,
    radius: 30,
    blur: 10,
    color : id == 0 ? 'red' : col,
    onCollision : onCollision_big_eat_small
  };
}


function onCollision_bounce(c){
  const deg2rad = Math.PI / 180;
  const rad2deg = 1 / deg2rad;

  var theta1 = c.k1.getAngle()*deg2rad;
  var theta2 = c.k2.getAngle()*deg2rad;
  var coord1 = c.k1.getCoord();
  var coord2 = c.k2.getCoord();
  var v1 = c.k1.getSpeed();
  var v2 = c.k2.getSpeed();
  var phi = Math.atan2(coord1.x - coord1.y, coord2.x - coord2.y);
  var m1 = c.k1.getArea();
  var m2 = c.k2.getArea();

  var dx1F = (v1 * Math.cos(theta1 - phi) * (m1-m2) + 2*m2*v2*Math.cos(theta2 - phi)) / (m1+m2) * Math.cos(phi) + v1*Math.sin(theta1-phi) * Math.cos(phi+Math.PI/2);
  var dy1F = (v1 * Math.cos(theta1 - phi) * (m1-m2) + 2*m2*v2*Math.cos(theta2 - phi)) / (m1+m2) * Math.sin(phi) + v1*Math.sin(theta1-phi) * Math.sin(phi+Math.PI/2);
  var dx2F = (v2 * Math.cos(theta2 - phi) * (m2-m1) + 2*m1*v1*Math.cos(theta1 - phi)) / (m1+m2) * Math.cos(phi) + v2*Math.sin(theta2-phi) * Math.cos(phi+Math.PI/2);
  var dy2F = (v2 * Math.cos(theta2 - phi) * (m2-m1) + 2*m1*v1*Math.cos(theta1 - phi)) / (m1+m2) * Math.sin(phi) + v2*Math.sin(theta2-phi) * Math.sin(phi+Math.PI/2);


//var xNew = xCurr + ( speed * Math.cos(Math.PI / 180 * angle));
    //var yNew = yCurr + ( speed * Math.sin(Math.PI / 180 * angle));

  c.k1.setAngle(Math.atan2(dx1F, dy1F)*rad2deg);
  c.k2.setAngle(Math.atan2(dx2F, dy2F)*rad2deg);
}

function onCollision_big_eat_small(c){
  var note = 60;
  if(c.k1.getRadius() > c.k2.getRadius()){
    note = 180 - c.k1.getRadius()  ;
    c.k1.setArea(c.k1.getArea() + c.k2.getArea());
    c.k1.setCircle();
    c.k2.remove();
    c.k1.opt.synth.triggerAttackRelease(note,"8n");
  }else{
    note = 180 - c.k2.getRadius() ;
    c.k2.setArea(c.k1.getArea() + c.k2.getArea());
    c.k2.setCircle();
    c.k1.remove();
    c.k1.opt.synth.triggerAttackRelease(note,"8n");
  }
}

function onRender(ks){
  var ctx =  ks.getContext();
  var elCanvas = ks.getCanvas();
  var canvas = ks.opt.fxCanvas; 

  if(true){
    var texture = canvas.texture(elCanvas);
    canvas.draw(texture).triangleBlur(50).brightnessContrast(0, 0.92).update();
    ctx.drawImage(canvas,0,0);
  }
  if(false){
    ks.each(k => {
      k.addLabel(Math.round(k.getSpeed()*100)/100);
    });
  }
}



var n = 0;

window.addEventListener('mousedown',onMouseDown);

function onMouseDown(e){
  var key ;
  keys.each(k => {
    if(key) return;

    var t = k.testTouchSingle(e);
    if(t){
      key = k;
      key.setBusy(true);
      e.stopPropagation();
      window.addEventListener('mousemove',onMouseMove);
      window.addEventListener('mouseup',onMouseUp);
    }

  });

  if(!key){
    keys.addKey(randomKey(id++,e.clientX,e.clientY));
  }
  
  
  function onMouseMove(e){
    key.setCoord(e);
  }

  function onMouseUp(e){
    window.removeEventListener('mousemove',onMouseMove);
    window.removeEventListener('mouseup',onMouseUp);
    key.setBusy(false);
  }
}








