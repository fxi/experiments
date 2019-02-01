/* jshint esversion:6 */
import Tone from 'tone';

var distortion = new Tone.Distortion({
  distortion  : 0.1 ,
  oversample  : "4x" // none, 2x, 4x
});
var reverb = new Tone.Freeverb(0.75,1000); 
var gain = new Tone.Gain(-0.5);
var feedbackDelay = new Tone.FeedbackDelay("8n",0.25);
var compressor = new Tone.Compressor({
  ratio  : 12 ,
  threshold  : -24 ,
  release  : 0.25 ,
  attack  : 0.003 ,
  knee  : 10
});


var bass = new Tone.FMSynth({
  "harmonicity" : 1,
  "modulationIndex" : 3.5,
  "carrier" : {
    "oscillator" : {
      "type" : "custom",
      "partials" : [0, 1, 0, 2]
    },
    "envelope" : {
      "attack" : 0.08,
      "decay" : 0.3,
      "sustain" : 0,
    },
  },
  "modulator" : {
    "oscillator" : {
      "type" : "sawtooth"
    },
    "envelope" : {
      "attack" : 0.1,
      "decay" : 0.2,
      "sustain" : 0.3,
      "release" : 0.01
    },
  }
});
  
bass.toMaster();
//bass.connect(Tone.master);
  
  //.chain(reverb, compressor, Tone.master);
function boom(x){
  var pitch = new Tone.PitchShift(x||0);
  var sound =  new Tone.Player("./boom.wav",function(){
    sound.start();
  }).chain(pitch, Tone.Master);
}

export { bass  as synth, boom };
