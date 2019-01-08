/* jshint esversion:6 */
/* based on https://github.com/hughsk/soundcloud-badge */

import fonts from 'google-fonts';
import minstache from 'minstache';
import querystring from 'querystring';
import './badge.css';
import templateHtml from './badge.html';
export {SoundCloud};


var icons = {
  black: 'https://developers.soundcloud.com/assets/logo_black.png',
  white: 'https://developers.soundcloud.com/assets/logo_white.png',
};

var badgeTemplate = minstache.compile(templateHtml);

fonts.add({'Open Sans': [300, 600]});


function SoundCloud(opt) {
  var sc = this;
  sc.opt = {};
  sc.tracks = [];
  sc.pos = 0;
  sc.setOptions(opt);
  sc.opt.icon = sc.opt.dark ? icons.black : icons.white;
  sc.elBadge = sc.opt.elBadge;
}

SoundCloud.prototype.getTrack = function(pos) {
  let sc = this;
  sc.pos = isFinite(pos) ? pos : sc.pos || 0;
  let track = sc.tracks[sc.pos];
  if (track && track.kind == 'track') {
    let query = querystring.stringify({
      client_id: sc.opt.idClient
    });
    track.stream_url_full = track.stream_url + "?" + query;
    sc.updateBadge(track);
    return Promise.resolve(track);
  } else {
    return Promise.resolve();
  }
};

SoundCloud.prototype.getNextTrack = function() {
  let sc = this;
  sc.pos = sc.pos + 1 > sc.tracks.length - 1 ? 0 : sc.pos + 1;
  let track = sc.getTrack(sc.pos);
  return Promise.resolve(track);
};

SoundCloud.prototype.updateBadge = function(track) {
  let sc = this;
  sc.elBadge.classList[ sc.opt.dark ? 'remove' : 'add']('npm-scb-white');
  sc.elBadge.innerHTML = badgeTemplate({
    artwork: track.artwork_url || track.user.avatar_url,
    artist: track.user.username,
    title: track.title,
    tips: sc.opt.tips,
    attribution: sc.opt.attribution,
    icon: sc.opt.icon,
    urls: {
      song: track.permalink_url,
      artist: track.user.permalink_url,
    },
  });
};

SoundCloud.prototype.addTrack = function(data) {
  let sc = this;
  if (data && data.kind == 'track') {
    sc.tracks.push(data);
    return true;
  } else {
    return false;
  }
};

SoundCloud.prototype.addTrackByArtistSong = function(artistSong) {
  let sc = this;
  return sc
    .fetchTrackByArtistSong(artistSong)
    .then(track => sc.addTrack(track))
    .then(() => sc.tracks);
};

SoundCloud.prototype.addTracksBySets = function(artistSetsName) {
  let sc = this;
  return sc
    .fetchTracksBySets(artistSetsName)
    .then(tracks => {
      tracks.forEach(track => sc.addTrack(track));
    })
    .then(() => sc.tracks);
};

SoundCloud.prototype.fetchResolveUrl = function(url) {
  let sc = this;
  let query = querystring.stringify({
    client_id: sc.opt.idClient,
    url: url,
  });
  let fetchUrl = 'http://api.soundcloud.com/resolve.json?' + query;
  return fetch(fetchUrl)
    .then(response => response.json())
    .then(data => {
      return data;
    });
};

SoundCloud.prototype.fetchTrackByArtistSong = function(artistSong) {
  let sc = this;
  let url = 'https://soundcloud.com/' + artistSong;
  return sc.fetchResolveUrl(url);
};

// hungry-music/sets/hungry-5-compilation
SoundCloud.prototype.fetchTracksBySets = function(artistSetsName) {
  let sc = this;
  let url = 'https://soundcloud.com/' + artistSetsName;
  return sc.fetchResolveUrl(url).then(data => data.tracks);
};

SoundCloud._options_default = {
  elBadge : document.createElement("div"),
  dark: true,
  idClient: '',
  song: '',
  getFonts: true,
  tips: '',
  attribution: '',
};

SoundCloud.prototype.setOptions = function(opt) {
  var sc = this;
  opt = opt || {};
  var options = SoundCloud._options_default;
  Object.keys(options).forEach(o => {
    if (typeof opt[o] == 'undefined') {
      sc.opt[o] = options[o];
    } else {
      sc.opt[o] = opt[o];
    }
  });
};
