/* jshint esversion:6 */
import './style.css';
import {SoundCloud} from './soundcloud.js';
import {Visualiser} from './visualiser.js';
import {Player} from './player.js';
import {paramsToObject,objectToState} from './utils.js';

var elCanvas = document.getElementById('anim');
var elBadge = document.getElementById('badge');
var options = paramsToObject();
options.artistSong = options.artistSong || "hungry-music/worakls-salzburg";
objectToState(options);


/**
 * Player
 */
var player = new Player();

/**
 * Sound visualiser
 */
options.message = "Click / tap to start";

var visualiser = new Visualiser({
  elCanvas: elCanvas,
  analyserFFT: player.analyserFFT,
  analyser: player.analyser,
  width: window.innerWidth,
  height: window.innerHeight,
  options : options
});

visualiser.addGui();
/**
 * SoundCloud
 */
var soundcloud = new SoundCloud({
  elBadge: elBadge,
  idClient: 'b95f61a90da961736c03f659c03cb0cc',
  dark: false,
  tips:
    'Click to start / stop; Use mouse to draw; Press keys 1 or 2 to switch animation mode.',
  attribution:
    'Animation made by <a href="https://github.com/fxi" target="_blank">Fred Moser</a>. Tested only on Chrome.',
});


function toggle(){
  soundcloud.getTrack().then(track => {
    if (!visualiser.isEnabled()) {
      player.play(track.stream_url_full);
      visualiser.start();
    } else {
      player.stop();
      visualiser.stop();
    }
  });
}


soundcloud
  //.addTracksBySets('hungry-music/sets/hungry-5-compilation')
  //.addTrackByArtistSong('hungry-music/worakls-salzburg')
  //.addTrackByArtistSong('deafheaven-official/from-the-kettle-onto-the-coil')
  .addTrackByArtistSong(options.artistSong)
  .then(() => {
    /**
     * Listners
     */
    window.addEventListener('keydown', function(e) {
      switch (e.keyCode) {
/*        case 32:*/
          //toggle();
          /*break;*/
        case 49:
          visualiser.enablePolar();
          break;
        case 50:
          visualiser.enableRainbow();
          break;
        default:
          console.log(e.keyCode);
      }
    });

    elCanvas.addEventListener("click",toggle);

    elCanvas.addEventListener('mousemove', function(e) {
      visualiser.setPosition({
        x: e.clientX,
        y: e.clientY,
      });
    });

    elCanvas.addEventListener('mouseleave', function(e) {
      visualiser.setPosition({
        x: elCanvas.width / 2,
        y: elCanvas.height / 2,
      });
    });

    window.addEventListener('resize', function(e) {
      visualiser.setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    });
  })
  .catch(console.log);
