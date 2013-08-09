var routes = {
	"amsterdam-1": {
		"titel": "Oscar's route van Amsterdam",
		"pad": "data/amsterdam-1/"
	}
};
var route, data, huidigeTijd = 0, playbackRate = 1;

setRoute("amsterdam-1");
function setRoute(routeNaam) {
	route = routeNaam;
	dataURL = routes[routeNaam].pad;
	var routenaam = $("#routenaam");
	if (routenaam.length == 0) {
		$(function() {
			var routenaam = $("#routenaam");
			routenaam.html(routes[routeNaam].titel);
		});
	} else {
		routenaam.html(routes[routeNaam].titel);
	}
}

$(document).ready(function() {
	canvasGrafiek();
	$("#knop-play-pause").click(togglePlay);
	$("#knop-snelheid").click(toggleSpeed);
});

function setVideoSource() {
	$("#videosrc").attr("src", dataURL + "movie.webm");
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
	setHuidigeTijd(videotag.currentTime, "video");
}

function togglePlay() {
	var video = $("#videotag").get(0);
	if (video.paused) {
		video.play();
	} else {
		video.pause();
	}
	updatePlayKnop();
}
function toggleSpeed() {
	var video = $("#videotag").get(0);
	if (playbackRate === 1) {
		playbackRate = 4;
	} else {
		playbackRate = 1;
	}
	updateSnelheidKnop();
}

function updatePlayKnop() {
	var playknop = $("#knop-play-pause");
	if ($("#videotag").get(0).paused) {
		playknop.html("&#9656; Afspelen");
	} else {
		playknop.html("&#10073;&#10073; Pause");
	}
}
// regelt ook de snelheid van de video!
// Er is verschil tussen defaultPlaybackRate en playbackRate wat betreft pause en play drukken
function updateSnelheidKnop() {
	var snellerknop = $("#knop-snelheid"), video = $("#videotag");
	video.get(0).playbackRate = playbackRate;
	if (playbackRate === 1) {
		snellerknop.html("&#9193; Sneller afspelen");
	} else {
		snellerknop.html("&#9656; Langzamer afspelen");
	}
}

function grafiekGeklikt(event) {
	var graph = $("#canvas");
	var offset = graph.offset();
	var x = offset ? event.clientX - offset.left : event.clientX;
	
	var c = graph.get(0).getContext("2d");
	
	// voor de y-asbeschrijving
	c.font = 'italic 9pt Arial';
	c.textAlign = 'right';
	c.textBaseline = 'middle';
	
	var paddingLeft = c.measureText("40000").width + 5;
	var paddingX = 15;
	var w = graph.width() - 2 * paddingX - paddingLeft;
	console.log(w);
	var xInGraph = x - paddingX - paddingLeft;
	if (xInGraph < 0) {
		xInGraph = 0;
	} else if (xInGraph > w) {
		xInGraph = w;
	}
	setHuidigeTijd(getXValue(w, xInGraph, getMinX(data), getMaxX(data)), "grafiek");
}

function setHuidigeTijd(tijd, ignore) {
	huidigeTijd = tijd;
	//if (ignore !== "grafiek") {
		draw();
	//}
	if (ignore !== "video") {
		$("#videotag").get(0).currentTime = huidigeTijd;
	}
}

/*
function svgGrafiek() {

// laad de gegevens via ajax, als dat gedaan is wordt de functie aangeroepen
loadData(function(data) {
	data = [
		{
			area: true,
			values: data,
			key: "ultrafijnstof",
			color: "#ff7f0e"
		}
	];

	nv.addGraph(function() {
		var chart = nv.models.lineChart();
		chart.x(function(d,i) { return i });
		chart.xAxis // chart sub-models (ie. xAxis, yAxis, etc) when accessed directly, return themselves, not the parent chart, so need to chain separately
			.tickFormat(d3.format('d'));
		chart.yAxis
			.axisLabel('Ultrafijnstof (particles/cm^3)')
			.tickFormat(d3.format(',r'));
		chart.showYAxis(true);
		var svg = d3.select("#grafiek").append("svg");
		svg.datum(data)
			.transition().duration(100)
			.call(chart);
		return chart;
	});
});

}
*/

$(window).resize(function (e) {
	draw();
});

function canvasGrafiek() {
	var graph = $("#grafiek canvas");
	//graph.html("&nbsp;");
	graph.click(grafiekGeklikt);
	$.getJSON(dataURL + "meetresultaten.json").done(function(d) {
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
	// pixel = w * (value - min) / (max - min)
	// value = pixel * (max - min) / w + min
	return pixel * (max - min) / w + min;
}
 
function getYPixel(h, value, max) {
    return h - (h * value / max);
}

//var lastHuidigeTijd = -1, lastWidth, lastHeight;

function draw() {
	var graph = $("#canvas"), grafiek = $("#grafiek");
	var graphElem = graph.get(0);
	
	graphElem.width = grafiek.width();
	graphElem.height = grafiek.height();
	
	/*if (graphElem.width == lastWidth && graphElem.height == lastHeight && huidigeTijd == lastHuidigeTijd) {
		return;
	}
	*/
	var maxY = 40000;
	var paddingBottom = 0;
	var paddingX = 15, paddingY = paddingX;
	var w = graph.width() - 2 * paddingX, h = graph.height() - 2 * paddingY;
	
	var maxHeight = 40000;
	
	var c = graphElem.getContext("2d");
	
	// voor de y-asbeschrijving
	c.font = 'italic 9pt Arial';
	c.textAlign = 'right';
	c.textBaseline = 'middle';
	
	var paddingLeft = c.measureText(maxY.toString()).width + 5;
	
	
	c.fillStyle="#f8f8f8";
	c.fillRect(0, 0, graph.width(), graph.height());
	c.translate(paddingX, paddingY);
	
	
	if (data && data.length) {
		var minX = getMinX(data), maxX = getMaxX(data);
		// strepen
		c.strokeStyle = 'rgba(150,150,150, 0.5)';
		// verticale
		var aantalStrepen = (maxX - minX) / 25;
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
	c.strokeStyle="#000";
	
	// assen
	c.beginPath();
	c.moveTo(paddingLeft, 0);
	c.lineTo(paddingLeft, h - paddingBottom);
	c.lineTo(w, h - paddingBottom);
	c.stroke();
	
	// ultrafijnstof y-asbeschrijving, bv 40000, 35000, 30000
	c.fillStyle="#333333";
	for (var i = 0; i <= aantalStrepen; i++) {
		var y = h - paddingBottom - (h - paddingBottom) * i / aantalStrepen;
		var value = maxY * i / aantalStrepen;
		c.fillText(value, paddingLeft - 5, y);
	}
	// huidigeTijd tekenen
	if (data && data.length && huidigeTijd <= maxX) {
		c.strokeStyle = "#0044ff";
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