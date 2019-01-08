/* jshint esversion:6 */
import Tone from 'tone';
import LocalForage from 'localforage';
export {Player};

var db = LocalForage.createInstance({
  name: 'db',
});
/**
 * Sound analyser
 */
var analyser = new Tone.Analyser({
  size: 256,
  type: 'waveform',
});
var analyserFFT = new Tone.Analyser({
  size: 16,
  type: 'fft',
  smoothing: 2,
});

var player = new Tone.Player().toMaster();
player.connect(analyser);
player.connect(analyserFFT);

function Player(opt) {
  this.busy = false;
  this.playing = '';
  this.analyser = analyser;
  this.analyserFFT = analyserFFT;
}

Player.prototype.stop = function() {
  return player.stop();
};

Player.prototype.play = function(url) {
  var pl = this;
  var dataBlob;
  if (!url || pl.busy) return Promise.resolve();
  pl.busy = true;

  return Tone.context
    .resume()
    .then(() => {
      if (url === pl.playing) return Promise.resolve();
      return getOrFetch(url);
    })
    .then(blob => {
      if (!blob) return Promise.resolve();
      dataBlob = blob;
      return player.load(blobToUrl(blob) || url);
    })
    .then(() => {
      pl.playing = url;
      player.start();
      pl.busy = false;
    })
    .then(() => {
      if(dataBlob){
        db.setItem(url, dataBlob);
      }
    })
    .catch(err => {
      pl.busy = false;
      console.log(err);
    });
};

function getOrFetch(url) {
  return db
    .getItem(url)
    .then(blob => {
      if(blob) console.log("Get from local db");
      return blob || fetchBlob(url);
    });
}

function blobToUrl(blob){
  return URL.createObjectURL(blob);
}


function fetchBlob(url) {
  return fetch(url).then(r => r.blob());
}
