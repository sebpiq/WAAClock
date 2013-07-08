// Detect Web Audio API
if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined')
  alert('Your browser doesn\'t seem to support Web Audio API')

// Code highlight
$(function() {
  var jsFileName = document.URL.split('/').slice(-1)[0].replace('.html', '.js')
  $.get(jsFileName, function(content) {
    Rainbow.color(content, 'javascript', function(hlCode) {
      $('<pre><code data-language="javascript">' + hlCode + '</code></pre>')
        .appendTo('#source')
    })
  }, 'text')
})

// Parsing the query params
var QUERY = {}
location.search.slice(1).split('&').forEach(function(el) {
  var pair = el.split('=')
  QUERY[pair[0]] = parseInt(pair[1], 10)
})
