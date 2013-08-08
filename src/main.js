var dataURL = "data/amsterdam-1/";

var data;
var huidigeTijd = 0;

function update() {
	if ((huidigeTijd ++) >= getMaxX(data)) {
		huidigeTijd = 0;
		clearInterval(updateInterval);
	}
	draw();
}

updateInterval = setInterval(function() { update(); }, 100);



function ajax() {
	if (window.XMLHttpRequest) {
		return new XMLHttpRequest();
	} else {// IE6, IE5
		return new ActiveXObject("Microsoft.XMLHTTP");
	}
}

function setVideoSource() {
	var videoURL = dataURL + "movie.webm";
	document.getElementById('videosrc').setAttribute("src", videoURL);
}

function loadData(callback) {
	var meetresultaten = dataURL + "meetresultaten.json";
	var data;
	var ajaxHttp = ajax();
	ajaxHttp.onreadystatechange = function() {
		if (ajaxHttp.readyState == 4 && ajaxHttp.status == 200) {
			var response = ajaxHttp.responseText;
			var data = grafiekGegevens(response);
			callback(data);
		}
	};
	ajaxHttp.open("GET", meetresultaten, true);
	ajaxHttp.send();
}

// gegevens voor de grafiek
function grafiekGegevens(json) {
	json = JSON.parse(json);
	var gegevens = [];
	for (var i in json) {
		gegevens[i] = {x: json[i]['time'], y: json[i]['value'] };
	}
	return gegevens;
}

function videoSpeeltaf() {
	console.log("play");
}

function videoPauseert() {
	console.log("pause");
}
// als de gebruiker naar een ander tijdstip springt in de video
function videoSkipped() {
	console.log("skip");
}

function attachListeners(videotag) {
	videotag.onplaying = videoSpeeltaf;
	videotag.onpause = videoPauseert;
	videotag.ontimeupdate = videoSkipped;
}


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

function canvasGrafiek() {

graph = document.createElement("canvas");
graph.innerHTML = '&nbsp;';
document.getElementById("grafiek").appendChild(graph);

//loadData(function (d) {
//	data = d;
//}
data = [
/*	{"x": 0, "y": 10000},
	{"x": 5, "y": 20000},
	{"x": 10, "y": 40000},
	{"x": 15, "y": 5000},
*/
{"x":0,"y":15859},
{"x":5,"y":20717},
{"x":10,"y":16176},
{"x":15,"y":12939},
{"x":20,"y":11530},
{"x":25,"y":13006},
{"x":30,"y":14334},
{"x":35,"y":13324},
{"x":40,"y":16772},
{"x":45,"y":16619},
{"x":50,"y":10962},
{"x":55,"y":14319},
{"x":60,"y":15988},
{"x":65,"y":14204},
{"x":70,"y":14545},
{"x":75,"y":15647},
{"x":80,"y":15084},
{"x":85,"y":14291},
{"x":90,"y":13824},
{"x":95,"y":12314},
{"x":100,"y":12362},
{"x":105,"y":12434},
{"x":110,"y":12583},
{"x":115,"y":11924},
{"x":120,"y":13430},
{"x":125,"y":23247},
{"x":130,"y":18403},
{"x":135,"y":29904},
{"x":140,"y":26936},
{"x":145,"y":18874},
{"x":150,"y":17253},
{"x":155,"y":79216},
{"x":160,"y":184584},
{"x":165,"y":66522}
];

	draw();
//});

}

function getMinX(data) {
	var min = false;
	for (var i = 0; i < data.length; i++) {
		if (min === false || data[i].x < min) {
			min = data[i].x;
		}
	}
	return min;
}
function getMaxX(data) {
	var max = false;
	for (var i = 0; i < data.length; i++) {
		if (max === false || data[i].x > max) {
			max = data[i].x;
		}
	}
	return max;
}
/*
function getMaxY(data) {
    var max = 0;
    for(var i = 0; i < data.length; i ++) {
        if (data[i].y > max) {
            max = data[i].y;
        }
    }
    max += 10 - max % 10;
    return max;
}
*/
function getXPixel(w, value, min, max) {
    return w * (value - min) / (max - min);
}
 
function getYPixel(h, value, max) {
    return h - (h * value / max);
}

var graph;

function draw() {
	graph.width = $("#grafiek").width();
	graph.height = $("#grafiek").height();
	var paddingLeft = 20, paddingBottom = 0;
	var paddingX = 15, paddingY = paddingX;
	var w = graph.width - 2 * paddingX, h = graph.height - 2 * paddingY;
	
	var maxHeight = 40000;
	
	var c = graph.getContext("2d");
	
	// voor de y-asbeschrijving
	c.font = 'italic 9pt Verdana';
	c.textAlign = 'right';
	c.textBaseline = 'middle';
	
	
	c.fillStyle="#eeeeee";
	c.fillRect(0,0,graph.width,graph.height);
	c.translate(paddingX, paddingY);
	
	
	if (data && data.length) {
		var minX = getMinX(data), maxX = getMaxX(data);
		var maxY = 40000;
		
		paddingLeft = c.measureText(maxY.toString()).width + 5;
		
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
		aantalStrepen = maxY / 5000;
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
		c.moveTo(paddingLeft + getXPixel(w - paddingLeft, data[0].x, minX, maxX), getYPixel(h - paddingBottom, data[0].y, maxY));
		for(var i = 1; i < data.length; i ++) {
			c.lineTo(paddingLeft + getXPixel(w - paddingLeft, data[i].x, minX, maxX), getYPixel(h - paddingBottom, data[i].y, maxY));
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
		c.moveTo(x, -paddingY);
		c.lineTo(x, h + paddingY);
		c.stroke();
	}
}