/* jshint esversion: 6 */
import mapboxgl from 'mapbox-gl';
import proj4 from 'proj4';
import { contours } from 'd3-contour';
import Handsontable from 'handsontable';
import geotiff from 'geotiff';
import 'bootstrap/dist/css/bootstrap.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import 'handsontable/dist/handsontable.css';
import './style.css';
const d3Contours = contours;

/**
* Original code and inspiration:
* https://jsfiddle.net/stefanhaustein/orpenu8s/62/embedded/result/
* https://bl.ocks.org/mbostock/83c0be21dba7602ee14982b020b12f51
* https://github.com/santilland/plotty
* https://github.com/geotiffjs/geotiff.js/
* https://gist.github.com/stella-yc/49a7b96679ab3bf06e26421fc81b5636
*/


/**
 * TODO: 
 * - Add DEM support when calculating cost
 * - Add Transportation mode support : bicycle, walking, motorized
 * - Add population support
 * - Replace mapbox gl by http://jsfiddle.net/fxi/jy52movr/
 */


/**
 * Set pro4 projection definition
 */
proj4.defs([
  [
    'EPSG:4326',
    '+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees'],
  [
    'EPSG:32630',
    '+proj=utm +zone=30 +datum=WGS84 +units=m +no_defs'
  ]
]);

/**
 * Empty geojson
 */
var baseGeoJSON = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "MultiPolygon",
        "value": 0,
        "coordinates": []
      }
    }]
};

/**
 * Simple layer storage
 */
var layers = {
  landCover : {
    ctx : null,
    url : "./landcover.tiff",
    tiff : null,
    image : null,
    canvas : document.createElement("canvas"),
    raster : null,
    cellSize : [924.833227181229745,924.833227181232814],
    graph : null,
    dijkstra : null,
    nodes : []
  },
  travelTime : {
    costs : [],
    ctx : null,
    canvas : document.createElement("canvas")
  }
};


/**
 * Travel scenario
 */
var defaultModelRule = {class:classNull,name:'barrier',speed:0,mode:0,color_hex:'#000000'};
var model=[
  {class:1,name:'Bare areas',speed:2.5,mode:1,color_hex:'#1a4cf6'},
  {class:2,name:'Urban',speed:2.5,mode:1,color_hex:'#a07d60'},
  {class:3,name:'Low dense vegetation',speed:2,mode:1,color_hex:'#dbfc40'},
  {class:4,name:'Medium dense vegetation',speed:1.5,mode:1,color_hex:'#dbd740'},
  {class:5,name:'Dense vegetation',speed:1,mode:1,color_hex:'#987ab8'},
  {class:2001,name:'Primary road',speed:80,mode:3,color_hex:'#ccb3fe'},
  {class:2002,name:'Secondary road',speed:70,mode:3,color_hex:'#0a283f'},
  {class:2003,name:'Tertiary road',speed:60,mode:3,color_hex:'#363449'},
  {class:2004,name:'Urban road',speed:50,mode:3,color_hex:'#f05acf'}
];
convertModelColorsToRgb(model);


/*
 * Get DOM elements
 */
var elPos = document.getElementById('pos');
var elMaxTimeHour = document.getElementById('maxTimeHour');
//var elClass = document.getElementById('class');
var elMap = document.getElementById('map');
var elTable = document.getElementById('tblModel');
var elBtnDownload = document.getElementById('btnDownload');
elBtnDownload.addEventListener("click",e=>{
  downloadIsolineData();
});
/**
 * Set init variables
 */
var mapboxToken = '';
var epsgProject = 'EPSG:32630';
var epsgMap = 'EPSG:4326';
var bbxUtm = [180946.466, 1733383.302, 1151096.521,  998140.887];
var bbxMapLngLat = [projToMap([bbxUtm[0],bbxUtm[1]]),projToMap([bbxUtm[2],bbxUtm[3]])];
var bbxMapLngLatFull = [
  projToMap([bbxUtm[0],bbxUtm[1]]),
  projToMap([bbxUtm[2],bbxUtm[1]]),
  projToMap([bbxUtm[2],bbxUtm[3]]),
  projToMap([bbxUtm[0],bbxUtm[3]])

];
var bbxMap = bbxMapLngLat;
var bbxMapFull = bbxMapLngLatFull.map(c => [c[1],c[0]]);

var nContour = 3;
var maxTimeHour = 3;
var run = 0;
var currentY = 0;
var yDone = -1;
var classNull = 65535;


/* Init map */
var map = new mapboxgl.Map({
  container: elMap,
  //style: 'mapbox://styles/mapbox/dark-v9',
  style: {
    "version": 8,
    "name": "simple",
    "zoom": 8,
    "center": [
      0,
      0
    ],
    "sources": {},
    "layers": []
  },
  center: [0, 0],
  zoom: 3,
  preserveDrawingBuffer : true
});


map.on('load',function(){
  map.fitBounds(bbxMap);
  var nav = new mapboxgl.NavigationControl();
  map.addControl(nav, 'top-right');
  map.addSource('canvas-landcover',{
    type: 'canvas',
    canvas: layers.landCover.canvas,
    animate: true,
    coordinates: bbxMapLngLatFull
  });
  map.addSource('canvas-traveltime',{
    type: 'canvas',
    canvas: layers.travelTime.canvas,
    animate: true,
    coordinates: bbxMapLngLatFull
  });
  map.addLayer({
    "id": "landcover",
    "source": "canvas-landcover",
    "type": "raster",
    "paint": {"raster-opacity":1}
  });
  map.addLayer({
    "id": "traveltime",
    "source": "canvas-traveltime",
    "type": "raster",
    "paint": {"raster-opacity": 0.7}
  });
  map.addLayer({
    "id": "isoline",
    'type': 'fill',
    "source":{
      'type': 'geojson',
      'data': baseGeoJSON
    },
    'paint': {
      'fill-color': 'rgba(0,0,0,0)',
      'fill-outline-color': 'rgba(0,0,0,0)'
    }
  });

  var popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false
  });

  map.on('click',function(e){
    getContours();
    downloadIsolineData();
  });

  map.on('mousemove',function(e){

    var ldc = layers.landCover;
    var pos =  latLngToPix(e.lngLat);

    if(!pos.x || !pos.y) return;

    maxTimeHour = elMaxTimeHour.value;

    //var pixel = ldc.ctx.getImageData(pos.x, pos.y, 1, 1);
    //var data = pixel.data;
    var value = ldc.raster[pos.x+pos.y*ldc.image.width];
    var type = model.find(m => m.class == value);
    var name = type ? type.name : "-";

    //renderCanvasOnMap();
    //elClass.innerText = name;
    popup.setLngLat(e.lngLat)
      .setHTML(name)
      .addTo(map);

    if(!type){
      popup.remove();
    }

    if(!pos.x || !pos.y) return;
    yDone = -1;
    initTravelTime()
      .then(() =>{
        compute(pos.x,pos.y);
      });
  });

  map.on('mouseleave', function() {
    popup.remove();
  });

  initData({
    url : layers.landCover.url,
    model : model,
    modelContainer : elTable
  });


});

function initData(opt){
  var url = opt.url;
  var ldc = layers.landCover;

  /**
   * Init model table
   */
  var hot = new Handsontable(opt.modelContainer, {
    data: model,
    minSpareCols: 0,
    minSpareRows: 0,
    colHeaders: ['Class', 'Name', 'Speed (kmh)','Mode','Color'],
    contextMenu: false,
    rowHeaders: false,
    columns: [
      {data: 'class',header:"test"},
      {data: 'name'},
      {data: 'speed',type:'numeric'},
      {data: 'mode',type:'numeric'},
      {data: 'color_hex',renderer:colorRenderer}
    ],
    afterChange: function (change, source) {
      if (source === 'loadData') {
        return; //don't save this change
      }
      model = this.getSourceData();
      convertModelColorsToRgb(model);
      renderLandCover();
    }
  });

  /*
   *
   */
  fetch(url).then(response => {
    if (response.ok) {
      return response.arrayBuffer();
    }
    throw new Error('Network response was not ok.');

  })
    .then(dat => {
      var data = GeoTIFF.parse(dat);
      ldc.tiff = data.getImage();
      ldc.raster = ldc.tiff.readRasters()[0];
      renderLandCover();
    });

}

var locked = false;

function compute(x, y) {
  if(locked) return;
  locked = true;
  var ldc = layers.landCover;
  ldc.graph = new ImageGraph(ldc.image);
  ldc.dijkstra = new Dijkstra(ldc.graph, {
    x: x,
    y: y
  });

  step();
  locked = false;
}
/**
 * The interface the Dijkstra implementation below uses
 * to access the graph and to store the calculated final
 * and intermediate distance data.
 *
 * @Interface
 */
var Graph = function() {};

/**
 * Returns the current distance for the given node.
 *
 * @param {Object} node
 * @return {number}
 */
Graph.currentDistance = function(node) {};

/**
 * Stores the current distance for the given node.
 */
Graph.setCurrentDistance = function(node, distance) {};

/**
 * Returns an array of connected nodes for node, including
 * the distances.
 *
 * @param {Object}
 * @return {Array<{cost:number, node:Object}>}
 */
Graph.connections = function(node) {};

/**
 * Canvas image data based Graph implementation
 */
var ImageGraph = function(imageData) {
  this.imageData = imageData;
  this.distances = [];
};


ImageGraph.prototype.currentDistance = function(node) {
  var x = node.x;
  var y = node.y;
  var dy = this.distances[y];
  if (dy == null) {
    return Number.MAX_SAFE_INTEGER;
  }
  var d = dy[x];
  return d == null ? Number.MAX_SAFE_INTEGER : d;
};

ImageGraph.prototype.setCurrentDistance = function(node, distance) {
  var x = node.x;
  var y = node.y;
  var dy = this.distances[y];
  if (dy == null) {
    dy = this.distances[y] = [];
  }
  dy[x] = distance;
};

/**
 * Helper for connections()
 */

ImageGraph.prototype.getCost_ = function(x, y, result) {
  var ldc = layers.landCover;
  var cost /*seconds*/;
  var speed /*kmh*/;
  var node ;
  if (x >= 0 && y >= 0 && x < this.imageData.width && y < this.imageData.height) {
    node = ldc.nodes[x + (y * this.imageData.width)] ;
    speed = node.speed;
    if(speed){
      /* cost = distance [meter] -> convert to km -> get time -> covert to seconds */
      cost = (ldc.cellSize[0]/1000/speed)*3600;
      if( cost ){
        result.push({
          cost: cost,
          node: {
            x: x,
            y: y
          }
        });
      }
    }
  }
};

/**
 * Returns a list of objects contaning connected nodes and their costs.
 */
ImageGraph.prototype.connections = function(node) {
  var x = node.x;
  var y = node.y;
  var result = [];
  this.getCost_(x - 1, y, result);
  this.getCost_(x, y - 1, result);
  this.getCost_(x, y + 1, result);
  this.getCost_(x + 1, y, result);
  return result;
};

/**
 * @param {Graph} graph
 * @param {Object} startNode
 */
function Dijkstra(graph, startNode) {
  this.graph = graph;
  this.unexplored = [{
    cost: 0,
    node: startNode
  }];
  this.maxDistance = 0;
}

Dijkstra.prototype.step = function() {
  if (this.unexplored.length == 0) {
    return true;
  }
  var head = this.unexplored[0];
  var last = this.unexplored.pop();
  if (this.unexplored.length > 0) {
    this.unexplored[0] = last;
    this.sinkDown_(0);
  }

  var connections = this.graph.connections(head.node);
  for (var i = 0; i < connections.length; i++) {
    var con = connections[i];
    var cost = con.cost + head.cost;

    if (cost < this.graph.currentDistance(con.node) && cost < maxTimeHour * 3600) {

      con.cost = cost;
      if (cost > this.maxDistance) {
        this.maxDistance = cost;
      }
      this.graph.setCurrentDistance(con.node, cost);
      this.unexplored.push(con);
      this.bubbleUp_(this.unexplored.length - 1);
    }
  }
  return this.unexplored.length == 0;
};

Dijkstra.prototype.sinkDown_ = function(index) {
  var entry = this.unexplored[index];
  var cost = entry.cost;
  var len = this.unexplored.length;
  while (true) {
    var child2Index = (index + 1) * 2;
    var child1Index = child2Index - 1;
    var swapIndex = -1;
    var swapCost = cost;
    if (child1Index < len) {
      var child1 = this.unexplored[child1Index];
      if (child1.cost < swapCost) {
        swapIndex = child1Index;
        swapCost = child1.cost;
      }
    }
    if (child2Index < len) {
      var child2 = this.unexplored[child2Index];
      if (child2.cost < swapCost) {
        swapIndex = child2Index;
      }
    }
    if (swapIndex == -1) {
      return;
    }
    this.unexplored[index] = this.unexplored[swapIndex];
    this.unexplored[swapIndex] = entry;
    index = swapIndex;
  }
};

Dijkstra.prototype.bubbleUp_ = function(index) {
  var entry = this.unexplored[index];
  var cost = entry.cost;
  while (index > 0) {
    var parentIndex = Math.floor((index + 1) / 2) - 1,
      parent = this.unexplored[parentIndex];
    if (cost >= parent.cost) {
      break;
    }
    this.unexplored[parentIndex] = entry;
    this.unexplored[index] = parent;
    index = parentIndex;
  }
};

/* helpers */

function hexToRgb(hex) {

  hex = hex.replace('#','');
  var r = parseInt(hex.substring(0,2), 16);
  var g = parseInt(hex.substring(2,4), 16);
  var b = parseInt(hex.substring(4,6), 16);

  return [r,g,b];
}


function convertModelColorsToRgb(model){
  model.forEach(r => {
    r.color_rgb = hexToRgb(r.color_hex);
  });
}


function forEachPixel(width,height,cb){
  var nPix = width * height;
  var posRaster = 0;
  var posImage = 0;
  for (var r = 0; r < nPix  ; r ++ ) {
    posImage = r*4;
    posRaster = r;
    cb(posImage,posRaster);
  }
}


function initTravelTime(){
  return new Promise(function(resolve,reject){
    var tt =  layers.travelTime;
    var ldc = layers.landCover;
    var height = ldc.canvas.height;
    var width = ldc.canvas.width;
    tt.costs = new Array(height*width);
    tt.canvas.height = height;
    tt.canvas.width = width;
    tt.ctx = tt.canvas.getContext("2d");
    tt.image = tt.ctx.getImageData(0,0,width,height);
    tt.ctx.clearRect(0,0,width,height);
    resolve(true);
  });
}

function renderLandCover(){
  var ldc = layers.landCover;
  var width = ldc.tiff.getWidth();
  var height = ldc.tiff.getHeight();
  var raster= ldc.raster;
  ldc.canvas.height = height;
  ldc.canvas.width = width;
  ldc.ctx = ldc.canvas.getContext("2d");
  ldc.image = ldc.ctx.getImageData(0,0,width,height);
  ldc.nodes = [];

  var data = ldc.image.data;
  var color = [];
  var rule = null;
  var defaultNode = {s:0,m:0};
  var transparent = [0,0,0,0];
  forEachPixel(height,width,function(i,r){
    rule = model.find(rule => rule.class == raster[r]);
    color = rule ? rule.color_rgb.concat([255]) : transparent;
    ldc.nodes.push( rule ? rule : defaultModelRule );
    data[i] = color[0];
    data[i+1] = color[1];
    data[i+2] = color[2];
    data[i+3] = color[3];
  });

  ldc.ctx.putImageData(ldc.image, 0, 0,0,0,width,height);

  initTravelTime();
}

function getSizeOf(obj,humanReadable){
  var bytes = 0;
  var seenObjects = [];
  humanReadable = humanReadable === undefined ? true : humanReadable ;

  function sizeOf(obj) {
    if(obj !== null && obj !== undefined) {
      if(seenObjects.indexOf(obj) === -1){
        seenObjects.push(obj);
        switch(typeof obj) {
          case 'number':
            bytes += 8;
            break;
          case 'string':
            bytes += obj.length * 2;
            break;
          case 'boolean':
            bytes += 4;
            break;
          case 'object':
            var objClass = Object.prototype.toString.call(obj).slice(8, -1);
            if(objClass === 'Object' || objClass === 'Array') {
              for(var key in obj) {
                if(!obj.hasOwnProperty(key)) continue;
                sizeOf(obj[key]);
              }
            } else bytes += obj.toString().length * 2;
            break;
        }
        return bytes;
      }
    }
  }



  var res =  sizeOf(obj);

  if(!humanReadable){
    return res ;
  }else{
    return formatByteSize(res);
  }
}


/**
 * Format byte to human readable value
 */
function formatByteSize(bytes) {
  if(bytes < 1024) return bytes + " bytes";
  else if(bytes < 1048576) return(bytes / 1024).toFixed(3) + " KiB";
  else if(bytes < 1073741824) return(bytes / 1048576).toFixed(3) + " MiB";
  else return(bytes / 1073741824).toFixed(3) + " GiB";
}



/*
 * others
 */

/*function showPath(x, y) {*/
//var data = imageData.data;
//var min = 9e9;
//for (var j = 0; j < 10000; j++) {
//var newX = -1;
//var newY = -1;
//for (var dy = -1; dy < 2; dy++) {
//var row = imageGraph.distances[y + dy];
//if (row != null) {
//if (dy == 0) {
//for (var dx = -1; dx < 2; dx += 2) {
//if (row[x + dx] != null && row[x + dx] < min) {
//newX = x + dx;
//newY = y;
//min = row[x + dx];
//}
//}
//} else {
//if (row[x] != null && row[x] < min) {
//newX = x;
//newY = y + dy;
//min = row[x];
//}
//}
//}
//}
//if (newX == -1) break;
//x = newX;
//y = newY;
//data[(y * imageData.width + x) * 4 + 3] = 0;
//}
//ctx.putImageData(imageData, 0, 0, 0, 0, imageData.width, imageData.height);
//}

function step() {
  var ldc = layers.landCover;
  var tt = layers.travelTime;
  // Spend up to 100ms: 80ms calculating and 20ms updating the image
  var pos;
  var coord;
  var t0 = Date.now();
  while (yDone == -1 && Date.now() - t0 < 80) {
    if (ldc.dijkstra.step()) {
      yDone = currentY;
    }
  }
  var div = ldc.dijkstra.maxDistance / 255.0;

  do {

    var row = ldc.graph.distances[currentY];
    if (row != null) {
      for (var x = 0; x < tt.image.width; x++) {

        if (row[x] != null) {
          pos = (x + currentY * tt.image.width) * 4;    
          tt.image.data[ pos ] = 255 - row[x] / div;
          tt.image.data[ pos + 1 ] = 0 ;
          tt.image.data[ pos + 2 ] = 0 ;
          tt.image.data[ pos + 3 ] = 255; 

          tt.costs[x + currentY * tt.image.width] = Math.floor(row[x]);

        }


      }
      tt.ctx.putImageData(tt.image, 0, 0, 0, currentY, tt.image.width, 1);
    }
    currentY++;
    if (currentY >= ldc.image.height) {
      currentY = 0;
    }
  } while (currentY != yDone && Date.now() - t0 < 100);
  if (currentY != yDone) {
    window.setTimeout(step, 10);
  }
}




function colorRenderer (instance, td, row, col, prop, value, cellProperties) {
  var elInput = document.createElement('input');

  Handsontable.dom.addEvent(elInput, 'change', function (e){
    instance.setDataAtCell(row,col,this.value);
  });

  elInput.value = value;
  elInput.type = "color";
  Handsontable.dom.empty(td);
  td.appendChild(elInput);

  return td;
}
function projToMap(coord){
  return  proj4(epsgProject,epsgMap,coord);
}
function projToUtm(coord){
  return  proj4(epsgMap,epsgProject,coord);
}

function latLngToPix(latLng){
  var ldc = layers.landCover;
  var coordXY =  projToUtm([latLng.lng,latLng.lat]);


  var cX = coordXY[0];
  var cY = coordXY[1];
  var hPix = ldc.image.height;
  var wPix = ldc.image.width;
  var xMin = Math.min(bbxUtm[0],bbxUtm[2]) / ldc.cellSize[0];
  var yMax = Math.max(bbxUtm[1],bbxUtm[3]) / ldc.cellSize[1]; 
  var dX = (cX/ldc.cellSize[0]) - xMin;
  var dY = yMax-(cY/ldc.cellSize[1]);
  var posX = Math.round(dX);
  var posY = Math.round(dY);

  posX = posX <= 0 ? 0 : posX >= wPix ? wPix : posX;
  posY = posY <= 0 ? 0 : posY >= hPix ? hPix : posY;


  elPos.innerText = "x:" + posX  + " y:" + posY;

  return {
    x : posX,
    y : posY
  };

}
function pixTolatLng(x,y){

  var ldc = layers.landCover;

  var xMin = Math.min(bbxUtm[0],bbxUtm[2]);
  var yMax = Math.max(bbxUtm[1],bbxUtm[3]); 
  var lng = xMin + (x*ldc.cellSize[0]);
  var lat = yMax - (y*ldc.cellSize[1]);
  var coordLatLng =  projToMap([lng,lat]);

  return(coordLatLng);

}


function plotTravelTime(){
  var values = layers.travelTime.costs;
  var width = layers.landCover.canvas.width;
  var height = layers.landCover.canvas.height;
  var data = layers.travelTime.image.data;
  var pos = 0;
  var val = 255;

  for(var i=0,iL=width*height;i<iL;i++){
    pos = i*4;

    if(values[i]){
      data[pos] = 0;
      data[pos+1] = 0 ;
      data[pos+2] = 0;
      data[pos+3] = val;
    }
  }

  layers.travelTime.ctx.putImageData(layers.travelTime.image, 0, 0,0,0,width,height);

}

function getContours(){
  var tt = layers.travelTime;


  var width = layers.landCover.canvas.width;
  var height = layers.landCover.canvas.height;

  //var values = layers.travelTime.costs;
  var values = new Array(width*height);

  var data = tt.image.data;

  for(var i=0,iL=data.length;i<iL;i++){
    if(data[i*4]>0){
      values[i]=1;
    }else{
      values[i]=0;
    }

  }

  var contours = d3Contours()
    .size([width, height])
    .thresholds([1])
  //.thresholds([1,1*3600,2*3600,3*3600,4*3600])
  (values);

  contours.forEach(contour => {
    contour.coordinates.forEach(group => { 
      group.forEach(coord => { 
        coord.forEach((c,i) => {
          coord[i] = pixTolatLng(c[0],c[1]) ;
        });
      });
    });
  });


  var features = contours.map(c => newFeature(c));
  var out = newFeaturesCollection(features);
  elBtnDownload.disabled = false;
  updateIsoLine(out);
  return out;

}

function newFeature(geom){
  return  {
    "type": "Feature",
    "properties": {},
    "geometry": geom 

  };
}

function newFeaturesCollection(features){
  return {
    "type": "FeatureCollection",
    "features": features 
  };
}

function updateIsoLine(data){
  var layer = map.getSource("isoline");
  layer.setData(data);
}

function downloadIsolineData(){
  var layer = map.getSource("isoline");
  var data = new Blob([JSON.stringify(layer._data)], {type: "octet/stream"});
  var url =  URL.createObjectURL(data);
  var elFakeA = document.createElement("a");
  elFakeA.download = 'travel_time_experiment_catchment.geojson';
  elFakeA.href = url;
  elFakeA.target = '_blank';
  document.body.appendChild(elFakeA);
  elFakeA.click();
  elFakeA.remove();
}



