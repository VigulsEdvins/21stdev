(function () {
  // Build the starburst polygon: alternating outer and inner points, slightly irregular so it feels hand-cut.
  var pts = [], spikes = 14;
  for (var i = 0; i < spikes * 2; i++) {
    var a = i * Math.PI / spikes, r = i % 2 ? 28 : (44 + (i % 4 ? 0 : 4));
    pts.push((Math.cos(a) * r).toFixed(1) + ',' + (Math.sin(a) * r).toFixed(1));
  }
  document.getElementById('sbStar').setAttribute('points', pts.join(' '));
  // pathLength-style dash: normalise the scribble so the draw-in works at any width
  var p = document.querySelector('.sb-scribble path');
  p.setAttribute('pathLength', '1');
})();
