var folder = 'src/';
parse_gpx = function(xml) {
    var coords = [];
    var tags = [['rte','rtept'], ['trkseg','trkpt']];
    for (var j = 0; j < tags.length; j++) {
      var el = xml.getElementsByTagName(tags[j][0]);
      for (var i = 0; i < el.length; i++) {
        var trackSegment = parse_trkseg(el[i], xml, tags[j][1]);
        if (trackSegment.length > 0) {
			coords.push(trackSegment);
		}
      }
    }
	return coords;
};

parse_trkseg = function(line, xml, tag) {
    var el = line.getElementsByTagName(tag);
    if (!el.length) return [];
    var coords = [];
    for (var i = 0; i < el.length; i++) {
      var tmp, ll = new L.LatLng(el[i].getAttribute('lat'), el[i].getAttribute('lon'));
      ll.tijd = null;
	  ll.hoogte = null;
      
	  tmp = el[i].getElementsByTagName('time');
      if (tmp.length > 0) {
        ll.tijd = new Date(Date.parse(tmp[0].textContent));
      }
      tmp = el[i].getElementsByTagName('ele');
      if (tmp.length > 0) {
        ll.hoogte = parseFloat(tmp[0].textContent);
      }
      coords.push(ll);
    }
    return coords;
};