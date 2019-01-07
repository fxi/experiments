/* jshint esversion:6 */
import './style.css';
import {SoundCloud} from './soundcloud.js';
import {Visualiser} from './visualiser.js';
import {Player} from './player.js';
import {paramsToObject,objectToState} from './utils.js';
var elCanvas = document.getElementById('anim');
var elBadge = document.getElementById('badge');
var query = paramsToObject();
query.artistsong = query.artistsong || "hungry-music/worakls-salzburg";
objectToState(query);

/**
 * Player
 */
var player = new Player();

/**
 * Sound visualiser
 */
var visualiser = new Visualiser({
  elCanvas: elCanvas,
  analyserFFT: player.analyserFFT,
  analyser: player.analyser,
  width: window.innerWidth,
  height: window.innerHeight,
  message: 'Press space to start',
});

visualiser.msg();

/**
 * SoundCloud
 */
var soundcloud = new SoundCloud({
  elBadge: elBadge,
  idClient: 'b95f61a90da961736c03f659c03cb0cc',
  dark: false,
  tips:
    'Press space to start/stop; Use mouse to draw; Press keys 1 or 2 to switch animation mode.',
  attribution:
    'Animation made by <a href="https://github.com/fxi" target="_blank">Fred Moser</a>. Tested only on Chrome.',
});

soundcloud
  //.addTracksBySets('hungry-music/sets/hungry-5-compilation')
  //.addTrackByArtistSong('hungry-music/worakls-salzburg')
  //.addTrackByArtistSong('deafheaven-official/from-the-kettle-onto-the-coil')
  .addTrackByArtistSong(query.artistsong)
  .then(() => {
    /**
     * Listners
     */
    window.addEventListener('keydown', function(e) {
      switch (e.keyCode) {
        case 32:
          soundcloud.getTrack().then(track => {
            if (!visualiser.isEnabled()) {
              player.play(track.stream_url_full);
              visualiser.start();
              console.log('start');
            } else {
              player.stop();
              visualiser.stop();
              console.log('stop');
            }
          });
          break;
        case 49:
          visualiser.setMode(1);
          break;
        case 50:
          visualiser.setMode(2);
          break;
        default:
          console.log(e.keyCode);
      }
    });

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
