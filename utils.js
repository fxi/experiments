/* jshint esversion:6 */

export {onNextFrame, paramsToObject, objectToState};

var nf =
  window.requestAnimationFrame ||
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
function onNextFrame(cb) {
  nf(cb);
}

/**
 * Get url query parameter by name
 * @param {String} name Name of the query request name
 * @note http://www.netlobo.com/url_query_string_javascript.html
 */
//function getUrlParameter(name) {
  //name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
  //var regexS = '[\\?&]' + name + '=([^&#]*)';
  //var regex = new RegExp(regexS);
  //var results = regex.exec(window.location.href);
  //if (results == null) return '';
  //else return results[1];
/*}*/

/**
 * Returns an Array of all url parameters
 * @return {[Array]} [Key Value pairs form URL]
 */
function paramsToObject(params) {
  var param;
  var out = {};
  var dec = decodeURIComponent;
  params = params ? params.split('&') : window.location.search.substring(1).split('&');
  for (var i = 0, iL = params.length; i < iL; i++) {
    param = params[i].split('=');
    out[param[0].toLowerCase()] = dec(param[1]);
  }
  return out;
}

/**
 * Replace current url state using object values
 *
 * @param {Object} query Params to replace state with
 * @return null
 */
function objectToState(query) {
  onNextFrame(function() {
    var out = '/';
    var params = paramsToObject();
    var keysNew = Object.keys(query);
    var dat;
    var val;
    keysNew.forEach(kn => {
      val = query[kn];
      if (val) {
        params[kn] = val;
      } else {
        delete params[kn];
      }
    });

    if (params) {
      out = out + '?' + objectToParams(params);
    }
    history.replaceState(null, null, out);
  });
}


/**
 * Convert object to params string
 *
 * @param {Object} data
 * @return {String} params string
 */
export function objectToParams(data){
  var esc = encodeURIComponent;
  var params = [];

  Object.keys(data)
    .forEach(k => {
      if(k){
        params.push(esc(k) + '=' + esc(data[k]));
      }
    });

  return params.join('&');

}
