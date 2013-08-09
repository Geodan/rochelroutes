var routes = {
	'Amsterdam': {
		'titel': 'Oscar\'s route van Amsterdam',
		'pad': 'data/amsterdam-1/'
	}
};
var route, data, huidigeTijd = 0, playbackRate = 1;

// kaart variabelen. locaties = alle plaatsen zoals: [ [ LatLon: { tijd: ?, hoogte: ? }, ... punten ... ], ... segmenten ... ]
// beginTijd = Date van eerste locatie. Huidigelocatie = segmentindex in locaties en puntindex, locatieMarker is marker op huidige locatie.
var locaties, beginTijd = 0, huidigeLocatie = { seg: 0, pt: 0 }, locatieMarker = null;

setRoute('Amsterdam');
function setRoute(routeNaam) {
	route = routeNaam;
	dataURL = routes[routeNaam].pad;
	$(document).ready(function() {
		$('#routenaam').html(routes[routeNaam].titel);
	});
}

$(document).ready(function() {
	canvasGrafiek();
	$('#knop-play-pause').click(togglePlay);
	$('#videotag').click(togglePlay);
	$('#knop-snelheid').click(toggleSpeed);
	
	// laad de kaart met openstreetmap laag
	var map = L.map('kaartje').setView([52.15, 5.30], 7);
	if (false && navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function(pos) {
				map.setView([pos.coords.latitude, pos.coords.longitude], 15);
		});
	}
	L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
		attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
	}).addTo(map);
	
	// voeg de gpx track toe
	var gpx = dataURL + 'track.gpx'; // URL to your GPX file or the GPX itself
	/*
	new L.GPX(gpx, {async: true}).on('loaded', function(e) {
		map.fitBounds(e.target.getBounds());
	}).addTo(map); */
	$.ajax({
		url: gpx,
		dataType: 'xml'
	}).done(function(data) {
		locaties = parse_gpx(data);
		if (locaties.length == 0) {
			return;
		}
		// http://leafletjs.com/reference.html#path-options
		var polyline_options = {
			color:'#7237A3',
			opacity: 1,
			weight: 3
		};
		beginTijd = locaties[0][0].tijd;
		huidigeLocatie.seg = 0; huidigeLocatie.pt = 0;
		locatieMarker = L.marker(locaties[0][0]).addTo(map);
		for (var i = 0; i < locaties.length; i++) {
			new L.polyline(locaties[i], polyline_options).addTo(map);
		}
	});
});

function setVideoSource() {
	$('#videosrc').attr('src', dataURL + 'movie.webm');
}


// events
function videoSpeeltaf(videotag) {
	updatePlayKnop();
	updateSnelheidKnop();
}
function videoPauseert(videotag) {
	updatePlayKnop();
	updateSnelheidKnop();
}
// als de gebruiker naar een ander tijdstip springt in de video
function videoSkipped(videotag) {
	setHuidigeTijd(videotag.currentTime, 'video');
}

function togglePlay() {
	var video = $('#videotag').get(0);
	if (video.paused) {
		video.play();
	} else {
		video.pause();
	}
	updatePlayKnop();
}
function toggleSpeed() {
	var video = $('#videotag').get(0);
	if (playbackRate === 1) {
		playbackRate = 4;
	} else {
		playbackRate = 1;
	}
	updateSnelheidKnop();
}

function updatePlayKnop() {
	var playknop = $('#knop-play-pause');
	if ($('#videotag').get(0).paused) {
		playknop.html('&#9656; Afspelen');
	} else {
		playknop.html('&#10073;&#10073; Pause');
	}
}
// regelt ook de snelheid van de video!
// Er is verschil tussen defaultPlaybackRate en playbackRate wat betreft pause en play drukken
function updateSnelheidKnop() {
	var snellerknop = $('#knop-snelheid'), video = $('#videotag');
	video.get(0).playbackRate = playbackRate;
	if (playbackRate === 1) {
		snellerknop.html('&#9193; Sneller afspelen');
	} else {
		snellerknop.html('&#9656; Langzamer afspelen');
	}
}

function grafiekGeklikt(event) {
	var graph = $('#canvas');
	var offset = graph.offset();
	var x = offset ? event.clientX - offset.left : event.clientX;
	
	var c = graph.get(0).getContext('2d');
	c.font = 'italic 9pt Arial';
	c.textAlign = 'right';
	c.textBaseline = 'middle';
	var paddingLeft = c.measureText('40000').width + 5;
	
	var paddingX = 15;
	var w = graph.width() - 2 * paddingX - paddingLeft;
	var xInGraph = x - paddingX - paddingLeft;
	if (xInGraph < 0) {
		xInGraph = 0;
	} else if (xInGraph > w) {
		xInGraph = w;
	}
	setHuidigeTijd(getXValue(w, xInGraph, getMinX(data), getMaxX(data)), 'grafiek');
}

function setHuidigeTijd(tijd, ignore) {
	huidigeTijd = tijd;
	// grafiek
	draw();
	// video
	if (ignore !== 'video') {
		$('#videotag').get(0).currentTime = huidigeTijd;
	}
	// kaart
	if (ignore !== 'kaart') {
		syncHuidigeLocatie();
		syncMarker();
	}
}

function syncHuidigeLocatie() {
	var loc = locaties[huidigeLocatie.seg][huidigeLocatie.pt];
	var millitijd = huidigeTijd * 1000;
	if (loc.tijd - beginTijd == millitijd) {
		return;
	} else if (loc.tijd - beginTijd < millitijd) {
		// verder in de tijd
		for (var i = huidigeLocatie.seg; i < locaties.length; i++) {
			var j = (i == huidigeLocatie.seg) ? huidigeLocatie.pt : 0;
			for ( ; j < locaties[i].length; j++) {
				// ga elk punt af vanaf seg,pt tot het laatste punt
				if (locaties[i][j].tijd - beginTijd > millitijd) {
					huidigeLocatie.seg = i;
					huidigeLocatie.pt = j;
					return;
				}
			}
		}
		huidigeLocatie.seg = i - 1;
		huidigeLocatie.pt = i - 1;
	} else {
		// terug in de tijd
		for (var i = huidigeLocatie.seg; i >= 0; i--) {
			var j = (i == huidigeLocatie.seg) ? huidigeLocatie.pt : locaties[i].length - 1;
			for ( ; j >= 0; j--) {
				// ga elk punt af vanaf seg,pt tot 0,0
				if (locaties[i][j].tijd - beginTijd < millitijd) {
					huidigeLocatie.seg = i;
					huidigeLocatie.pt = j;
					return;
				}
			}
		}
		huidigeLocatie.seg = 0;
		huidigeLocatie.pt = 0;
	}
}

function syncMarker() {
	locatieMarker.setLatLng(locaties[huidigeLocatie.seg][huidigeLocatie.pt]);
}

$(window).resize(function (e) {
	draw();
});

function canvasGrafiek() {
	var graph = $('#grafiek canvas');
	graph.click(grafiekGeklikt);
	$.getJSON(dataURL + 'meetresultaten.json').done(function(d) {
		data = d;
		draw();
	});
}

// grafiek hulpmethodes

function getMinX(data) {
	var min = false;
	for (var i = 0; i < data.length; i++) {
		if (min === false || data[i].time < min) {
			min = data[i].time;
		}
	}
	return min;
}
function getMaxX(data) {
	var max = false;
	for (var i = 0; i < data.length; i++) {
		if (max === false || data[i].time > max) {
			max = data[i].time;
		}
	}
	return max;
}
function getXPixel(w, value, min, max) {
    return w * (value - min) / (max - min);
}

function getXValue(w, pixel, min, max) {
	return pixel * (max - min) / w + min;
}
 
function getYPixel(h, value, max) {
    return h - (h * value / max);
}

function draw() {
	var graph = $('#canvas'), grafiek = $('#grafiek');
	var graphElem = graph.get(0);
	
	graphElem.width = grafiek.width();
	graphElem.height = grafiek.height();

	var maxY = 40000, paddingBottom = 0, paddingX = 15, paddingY = paddingX;
	var w = graph.width() - 2 * paddingX, h = graph.height() - 2 * paddingY;
	
	var c = graphElem.getContext('2d');
	
	// voor de y-asbeschrijving
	c.font = 'italic 9pt Arial';
	c.textAlign = 'right';
	c.textBaseline = 'middle';
	var paddingLeft = c.measureText(maxY.toString()).width + 5;
	
	
	c.fillStyle='#f8f8f8';
	c.fillRect(0, 0, graph.width(), graph.height());
	c.translate(paddingX, paddingY);
	
	
	if (data && data.length) {
		var minX = getMinX(data), maxX = getMaxX(data);
		// strepen
		c.strokeStyle = 'rgba(150,150,150, 0.5)';
		// verticale
		var aantalStrepen = (maxX - minX) / 50;
		for (var i = 0; i < aantalStrepen; i++) {
			var x = paddingLeft + (w - paddingLeft) * i / aantalStrepen;
			c.beginPath();
			c.moveTo(x, 0);
			c.lineTo(x, h - paddingBottom);
			c.stroke();
		}
		// horizontale
		aantalStrepen = maxY / 10000;
		for (var i = 0; i < aantalStrepen; i++) {
			var y = (h - paddingBottom) * i / aantalStrepen;
			c.beginPath();
			c.moveTo(paddingLeft, y);
			c.lineTo(w, y);
			c.stroke();
		}
		
		// clip
		c.save();
		c.beginPath();
		c.moveTo(paddingLeft, 0);
		c.lineTo(w, 0);
		c.lineTo(w, h - paddingBottom);
		c.lineTo(paddingLeft, h - paddingBottom);
		c.clip();
		
		// lijnen
		c.beginPath();
		c.moveTo(paddingLeft + getXPixel(w - paddingLeft, data[0].time, minX, maxX), getYPixel(h - paddingBottom, data[0].value, maxY));
		for(var i = 1; i < data.length; i ++) {
			c.lineTo(paddingLeft + getXPixel(w - paddingLeft, data[i].time, minX, maxX), getYPixel(h - paddingBottom, data[i].value, maxY));
		}
		c.lineTo(w, h - paddingBottom);
		c.lineTo(paddingLeft, h - paddingBottom);
		c.closePath();
		
		c.lineWidth = 2;
		c.fillStyle= 'rgba(150, 0, 180, 0.3)';
		c.fill();
		c.strokeStyle = 'rgba(200, 0, 255, 0.8)';
		c.stroke();
		
		// unclip
		c.restore();
	}
	
	c.lineWidth = 1;
	c.strokeStyle='#000';
	
	// assen
	c.beginPath();
	c.moveTo(paddingLeft, 0);
	c.lineTo(paddingLeft, h - paddingBottom);
	c.lineTo(w, h - paddingBottom);
	c.stroke();
	
	// ultrafijnstof y-asbeschrijving, bv 40000, 35000, 30000
	c.fillStyle='#333333';
	for (var i = 0; i <= aantalStrepen; i++) {
		var y = h - paddingBottom - (h - paddingBottom) * i / aantalStrepen;
		var value = maxY * i / aantalStrepen;
		c.fillText(value, paddingLeft - 5, y);
	}
	// huidigeTijd tekenen
	if (data && data.length && huidigeTijd <= maxX) {
		c.strokeStyle = '#0044ff';
		var x = paddingLeft + getXPixel(w - paddingLeft, huidigeTijd, minX, maxX);
		c.beginPath();
		c.moveTo(x, 0);
		c.lineTo(x, h);
		c.stroke();
	}
	
	/*lastHuidigeTijd = huidigeTijd;
	lastWidth = graphElem.width;
	lastHeight = graphElem.height;*/
}