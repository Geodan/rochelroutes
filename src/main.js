var ie = (function(){
    var undef, v = 3, div = document.createElement('div');

    while (
        div.innerHTML = '<!--[if gt IE '+(++v)+']><i></i><![endif]-->',
        div.getElementsByTagName('i')[0]
    );

    return v> 4 ? v : undef;
}());

/* -----------------------------------------------------------------------------
 TODO:
 - testen in verschillende browsers (firefox, chrome, IE8 en IE9: functionaliteit en design)
 - share buttons, twitter, facebook
 - made by Geodan
 
 - flash fallback - http://mediaelementjs.com/ - ?
 ------------------------------------------------------------------------------*/
var fullScreenImgURL = {
    enlarge: 'src/enlarge-white.png',
    shrink: 'src/shrink-white.png'
};
var routes = [
   new Route('Amsterdam - Weesperstraat','Florien\'s route van Amsterdam','ams-weesper'),
   new Route('Amsterdam - Piet Heinkade','Kees\' route van Amsterdam','ams-piethein'),
   new Route('Amsterdam - Wibautstraat','Bert\'s route van Amsterdam','ams-wibaut'),
   new Route('Den Haag - Haagse Markt','Bart\'s route van Den Haag','dhg-markt'),
   new Route('Den Haag - Javastraat','Ad\'s route van Den Haag','dhg-java'),
   new Route('Den Haag - Kennedylaan','Daphne\'s route van Den Haag','dhg-kennedy'),
   new Route('Eindhoven - Mauritsstraat','Ank\'s route van Eindhoven','ehv-maurits'),
   new Route('Haarlem - Kennemerplein','Jaime\'s route van Haarlem','dhg-java'),
   new Route('Maastricht - Dorpsstraat','Nannie\'s route van Maastricht','mst-dorps'),
   new Route('Rotterdam - Erasmusbrug','Nancy\'s route van Rotterdam','rdam-erasmus'),
   new Route('Rotterdam - Stadhouderweg','Liesbeth\'s route van Rotterdam','rdam-stadhouder'),
   new Route('Rotterdam - \'s Gravendijkwal','Ilse\'s route van Rotterdam','rdam-sgravendijk')
];
var RN;
function Route(naam, titel, pad) {
    this.id = pad;
    pad = 'data/' + pad + "/";    
    this.naam = naam;
    this.titel = titel;
    this.grafiek = pad + 'meetresultaten.json';
    this.kaart = pad + 'track.gpx';
    this.verhaal = pad + 'verhaal.json';
    this.faceDir = pad + 'faces/';
    this.poster = pad + 'poster.png';
 /*   this.videosrc = [
        {type: 'video/mp4', src: 'http://research.geodan.nl/sites/milieudefensie/' + pad + 'movie.mp4'},
        {type: 'video/webm', src: 'http://research.geodan.nl/sites/milieudefensie/' + pad + 'movie.webm'}
        
    ];*/
    this.videosrc = [
        {type: 'video/webm', src: 'https://d1w20lst7qyzoh.cloudfront.net/'+this.id+ '/movie.webm'},
        {type: 'video/mp4', src: 'https://d1w20lst7qyzoh.cloudfront.net/'+this.id+ '/movie.mp4'}
        
        
    ];
}

// returnt een getal die 'significanteCijfers' aantal significante cijfers heeft,
// puntjes voor elk duizendtal, en bij kommagetallen een punt ipv komma.
// bv: (123456.789, 4) -> 1.235.000
var formatNumber = function(getal, significanteCijfers) {
    var check = 1, cijfers = 0;
    while (getal >= check) {
        check *= 10;
        cijfers++;
    }
    var verkleining = Math.pow(10, cijfers - significanteCijfers); // 3 significante cijfers
    var parts = (Math.round(getal / verkleining) * verkleining).toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',');
};
//Generic function to get parameter from URL
var GetURLParameter = function (sParam)
{
   var sPageURL = window.location.search.substring(1);
   var sURLVariables = sPageURL.split('&');
   for (var i = 0; i < sURLVariables.length; i++)
   {
     var sParameterName = sURLVariables[i].split('=');
     if (sParameterName[0] == sParam)
     {
        return sParameterName[1];
     }
   }
}


var grafiek, video, kaart, verhaal, header, gpxparser;
$(document).ready(function() {
    //Get optional route from URL 
    args = window.location.search.substr(1).split(/&/);
    RN = GetURLParameter('route');
    var routeExists = false;
    var roete;
    //Check if route exists in routes object
    $(routes).each(function(){
        if (this.id == RN){
            routeExists = true;
            roete = this.naam;
            return;
        }
    });
    if (!routeExists){
        RN = routes[0].id;
        roete = routes[0].naam;
        //console.warn('No known route selected, choosing default (' + RN + ')');
    }
    
    header.setRoute(roete);
    header.labelRouteNaam.init();
    header.knopPlay.init();
    header.knopSpeed.init();
    header.knopRouteMenu.init();
    grafiek = new Grafiek('#grafiek');
    verhaal = new Verhaal('#verhaal', '#verhaal-tekst', '#verhaal-gezicht');
    kaart = new Kaart('kaart');
    video = new Video(header.knopPlay, header.knopSpeed);
});
function GrafiekInfo() {
    this.elem = $('#grafiekinfo');
    this.zichtbaar = false;
    this.eenheid = 'parts/cm<sup>3</sup>';
    this.animatieTijd = 200;
}
GrafiekInfo.prototype.setInformatie = function(x, y, waarde, kader) {
// positionering
    var w = this.elem.outerWidth(), h = this.elem.outerHeight();
    var margin = 10, posX, posY;
    if (x - w - margin >= kader.left) {
        posX = x - w - margin;
    } else {
        posX = x + margin;
    }
    if (y < kader.top) {
        posY = kader.top + margin;
    } else if (y + h + margin >= kader.bottom) {
        posY = kader.bottom - 2*margin;
    } else {
        posY = y + margin;
    }

    var suffix = '';
    if (y < kader.top) {
        suffix = '!';
    }

    this.elem.html(formatNumber(waarde, 4) + ' ' + this.eenheid + suffix);
    this.elem.animate({left: posX, top: posY}, 'fast');
};
GrafiekInfo.prototype.setZichtbaar = function(zichtbaar) {
    this.zichtbaar = zichtbaar;
    var isZichtbaar = this.elem.is(':visible');
    if (zichtbaar) {
        if (!isZichtbaar) {
            this.elem.fadeIn(this.animatieTijd);
        }
    } else {
        if (isZichtbaar) {
            this.elem.fadeOut(this.animatieTijd);
        }
    }
};
// Grafiek
function Grafiek(selector) {
    this.selector = selector;
    this.data = null;
    this.grafiekInfo = new GrafiekInfo();
    var self = this;
    $(this.selector).resize(function() {
        self.tekenGrafiek();
    }).on('click', {self: self}, self.onGrafiekGeklikt);
    this.onRouteVeranderd();
}
Grafiek.prototype.getPadding = function(c) {
    var padding = {left: 6, top: 9, right: 6, bottom: 0};
  /* SMO if (this.data && this.data.length) {
        c.font = '11px arial';
        c.textAlign = 'right';
        c.textBaseline = 'middle';
        var number = formatNumber(this.hoogste('value'), 3);
        if (c.measureText) {
            padding.left += c.measureText(number).width;
        } else {
// we maken gebruik van excanvas. Het heeft geen ondersteuning voor text dus hebben we ook geen padding nodig.
            padding.left += 15;
        }
    }*/
    return padding;
};
Grafiek.prototype.setTekstTijden = function(tijden) {
    this.tekstTijden = tijden;
    this.tekenGrafiek();
};
// 'events'
Grafiek.prototype.onRouteVeranderd = function() {
    this.tekstTijden = null;
    var self = this;
    $.getJSON(header.route.grafiek).done(function(d) {
        self.data = d;
        self.tekenGrafiek();
        self.grafiekInfo.setZichtbaar(true);
    }).fail(function() {
        self.data = undefined;
        self.tekenGrafiek();
        self.grafiekInfo.setZichtbaar(false);
    });
};
Grafiek.prototype.onGrafiekGeklikt = function(evt) {
    var self = evt.data.self;
    if (!self.data) {
        return;
    }

    var canvas = $(self.selector);
    var offset = canvas.offset();
    var x = (offset ? evt.clientX - offset.left : evt.clientX);
    var c = canvas.get(0).getContext('2d');
    var padding = self.getPadding(c);
    var breedte = canvas.width() - padding.left - padding.right;
    x -= padding.left;
    x = Math.max(0, Math.min(breedte, x));
    var schaal = self.getSchaal();
    header.setHuidigeTijd(x * schaal.distX / breedte + schaal.minX, 'grafiek');
    self.grafiekInfo.setZichtbaar(true);
    //evt.stopPropagation();
};
Grafiek.prototype.onTijdVeranderd = function() {
// grafiek opnieuw tekenen
    this.tekenGrafiek();
};
// teken hulpmethodes
Grafiek.prototype.laagste = function(attr) {
    var min = false;
    for (var i = 0; i < this.data.length; i++) {
        if (min === false || this.data[i][attr] < min) {
            min = this.data[i][attr];
        }
    }
    return min;
};
Grafiek.prototype.hoogste = function(attr) {
    var max = false;
    for (var i = 0; i < this.data.length; i++) {
        if (max === false || this.data[i][attr] > max) {
            max = this.data[i][attr];
        }
    }
    return max;
};
Grafiek.prototype.waardeNaarTijd = function(waarde) {
    for (var i = 0; i < this.data.length; i++) {
        if (this.data[i].time > waarde) {
            if (i > 0) {
                var t1 = this.data[i].time;
                var t0 = this.data[i - 1].time;
                // return i - 1 + kommagetal hoeveel procent waarde bij t2 zit;
                return i - 1 + (waarde - t0) / (t1 - t0);
            }
            return i;
        }
    }
    return this.data.length - 1;
};
Grafiek.prototype.getSchaal = function() {
    var xMin = this.laagste('time'), xMax = this.hoogste('time'), yMin = 0, yMax = 70000;
   
    if (this.data && this.data.length > 0) {
        var hoogsteWaarde = false, huidigeIndex = Math.round(this.waardeNaarTijd(header.huidigeTijd));
        for (var i = huidigeIndex - 1; i <= huidigeIndex + 1; i++) {
            if (i >= 0 && i < this.data.length) {
                var waarde = this.data[i].value;
                if (hoogsteWaarde === false || waarde > hoogsteWaarde) {
                    hoogsteWaarde = waarde;
                }
            }
        }
        if (hoogsteWaarde !== false && hoogsteWaarde > yMax) {
            yMax = hoogsteWaarde;
            yMin = yMax - 70000;
        }
    }
 return {
        minX: xMin, maxX: xMax, distX: xMax - xMin,
        minY: yMin, maxY: yMax, distY: yMax - yMin};
};
// tekenen
Grafiek.prototype.tekenGrafiek = function() {
    var colors = {
        hoofdstrepen: '#333333',
        strepen: 'rgba(128,128,128,0.5)',
        tekstAsBeschrijving: '#000000',
        shape_stroke: 'rgba(110, 37, 133, 0.8)',
       // smo shape_stroke: '#e27ea6',//'rgba(128,128,128, 0.8)',
        shape_fill: 'rgba(110, 37, 133, 0.5)',
        tijd_balk: '#00a9e0',
        tekstVerhaal: [
        //SMO    '#e37222', '#f3c4a2'
'rgba(255,255,255, 0.8)',        'rgba(110, 37, 133, 0.5)'
        ]
    };
    var graph = $(this.selector);
    graph.attr('width', graph.parent().width());
     if (graph.get(0).getContext) {
       var c = graph.get(0).getContext('2d');
    }
    else return false;
    var hoogteVerhaal = 0;
    var padding = this.getPadding(c);
    var w = graph.width() - padding.left - padding.right;
    var h = graph.height() - padding.top - padding.bottom - hoogteVerhaal;
    c.translate(padding.left, padding.top);
    if (this.data && this.data.length) {
        var schaal = this.getSchaal();
        // verticale strepen om de minuut
        c.strokeStyle = colors.strepen;
        c.fillStyle = colors.tekstAsBeschrijving;
        var aantalStrepen = schaal.distX / 60;
        for (var i = 0; i <= aantalStrepen; i++) {
            var x = w * i / aantalStrepen;
            c.beginPath();
            c.moveTo(x, 0);
            c.lineTo(x, h);
            c.stroke();
        }
// horizontale strepen (maximaal 8 strepen)
        var omde = 10000, keer5 = true;
        do {
            aantalStrepen = schaal.distY / omde;
            omde *= keer5 ? 5 : 2;
        } while (aantalStrepen > 8);
        for (var i = 0; i <= aantalStrepen; i++) {
            var y = h - h * i / aantalStrepen;
            c.beginPath();
            c.moveTo(0, y);
            c.lineTo(w, y);
            c.stroke();
            //SMO: labels
            if (c.fillText) {
              //  c.fillText(formatNumber(schaal.minY + schaal.distY * i / aantalStrepen, 3), -3, y);
            }
        }

// clip
        if (c.clip) {
            c.save();
            c.beginPath();
            c.moveTo(0, 0);
            c.lineTo(w, 0);
            c.lineTo(w, h);
            c.lineTo(0, h);
            c.closePath();
            c.clip();
        }

// lijnen
        c.beginPath();
        for (var i = 0; i < this.data.length; i++) {
            var x = w * (this.data[i].time - schaal.minX) / schaal.distX;
            var y = h * (this.data[i].value - schaal.maxY) / -schaal.distY;
            if (i === 0)
                c.moveTo(x, y);
            else
                c.lineTo(x, y);
        }
        c.lineTo(w, h);
        c.lineTo(0, h);
        c.closePath();
        c.fillStyle = colors.shape_fill;
        c.fill();
        c.lineWidth = 2;
        c.strokeStyle = colors.shape_stroke;
        c.stroke();
        // unclip
        if (c.restore) {
            c.restore();
        }

// verhaaltjes
        if (this.tekstTijden) {
            for (var i = 0; i < this.tekstTijden.length; i++) {
                var x1 = w * (this.tekstTijden[i] - schaal.minX) / schaal.distX;
                var x2 = (i + 1 === this.tekstTijden.length) ?
                        w : (w * (this.tekstTijden[i + 1] - schaal.minX) / schaal.distX);
                c.beginPath();
                c.moveTo(x1, h);
                c.lineTo(x2, h);
                c.lineTo(x2, h + hoogteVerhaal);
                c.lineTo(x1, h + hoogteVerhaal);
                c.closePath();
                c.fillStyle = colors.tekstVerhaal[i % colors.tekstVerhaal.length];
                c.fill();
            }
        }
    }
// assen

    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, h);
    c.lineTo(w, h);
    c.lineWidth = 1;
    c.strokeStyle = colors.hoofdstrepen;
    c.stroke();
    // huidigeTijd tekenen
    if (this.data && this.data.length) {
    c.fillStyle ="#eeeeee";
     var index = this.waardeNaarTijd(header.huidigeTijd);
        var indexFloor = Math.floor(index);
        var waarde;
        if (indexFloor + 1 < this.data.length) {
            var d0 = this.data[indexFloor].value, d1 = this.data[indexFloor + 1].value;
            waarde = d0 + (d1 - d0) * (index % 1); // * kommagetal
        } else {
// laatste punt
            waarde = this.data[indexFloor].value;
        }
    
        var tijd = Math.min(schaal.maxX, Math.max(schaal.minX, header.huidigeTijd));
        var x = w * (tijd - schaal.minX) / schaal.distX;
        c.beginPath();
        if( (h*(waarde - schaal.maxY) / -schaal.distY > 0 )&& (waarde > schaal.minY)) {
        c.arc(x, h*(waarde - schaal.maxY) / -schaal.distY, 7, 0, Math.PI*2, true); 
        }
        else {
        c.moveTo(x, 0);
        c.lineTo(x, h + hoogteVerhaal);
        }
        c.closePath();
        c.lineWidth = 3;
        c.strokeStyle = colors.tijd_balk;
        c.fill();
        c.stroke();
        
        // snijpunt

       
        var y = h * (waarde - schaal.maxY) / -schaal.distY;
        var kader = {left: padding.left, top: padding.top, right: w + padding.left, bottom: h + padding.top};
        this.grafiekInfo.setInformatie(padding.left + x, padding.top + y, Math.round(waarde), kader);
    }

    c.translate(-padding.left, -padding.top);
};
// Video
function Video(knopPlayPause, knopSnelheid) {
    // alleen de verhaaltjes op normale snelheid, en de rest versneld laten zien?
    this.alleenVerhaaltjes = false;
    this.snel = 4;
    this.knopPlayPause = knopPlayPause;
    this.knopSnelheid = knopSnelheid;
    var self = this;
    // EVENTS ------------------------------------------------------------------
    var fn = function(func) {
        return function() {
            func({data: {self: self}});
        };
    };
    var player = Video.getPlayer();
    player.on('play', fn(this.onPlay));
    player.on('pause', fn(this.onPause));
    player.on('timeupdate', fn(this.onTimeUpdate));
    this.onRouteVeranderd();
}
Video.getPlayer = function() {
    return videojs("div_video");
};
Video.getHtml5_Video = function() {
    return $("#div_video_html5_api").get(0);
};
Video.prototype.onRouteVeranderd = function() {
    var player = Video.getPlayer();
    player.poster(header.route.poster);
    player.src(header.route.videosrc);    
    // load the new sources
    player.load();
};
// events:
Video.prototype.onPlay = function(evt) {
    var self = evt.data.self;
    self.knopPlayPause.update();
};
Video.prototype.onPause = function(evt) {
    var self = evt.data.self;
    self.knopPlayPause.update();
};
Video.prototype.onTimeUpdate = function(evt) {
    if (!this.ignoreTimeUpdate) {
        var self = evt.data.self;
        header.setHuidigeTijd(self.getCurrentTime(), 'video');
    }
};
Video.prototype.onVerhaalBegint = function() {
    if (this.alleenVerhaaltjes) {
        this.setPlaybackRate(1);
    }
};
Video.prototype.onVerhaalEindigt = function() {
    if (this.alleenVerhaaltjes) {
        this.setPlaybackRate(this.snel);
    }
};
// native video velden
Video.prototype.setPlaying = function(playing) {
    var player = Video.getPlayer();
    if (playing) {
        player.play();
    } else {
        player.pause();
    }
};
Video.prototype.isPlaying = function() {
    var player = Video.getPlayer();
    return !player.paused();
};
Video.prototype.setCurrentTime = function(currentTime) {
    var player = Video.getPlayer();
    player.currentTime(currentTime);
};
Video.prototype.getCurrentTime = function() {
    var player = Video.getPlayer();
    return player.currentTime();
};
Video.prototype.setPlaybackRate = function(playbackRate) {
    var html5Video = Video.getHtml5_Video();
    if (html5Video)
        html5Video.playbackRate = playbackRate;
};
Video.prototype.getPlaybackRate = function() {
    var html5Video = Video.getHtml5_Video();
    if (html5Video)
        return html5Video.playbackRate;
    return 1;
};
// overige
Video.prototype.setAlleenVerhaaltjes = function(alleenVerhaaltjes) {
    this.alleenVerhaaltjes = alleenVerhaaltjes;
    if (alleenVerhaaltjes) {
        if (!verhaal.kijktVerhaal()) {
// geen verhaal dus volle kracht vooruit
            this.setPlaybackRate(this.snel);
        }
    } else {
        if (!verhaal.kijktVerhaal()) {
            this.setPlaybackRate(1);
        }
    }
    this.knopSnelheid.update();
};
Video.prototype.isAlleenVerhaaltjes = function() {
    return this.alleenVerhaaltjes;
};
Video.prototype.toggleAlleenVerhaaltjes = function() {
    this.setAlleenVerhaaltjes(!this.isAlleenVerhaaltjes());
};
Video.prototype.togglePlaying = function() {
    var self = this;
    self.setPlaying(!self.isPlaying());
};
Video.prototype.onTijdVeranderd = function() {
    this.ignoreTimeUpdate = true;
    this.setCurrentTime(header.huidigeTijd);
    this.ignoreTimeUpdate = false;
    return this.getCurrentTime() === header.huidigeTijd;
};

// Kaart
function Kaart(selector) {
    var self = this;
    self.selector = '#' + selector;
    self.options = {
        line: {
            stroke: true, color: '#00a9e0', opacity: 1, weight: 5
        }, marker: {
            stroke: true, color: '#00a9e0', opacity: 1, weight: 5,
            fill: true, fillOpacity: 1, fillColor: '#eeeeee',
            radius: 7.5
        }
    };
    self.map = L.map(selector).setView([52.15, 5.30], 12);
     L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
    }).addTo(this.map);

    var parent = $(self.selector).parent();
    var video = $('#div_video');
    var graph = $('#grafiek');
    var kaartGroot = 600, kaartKlein = 343;
    var videoKlein = 352, videoGroot = 609;
    var grafiekGroot =  609, grafiekKlein = 352;

    var self = this;

    var enlarge = function() {
        video.animate({width: videoKlein});
        graph.animate({width: grafiekKlein});
        parent.animate({width: kaartGroot}, {
            duration: 500, complete: function() {
                self.map.invalidateSize();
                grafiek.tekenGrafiek();
            }
        });
    };
    var shrink = function() {
        video.animate({width: videoGroot});
        graph.animate({width: grafiekGroot});
        parent.animate({width: kaartKlein}, {
            duration: 500, complete: function() {
                self.map.invalidateSize();
                grafiek.tekenGrafiek();
            }
        });
    };   
    self.map.on('movestart', self.onMoveStart, self);
    self.map.on('moveend', self.onMoveEnd, self);
    self.onRouteVeranderd();
}
Kaart.prototype.onRouteVeranderd = function() {
    var self = this;
    $.ajax({
        url: header.route.kaart,
        dataType: 'xml'
    }).done(function(data) {
        self.onGPXLoaded(data);
    }).fail(function() {
        self.onGPXLoaded(undefined);
    });
};
Kaart.prototype.onGPXLoaded = function(data) {
    this.locaties = data ? gpxparser.parse_gpx(data) : undefined;
    this.locatie = 0;
    if (!this.locaties || this.locaties.length === 0) {
        if (this.map.hasLayer(this.locatieLijn))
            this.map.removeLayer(this.locatieLijn);
        if (this.map.hasLayer(this.marker))
            this.map.removeLayer(this.marker);
    } else {
        if (this.locatieLijn) {
            this.map.removeLayer(this.locatieLijn);
        }
        this.locatieLijn = L.polyline(this.locaties, this.options.line)
                .on('click', this.onRouteClick, this)
                .addTo(this.map);
        if (this.marker) {
            this.marker.setLatLng(this.locaties[this.locatie]);
            this.marker.setRadius(this.options.marker.radius);
            // push to the top layer
            this.map.removeLayer(this.marker);
            this.map.addLayer(this.marker);
        } else {
            this.marker = new L.CircleMarker(this.locaties[this.locatie], this.options.marker).setRadius(this.options.marker.radius).addTo(this.map);
        }
        this.beweegKaartAlsNodig();
    }
};
Kaart.prototype.onTijdVeranderd = function() {
// kaart (marker verplaatsen + evt. kaart bewegen)
    if (this.locaties && this.locatie >= 0 && this.locatie < this.locaties.length) {
        this.updateMarker();
        this.beweegKaartAlsNodig();
    }
};
Kaart.prototype.onMoveStart = function() {
    if (this.ignoreMoveEvent) {
        return;
    }
    var self = this;
    if (self.bezigCooldown) {
        clearTimeout(self.bezigCooldown);
    }
    self.isBezig = true;
    // de gebruiker is bezig met de kaart (bijv bewegen)
    // we willen dus niet de kaart bewegen naar de huidige locatie...
};
Kaart.prototype.onMoveEnd = function() {
    if (this.ignoreMoveEvent) {
        return;
    }
    var self = this;
    if (self.bezigCooldown) {
        clearTimeout(self.bezigCooldown);
    }
    self.bezigCooldown = setTimeout(function() {
        self.isBezig = false;
        self.bezigCooldown = null;
    }, 5000);
};
L.LatLng.prototype.isBinnen = function(latlng0, latlng1) {
    var bounds = new L.LatLngBounds([latlng0, latlng1]);
    return bounds.contains(this);
};
// L.LineUtil.pointToSegmentDistance
Kaart.prototype.pointToSegmentDistance = function(p, p0, p1) {
    var x = p0.x, y = p0.y,
            dx = p1.x - x, dy = p1.y - y,
            dot = dx * dx + dy * dy, t;
    if (dot > 0) {
        t = ((p.x - x) * dx + (p.y - y) * dy) / dot;
        if (t > 1) {
            x = p1.x;
            y = p1.y;
        } else if (t > 0) {
            x += dx * t;
            y += dy * t;
        }
    }

    dx = p.x - x;
    dy = p.y - y;
    return {dist: dx * dx + dy * dy, x: x, y: y};
};
Kaart.prototype.puntOpLijn = function(evt) {
    var point = evt.layerPoint;
    var points = this.locatieLijn._originalPoints;
    var minDistance = false, minIndex = 0;
    for (var i = 0; i + 1 < points.length; i++) {
        var ptDist = Kaart.prototype.pointToSegmentDistance(point, points[i], points[i + 1]);
        if (minDistance === false || ptDist.dist < minDistance.dist) {
            minDistance = ptDist;
            minIndex = i;
        }
    }
    if (minDistance === false) {
        return null;
    }

    var p = minDistance,
            p0 = points[minIndex],
            p1 = points[minIndex + 1];
    var percentageX = (p.x - p0.x) / (p1.x - p0.x);
    var percentageY = (p.y - p0.y) / (p1.y - p0.y);
    if (p0.x === p1.x) {
// percentageX = NaN
        percentageX = percentageY; // laat x niet mee tellen
    }
    if (p0.y === p1.y) {
        percentageY = percentageX;
        // if (p0.y === p1.y && p0.x === p1.x)
        if (p0.x === p1.x) {
            return minIndex;
        }
    }
// gemiddelde
    var percentage = (percentageX + percentageY) / 2;
    return minIndex + percentage;
};
Kaart.prototype.onRouteClick = function(evt) {
    var self = this;
    var index = self.puntOpLijn(evt);
    if (index === null) {
        return;
    }
    var waarde, indexFloor = Math.floor(index);
    if (indexFloor + 1 < this.locaties.length) {
        var t0 = this.locaties[indexFloor].tijd,
                t1 = this.locaties[indexFloor + 1].tijd;
        waarde = t0 + (t1 - t0) * (index % 1); // * kommagetal
    } else {
// laatste punt
        waarde = this.locaties[indexFloor].tijd;
    }
    var tijd = (waarde - this.locaties[0].tijd) / 1000;
    header.setHuidigeTijd(tijd, 'kaart');
};
// marker hulpmethodes
Kaart.prototype.updateLocatie = function() {
    var tijdHuidig = this.locaties[0].tijd + header.huidigeTijd * 1000;
    var t = this.locaties[this.locatie].tijd;
    if (t < tijdHuidig) {
// verder in de tijd
        for (var i = this.locatie; i + 1 < this.locaties.length; i++) {
            var t0 = this.locaties[i].tijd;
            var t1 = this.locaties[i + 1].tijd;
            if (tijdHuidig >= t0 && tijdHuidig < t1) {
                this.locatie = i;
                return;
            }
        }
        this.locatie = this.locaties.length - 1;
    } else if (t > tijdHuidig) {
// terug in de tijd
        for (var i = this.locatie - 1; i >= 0; i--) {
            var t0 = this.locaties[i].tijd;
            var t1 = this.locaties[i + 1].tijd;
            if (tijdHuidig >= t0 && tijdHuidig < t1) {
                this.locatie = i;
                return;
            }
        }
        this.locatie = 0;
    }
};
// returnt het volgende of vorige punt na i,j in locaties[][]
Kaart.prototype.next = function(i) {
    if (i + 1 < this.locaties.length) {
        return i + 1;
    } else {
        return null;
    }
};
// linear interpolatie van punt0 tot punt1
Kaart.prototype.interpolate = function(doelWaarde, waarde0, waarde1, punt0, punt1) {
    var percentage = (doelWaarde - waarde0) / (waarde1 - waarde0); // tussen 0 en 1

    var lat = punt0.lat + (punt1.lat - punt0.lat) * percentage;
    var lng = punt0.lng + (punt1.lng - punt0.lng) * percentage;
    return new L.LatLng(lat, lng);
};
Kaart.prototype.updateMarker = function() {
    if (this.marker) {
        this.updateLocatie();
        var punt1 = this.locaties[this.locatie];
        if (this.locatie + 1 >= this.locaties.length) {
            this.marker.setLatLng(punt1);
            return;
        } else {
            var punt2 = this.locaties[this.locatie + 1];
            var beginTijd = this.locaties[0].tijd;
            var huidigeTijdMillis = header.huidigeTijd * 1000;
            var locInterpoleerd = this.interpolate(huidigeTijdMillis,
                    punt1.tijd - beginTijd, punt2.tijd - beginTijd, punt1, punt2);
            this.marker.setLatLng(locInterpoleerd);
        }
    }
};
Kaart.prototype.beweegKaartAlsNodig = function() {
    if (this.marker) {
        var markerPos = this.marker.getLatLng();
        var mapBounds = this.map.getBounds();
        if (!mapBounds.contains(markerPos) && !this.isBezig) {
            this.ignoreMoveEvent = true;
            this.map.setView(markerPos, Math.max(14, this.map.getZoom()));
            this.ignoreMoveEvent = false;
        }
    }
};
// Verhaal
function Verhaal(selector, selectorTekst, selectorGezicht) {
    this.verhaal = $(selector);
    this.tekst = $(selectorTekst);
    this.gezicht = $(selectorGezicht);
    this.tijdZichtbaar = 10;
    this.gezichtExtensie = '.jpg';
    this.fadeDuration = 200;
    this.textFade = 200;
    this.isTextFading = false;
    this.onRouteVeranderd();
}
Verhaal.prototype.onRouteVeranderd = function() {
    var self = this;
    $.getJSON(header.route.verhaal).done(function(d) {
        self.data = d;
        self.onTijdVeranderd();
        grafiek.setTekstTijden(self.getTekstTijden());
    }).fail(function() {
        self.data = undefined;
        self.onTijdVeranderd();
        grafiek.setTekstTijden(undefined);
    });
};
Verhaal.prototype.onTijdVeranderd = function() {
    var self = this;
    if (this.data) {    
        var rout = self.data[0];
        self.tekst.html(rout.text);
        var face = rout.face;
        self.gezicht.attr('src', face ? (header.route.faceDir + face + self.gezichtExtensie) : '');
        self.gezicht.attr('alt', face ? face : 'gezicht');
        
        for (var i = self.data.length - 1; i >= 0; i--) {
            var verhaal = self.data[i];
            
            if (header.huidigeTijd >= verhaal.time &&
                    header.huidigeTijd < verhaal.time + self.tijdZichtbaar) {
// tekst fade

              /*  if (!self.isTextFading) {
                    if (self.tekst.html() && self.tekst.html() !== verhaal.text) {
                        self.isTextFading = true;
                        self.tekst.fadeOut(self.textFade, function() {
                            self.tekst.html(verhaal.text).fadeIn(self.textFade, function() {
                                self.isTextFading = false;
                            });
                        });
                    } else {
                        self.tekst.html(verhaal.text);
                    }
                }*/
                var face = '';
                // trace back last face
                for (var j = i; j >= 0; j--) {
                    if (self.data[j].face) {
                        face = self.data[j].face;
                        break;
                    }
                }
             /*   self.gezicht.attr('src', face ? (header.route.faceDir + face + self.gezichtExtensie) : '');
                self.gezicht.attr('alt', face ? face : 'gezicht');
                if (!self.verhaal.is(':visible')) {
                    self.verhaal.fadeIn(self.fadeDuration);
                }*/

                self.setVerhaal(verhaal);
                return;
            }
        }
    }
// geen verhaal.
    /*self.verhaal.fadeOut(self.fadeDuration, function() {
        self.tekst.html('');
        self.gezicht.attr('src', '');
        self.gezicht.attr('alt', 'gezicht');
    });*/
    self.setVerhaal(null);
};
// returnt een array waarin staat welke tijdstippen interessant zijn, en wanneer niet meer
// het is om en om dus: [ aan, uit, aan, .. ]
Verhaal.prototype.getTekstTijden = function() {
    var tijden = [];
    if (!this.data) {
        return [];
    }
    for (var i = 0; i < this.data.length; i++) {
        var begin = this.data[i].time, eind = begin + this.tijdZichtbaar;
        if (i === 0 || begin - this.data[i - 1].time > this.tijdZichtbaar) {
// vorige is langer dan de tijd zichtbaar geleden
            tijden.push(begin);
        }
        if (i + 1 >= this.data.length || this.data[i + 1].time - eind > 0) {
// laatste of volgende komt niet binnen 'tijdZichtbaar'
            tijden.push(eind);
        }
    }
    return tijden;
};
Verhaal.prototype.setVerhaal = function(verhaal) {
    if (this.huidigVerhaal !== verhaal) {
// changed
        if (verhaal === null) {
// eind
            if (video)
                video.onVerhaalEindigt();
        } else if (this.huidigVerhaal === null) {
// start
            if (video)
                video.onVerhaalBegint();
        }
    }
    this.huidigVerhaal = verhaal;
};
Verhaal.prototype.kijktVerhaal = function() {
    return (typeof this.huidigVerhaal === 'number');
};
header = {
    huidigeTijd: 0,
    route: routes['Amsterdam'],
    labelRouteNaam: {
        init: function() {
            this.setRoute(header.route);
        },
        setRoute: function(route) {
            $('#routenaam').html(route.titel);
        }
    },
    knopPlay: {
        init: function() {
            $('#knop-play-pause').click(this.onPress);
        },
        onPress: function() {
            video.togglePlaying();
        },
        update: function() {
            var playknop = $('#knop-play-pause');
            if (video && video.isPlaying()) {
                playknop.html('&#10073;&#10073; Pause');
            } else {
                playknop.html('&#9656; Afspelen');
            }
        }
    },
    knopSpeed: {
        init: function() {
            $('#knop-snelheid').click(this.onPress);
        },
        onPress: function() {
            video.toggleAlleenVerhaaltjes();
        },
        update: function() {
            var speedknop = $('#knop-snelheid');
            if (!video.isAlleenVerhaaltjes()) {
                speedknop.html('&#9656;&#9656; Sneller afspelen');
            } else {
                speedknop.html('&#9656; Langzamer afspelen');
            }

        }
    },
    knopRouteMenu: {
        init: function() {
// li (niet de a) krijgt een ul met alle routes beschikbaar (window.routes)
            var menu = $('<ul></ul>');
            for (var i = 0; i < routes.length; i++) {
                var routeNaam = routes[i].naam;
                var li = $('<li></li>');
                if (header.route && routeNaam === header.route.naam) {
                    li.addClass('current');
                }
                li.append($('<a></a>').html(routeNaam).addClass('klikbaar')
                        .on('click', {routeNaam: routeNaam}, function(evt) {
                    header.setRoute(evt.data.routeNaam);
                }));
                menu.append(li);
            }
            var routeMenu = $('#route-menu').append(menu);
            routeMenu.click(function() {
                menu.toggle();
                
            });
            routeMenu.on('touchend',function(){
            $('#div_video').toggle();
            
            });
        },
        updateRouteMenu: function() {
            $('#route-menu ul li.current').removeClass('current');
            var children = $('#route-menu ul').children('li');
            for (var i = 0; i < children.length; i++) {
                var child = $(children[i]);
                var childRoute = child.children('a').html();
                if (childRoute === header.route.naam) {
// add current class
                    child.addClass('current');
                }
            }
        }
    },
    setRoute: function(routeNaam) {
        for (var i = 0; i < routes.length; i++) {
            if (routes[i].naam && routes[i].naam === routeNaam) {
                RN = routes[i].id;
                //console.log(RN);
                header.setHuidigeTijd(0);
                this.route = routes[i];
                this.labelRouteNaam.setRoute(this.route);
                this.knopRouteMenu.updateRouteMenu();
                if (grafiek)
                    grafiek.onRouteVeranderd();
                if (verhaal)
                    verhaal.onRouteVeranderd();
                if (kaart)
                    kaart.onRouteVeranderd();
                if (video)
                    video.onRouteVeranderd();
                return;
            }
        }
    },
    setHuidigeTijd: function(tijd, ignore) {
        var maxTijd = (tijd === 0 || !grafiek) ? 0 : grafiek.hoogste('time');
        if (tijd > maxTijd) {
            tijd = maxTijd;
        }
        this.huidigeTijd = tijd;
        // video
        if (video && ignore !== 'video' && !video.onTijdVeranderd()) {
// de video kan niet geskipt worden.
            return;
        }
        if (grafiek)
            grafiek.onTijdVeranderd();
        if (kaart)
            kaart.onTijdVeranderd();
        if (verhaal)
            verhaal.onTijdVeranderd();
    }
};
gpxparser = {
    parse_gpx: function(xml) {
        var coords = [];
        $(xml).find('trkseg').each(function() {
            var stuk = gpxparser.parse_segment(this);
            if (stuk.length > 0) {
                coords = coords.concat(stuk);
            }
        });
        return coords;
    },
    parse_date: function(str) {
        var d = new Date(str);
        if (!isNaN(d)) {
            return d;
        }
        var d = new Date(str.replace(/-/g, '/'));
        if (!isNaN(d)) {
            return d;
        }
        var d, tz,
                rx = /^(\d{4}\-\d\d\-\d\d([tT ][\d:\.]*)?)([zZ]|([+\-])(\d\d):(\d\d))?$/,
                p = rx.exec(str) || [];
        if (p[1]) {
            d = p[1].split(/\D/);
            for (var i = 0, L = d.length; i < L; i++) {
                d[i] = parseInt(d[i], 10) || 0;
            }
            ;
            d[1] -= 1;
            d = new Date(Date.UTC.apply(Date, d));
            if (!d.getDate())
                return NaN;
            if (p[5]) {
                tz = (parseInt(p[5], 10) * 60);
                if (p[6])
                    tz += parseInt(p[6], 10);
                if (p[4] === '+')
                    tz *= -1;
                if (tz)
                    d.setUTCMinutes(d.getUTCMinutes() + tz);
            }
            return d;
        }
        return NaN;
    },
    parse_segment: function(segment) {
        var coords = [];
        $(segment).find('trkpt').each(function() {
            var pt = $(this), tmp, ll = new L.LatLng(pt.attr('lat'), pt.attr('lon'));
            ll.tijd = null;
            ll.hoogte = null;
            tmp = pt.children('time');
            if (tmp.length > 0) {
                var time = gpxparser.parse_date(tmp.text());
                ll.tijd = time.getTime();
            }
            tmp = pt.children('ele');
            if (tmp.length > 0) {
                ll.hoogte = parseFloat(tmp.text());
            }
            coords.push(ll);
        });
        return coords;
    }
};