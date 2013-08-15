/* -----------------------------------------------------------------------------
 -testen in verschillende browsers (firefox, chrome, IE8 en IE9: functionaliteit en design)
 TODO:
 - knop die de kaart stuk groter maakt (en een knop om weer terug te gaan)
 - share buttons, twitter, facebook
 - made by Geodan
 - klikken op de kaart
 ------------------------------------------------------------------------------*/
var routes = [
    new Route('Amsterdam', 'Oscar\'s route van Amsterdam', 'data/amsterdam-1/'),
    new Route('Test', 'Test route van niks eigenlijk....', 'data/amsterdam-1/')
];
function Route(naam, titel, pad) {
    this.naam = naam;
    this.titel = titel;
    this.pad = pad;
    this.grafiek = this.pad + 'meetresultaten.json';
    this.kaart = this.pad + 'track.gpx';
    this.verhaal = this.pad + 'verhaal.json';
    this.faceDir = this.pad + 'faces/';
    this.videosrc = [
        this.pad + 'movie.mp4',
        this.pad + 'movie.webm'
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

var grafiek, video, kaart, verhaal, header, gpxparser;

$(document).ready(function() {
    header.setRoute('Amsterdam');

    header.labelRouteNaam.init();
    header.knopPlay.init();
    header.knopSpeed.init();
    header.knopRouteMenu.init();

    grafiek = new Grafiek();
    verhaal = new Verhaal();
    kaart = new Kaart();
    video = new Video(header.knopPlay, header.knopSpeed);
});

function GrafiekInfo() {
    this.elem = $('#grafiekinfo');
    this.zichtbaar = false;
    this.eenheid = 'parts/cm<sup>3</sup>';
    this.animatieTijd = 200;
}
GrafiekInfo.prototype.setInformatie = function(x, y, waarde, kader) {
    var color = {red: 0, green: 0, blue: 0}, puntGeel = 25000, helderheid = 180;
    // het punt waarbij groen en rood evenveel zijn ( dus geen schone en geen vieze lucht) 
    if (waarde < puntGeel) { // tussen groen en geel
        color.green = helderheid;
        color.red = Math.round(Math.max(0, waarde * helderheid / puntGeel));
    } else {
        color.red = helderheid;
        color.green = Math.round(Math.max(0, (2 * puntGeel - waarde) * helderheid / puntGeel));
    }
    color.html = 'rgb(' + color.red + ',' + color.green + ',' + color.blue + ')';
    this.elem.css('color', color.html);

    this.elem.html(formatNumber(waarde, 4) + " " + this.eenheid);

    // positionering
    var w = this.elem.outerWidth(), h = this.elem.outerHeight();
    var margin = 5, posX, posY;
    if (x - w - margin >= kader.left) {
        posX = x - w - margin;
    } else {
        posX = x + margin;
    }
    if (y < kader.top) {
        posY = kader.top + margin;
    } else if (y + h + margin >= kader.bottom) {
        posY = y - h - margin;

    } else {
        posY = y + margin;
    }

    this.elem.css('left', posX).css('top', posY);


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
function Grafiek() {
    this.data = null;
    this.grafiekInfo = new GrafiekInfo();

    var self = this;
    $('#canvas').resize(function() {
        self.tekenGrafiek();
    }).on('click', {self: self}, self.onGrafiekGeklikt);

    this.onRouteVeranderd();
}
Grafiek.prototype.getPadding = function(c) {
    var padding = {left: 6, top: 9, right: 6, bottom: 0};
    if (this.data && this.data.length) {
        c.font = '11px arial';
        c.textAlign = 'right';
        c.textBaseline = 'middle';
        padding.left += c.measureText(formatNumber(this.hoogste('value'), 3)).width;
    }
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
    });
};
Grafiek.prototype.onGrafiekGeklikt = function(evt) {
    var self = evt.data.self;
    var canvas = $('#canvas');
    var offset = canvas.offset();
    var c = canvas.get(0).getContext('2d');
    var padding = self.getPadding(c);
    var breedte = canvas.width() - padding.left - padding.right;
    var x = (offset ? evt.clientX - offset.left : evt.clientX) - padding.left;
    x = Math.max(0, Math.min(breedte, x));

    var min = self.laagste('time'), max = self.hoogste('time');
    header.setHuidigeTijd(x * (max - min) / breedte + min, 'grafiek');

    self.grafiekInfo.setZichtbaar(true);
    evt.stopPropagation();
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
                // return i-1 + kommagetal hoeveel procent waarde bij t2 zit;
                return i - 1 + (waarde - t0) / (t1 - t0);
            }
            return i;
        }
    }
};
Grafiek.prototype.getSchaal = function() {
    var xMin = this.laagste('time'), xMax = this.hoogste('time'), yMin = 0, yMax = 40000;
    return {
        minX: xMin, maxX: xMax, distX: xMax - xMin,
        minY: yMin, maxY: yMax, distY: yMax - yMin};
    /*
     if (this.data && this.data.length > 0) {
     var hoogsteWaarde = false, huidigeIndex = Math.round(this.waardeNaarTijd(header.huidigeTijd));
     for (var i = huidigeIndex - 10; i <= huidigeIndex + 10; i++) {
     if (i >= 0 && i < this.data.length) {
     var waarde = this.data[i].value;
     if (hoogsteWaarde === false || waarde > hoogsteWaarde) {
     hoogsteWaarde = waarde;
     }
     }
     }
     if (hoogsteWaarde !== false && hoogsteWaarde > yMax) {
     yMax = hoogsteWaarde;
     }
     }
     */
};
// tekenen
Grafiek.prototype.tekenGrafiek = function() {
    var colors = {
        hoofdstrepen: '#333333',
        strepen: 'rgba(128,128,128,0.5)',
        tekstAsBeschrijving: '#000000',
        shape_stroke: 'rgba(110, 37, 133, 0.5)',
        shape_fill: 'rgba(110, 37, 133, 0.5)',
        tijd_balk: '#00a9e0',
        tekstVerhaal: [
            '#e37222', '#f3c4a2'
        ]
    };
    var graph = $('#canvas');
    graph.attr('width', $('#grafiek').width());
    var c = graph.get(0).getContext('2d');

    var hoogteVerhaal = 15;
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

            c.fillText(formatNumber(schaal.minY + schaal.distY * i / aantalStrepen, 3), -3, y);
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
        var tijd = Math.min(schaal.maxX, Math.max(schaal.minX, header.huidigeTijd));
        var x = w * (tijd - schaal.minX) / schaal.distX;

        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, h + hoogteVerhaal);
        c.closePath();

        c.lineWidth = 3;
        c.strokeStyle = colors.tijd_balk;
        c.stroke();

        // snijpunt

        var index = this.waardeNaarTijd(header.huidigeTijd);
        var waarde;
        if (Math.floor(index + 1) >= this.data.length) {
            // laatste punt
            var waarde = this.data[Math.floor(index)].value;
        } else {
            var d0 = this.data[Math.floor(index)].value, d1 = this.data[Math.floor(index) + 1].value;
            var waarde = d0 + (d1 - d0) * (index % 1); // * kommagetal
        }
        var y = h * (waarde - schaal.maxY) / -schaal.distY;
        var kader = {left: padding.left, top: padding.top, right: w + padding.left, bottom: h + padding.top};
        this.grafiekInfo.setInformatie(padding.left + x, padding.top + y, Math.round(waarde), kader);
    }
};


// Video
function Video(playUpdate, alleenVerhaaltjesUpdate) {
    // alleen de verhaaltjes op normale snelheid, en de rest versneld laten zien?
    this.alleenVerhaaltjes = false;
    this.snel = 4;

    this.playUpdate = playUpdate;
    this.alleenVerhaaltjesUpdate = alleenVerhaaltjesUpdate;

    var self = this;
    $('#videotag').on({
        playing: self.onPlay,
        pause: self.onPause,
        timeupdate: self.onTimeUpdate,
        click: self.togglePlaying
    }, {self: self});
    this.onRouteVeranderd();
}
Video.prototype.onRouteVeranderd = function() {
    var vid = $('#videotag');
    vid.empty();
    for (var i = 0; i < header.route.videosrc.length; i++) {
        $("<source />", {
            'src': header.route.videosrc[i]
        }).appendTo(vid);
    }
    vid.get(0).load();
};
// events:
Video.prototype.onPlay = function(evt) {
    var self = evt.data.self;
    self.playUpdate.update();
};
Video.prototype.onPause = function(evt) {
    var self = evt.data.self;
    self.playUpdate.update();
};
Video.prototype.onTimeUpdate = function() {
    header.setHuidigeTijd($('#videotag').get(0).currentTime, 'video');
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
    this.alleenVerhaaltjesUpdate.update();
};
Video.prototype.isAlleenVerhaaltjes = function() {
    return this.alleenVerhaaltjes;
};
Video.prototype.toggleAlleenVerhaaltjes = function() {
    this.setAlleenVerhaaltjes(!this.isAlleenVerhaaltjes());
};
Video.prototype.togglePlaying = function(evt) {
    var self = evt ? evt.data.self : this;
    if (self.isPlaying()) {
        self.pause();
    } else {
        self.play();
    }
};
Video.prototype.isPlaying = function() {
    return !$('#videotag').get(0).paused;
};
Video.prototype.play = function() {
    $('#videotag').get(0).play();
};
Video.prototype.pause = function() {
    $('#videotag').get(0).pause();
};
Video.prototype.setPlaybackRate = function(playbackRate) {
    $('#videotag').get(0).playbackRate = playbackRate;
};
Video.prototype.getPlaybackRate = function() {
    return $('#videotag').get(0).playbackRate;
};
Video.prototype.currentTime = function(currentTime) {
    if (typeof currentTime === 'number') {
        $('#videotag').get(0).currentTime = currentTime;
    }
    return $('#videotag').get(0).currentTime;
};
Video.prototype.onTijdVeranderd = function() {
    return this.currentTime(header.huidigeTijd) === header.huidigeTijd;
};

// Kaart
function Kaart() {
    this.options = {
        line: {
            stroke: true, color: '#00a9e0', opacity: 1, weight: 5
        }, marker: {
            stroke: true, color: '#00a9e0', opacity: 1, weight: 5,
            fill: true, fillOpacity: 1, fillColor: '#eeeeee',
            radius: 7.5
        }
    };

    this.map = L.map('kaartje').setView([52.15, 5.30], 10);
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
    }).addTo(this.map);

    this.map.on('movestart', this.onMoveStart, this);
    this.map.on('moveend', this.onMoveEnd, this);

    this.onRouteVeranderd();
}
Kaart.prototype.onRouteVeranderd = function() {
    var self = this;
    $.ajax({
        url: header.route.kaart,
        dataType: 'xml'
    }).done(function(data) {
        self.onGPXLoaded(data);
    });
};
Kaart.prototype.onGPXLoaded = function(data) {
    this.locaties = gpxparser.parse_gpx(data);
    this.locatie = {segment: 0, punt: 0};
    if (this.locatieLines) {
        for (var i = 0; i < this.locatieLines.length; i++) {
            this.map.removeLayer(this.locatieLines[i]);
        }
    }
    this.locatieLines = [];
    for (var i = 0; i < this.locaties.length; i++) {
        this.locatieLines.push(new L.polyline(this.locaties[i], this.options.line).on('click', this.onRouteClick, this).addTo(this.map));
    }
    if (this.marker) {
        this.marker.setLatLng(this.locaties[0][0]);
        this.marker.setRadius(this.options.marker.radius);
        // push to the top layer
        this.map.removeLayer(this.marker);
        this.map.addLayer(this.marker);
    } else {
        this.marker = new L.CircleMarker(this.locaties[0][0], this.options.marker).setRadius(this.options.marker.radius).addTo(this.map);
    }
    if (this.locaties.length > 0) {
        this.beweegKaartAlsNodig();
    }
};
Kaart.prototype.onTijdVeranderd = function() {
    // kaart (marker verplaatsen + evt. kaart bewegen)
    if (this.locaties && this.locatie.segment >= 0 && this.locatie.punt >= 0
            && this.locatie.segment < this.locaties.length
            && this.locatie.punt < this.locaties[this.locatie.segment].length) {
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
Kaart.prototype.onRouteClick = function(evt) {
    alert('burp');
};
// marker hulpmethodes
Kaart.prototype.updateLocatie = function() {
    var beginTijd = this.locaties[0][0].tijd;
    var locatie = this.locaties[this.locatie.segment][this.locatie.punt];
    var millitijd = header.huidigeTijd * 1000;
    if (locatie.tijd - beginTijd < millitijd) {
        // verder in de tijd
        var vorigeI = this.locatie.segment, vorigeJ = this.locatie.punt;
        for (var i = this.locatie.segment; i < this.locaties.length; i++) {
            var j = (i === this.locatie.segment) ? this.locatie.punt : 0;
            for (; j < this.locaties[i].length; j++) {
                // ga elk punt af vanaf seg,pt tot het laatste punt
                if (this.locaties[i][j].tijd - beginTijd > millitijd && this.locaties[vorigeI][vorigeJ].tijd - beginTijd < millitijd) {
                    this.locatie.segment = vorigeI;
                    this.locatie.punt = vorigeJ;
                    return;
                } else {
                    vorigeI = i;
                    vorigeJ = j;
                }
            }
        }
        this.locatie.segment = this.locaties.length - 1;
        this.locatie.punt = this.locaties[this.locatie.segment].length - 1;
    } else if (locatie.tijd - beginTijd > millitijd) {
        // terug in de tijd
        for (var i = this.locatie.segment; i >= 0; i--) {
            var j = (i === this.locatie.segment) ? this.locatie.punt : this.locaties[i].length - 1;
            for (; j >= 0; j--) {
                // ga elk punt af vanaf seg,pt tot 0,0
                if (this.locaties[i][j].tijd - beginTijd < millitijd) {
                    this.locatie.segment = i;
                    this.locatie.punt = j;
                    return;
                }
            }
        }
        this.locatie.segment = 0;
        this.locatie.punt = 0;
    }
};
// returnt het volgende of vorige punt na i,j in locaties[][]
Kaart.prototype.next = function(i, j, vorige) {
    if (vorige) {
        if (j - 1 >= 0) {
            return {segment: i, punt: j - 1};
        } else {
            return {segment: i - 1, punt: this.locaties[i].length - 1};
        }
    } else {
        if (this.locaties[i].length > j + 1) {
            return {segment: i, punt: j + 1};
        } else {
            return {segment: i + 1, punt: 0};
        }
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
        var loc1 = this.locatie;
        var loc2 = this.next(loc1.segment, loc1.punt);

        var punt1 = this.locaties[loc1.segment][loc1.punt];
        var punt2 = this.locaties[loc2.segment][loc2.punt];

        var beginTijd = this.locaties[0][0].tijd;
        var huidigeTijdMillis = header.huidigeTijd * 1000;

        var locInterpoleerd = this.interpolate(huidigeTijdMillis,
                punt1.tijd - beginTijd, punt2.tijd - beginTijd, punt1, punt2); // tussen 0 en 1

        this.marker.setLatLng(locInterpoleerd);
    }
};
Kaart.prototype.beweegKaartAlsNodig = function() {
    if (this.marker) {
        var markerPos = this.marker.getLatLng();
        var mapBounds = this.map.getBounds();
        if (!mapBounds.contains(markerPos) && !this.isBezig) {
            this.modifyMap(true);
            this.map.setView(markerPos, 17);
            this.modifyMap(false);
        }
    }
};
// don't handle events when we move the map programmatically
Kaart.prototype.modifyMap = function(started) {
    this.ignoreMoveEvent = started;
};


// Verhaal
function Verhaal() {
    this.verhaal = $('#verhaal');
    this.tekst = $('#verhaal-tekst');
    this.gezicht = $('#gezicht');
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
    });
};
Verhaal.prototype.onTijdVeranderd = function() {
    if (!this.data) {
        return;
    }
    var self = this;
    for (var i = self.data.length - 1; i >= 0; i--) {
        var verhaal = self.data[i];
        if (header.huidigeTijd >= verhaal.time &&
                header.huidigeTijd < verhaal.time + self.tijdZichtbaar) {
            // tekst fade
            if (!self.isTextFading) {
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
            }
            var face = '';
            // trace back last face
            for (var j = i; j >= 0; j--) {
                if (self.data[j].face) {
                    face = self.data[j].face;
                    break;
                }
            }
            self.gezicht.attr('src', face ? (header.route.faceDir + face + self.gezichtExtensie) : '');
            if (!self.verhaal.is(':visible')) {
                self.verhaal.fadeIn(self.fadeDuration);
            }

            self.setVerhaal(verhaal);
            return;
        }
    }
    // geen verhaal.
    self.verhaal.fadeOut(self.fadeDuration, function() {
        self.tekst.html('');
        self.gezicht.attr('src', '');
    });
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
            video.onVerhaalEindigt();
        } else if (this.huidigVerhaal === null) {
            // start
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
            $("#routenaam").html(route.titel);
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
            if (video.isPlaying()) {
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
            routeMenu.hover(function() {
                menu.css('display', 'block');
            }, function() {
                menu.css('display', 'none');
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
                this.route = routes[i];
                this.labelRouteNaam.setRoute(this.route);
                this.knopRouteMenu.updateRouteMenu();

                if (grafiek)
                    grafiek.onRouteVeranderd();
                if (video)
                    video.onRouteVeranderd();
                if (kaart)
                    kaart.onRouteVeranderd();
                if (verhaal) {
                    verhaal.onRouteVeranderd();
                }
                return;
            }
        }
    },
    setHuidigeTijd: function(tijd, ignore) {
        this.huidigeTijd = tijd;
        // video
        if (ignore !== 'video' && !video.onTijdVeranderd()) {
            // de video kan niet geskipt worden.
            return;
        }
        grafiek.onTijdVeranderd();
        kaart.onTijdVeranderd();
        verhaal.onTijdVeranderd();
    }
};


gpxparser = {
    parse_gpx: function(xml) {
        var coords = [];
        var tags = [['rte', 'rtept'], ['trkseg', 'trkpt']];
        for (var j = 0; j < tags.length; j++) {
            var el = xml.getElementsByTagName(tags[j][0]);
            for (var i = 0; i < el.length; i++) {
                var trackSegment = this.parse_trkseg(el[i], tags[j][1]);
                if (trackSegment.length > 0) {
                    coords.push(trackSegment);
                }
            }
        }
        return coords;
    },
    parse_trkseg: function(line, tag) {
        var el = line.getElementsByTagName(tag);
        if (!el.length)
            return [];
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
    }
};