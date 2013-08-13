// -----------------------------------------------------------------------------
// NOG TE DOEN:
//
// 1. object georienteerd
// 2. kaart beweegt mee
// 3. grafiek schaling wordt animatie
// 4. gezichten en verhaaltjes.
// 5. meerdere routes
// 5a route menu
// -----------------------------------------------------------------------------

var route, huidigeTijd = 0;
var routes = {
    'Amsterdam': {
        'titel': 'Oscar\'s route van Amsterdam',
        'pad': 'data/amsterdam-1/'
    }
};
for (var key in routes) {
    if (routes.hasOwnProperty(key)) {
        var route = routes[key];
        route.naam = key;
        route.grafiek = route.pad + 'meetresultaten.json';
        route.kaart = route.pad + 'track.gpx';
        route.videosrc = [
            route.pad + 'movie.mp4',
            route.pad + 'movie.webm'
        ];
    } else {
        alert('skip ' + key);
    }
}

setRoute('Amsterdam');

function setRoute(routeNaam) {
    route = routes[routeNaam];
    if (header) {
        header.labelRouteNaam.setRoute(route);
    }
}

var util = {
    rondAf: function(getal, significanteCijfers) {
        var verkleining = Math.pow(10, this.aantalCijfers(getal) - significanteCijfers);
        return Math.round(getal / verkleining) * verkleining;
    },
    aantalCijfers: function(getal) {
        var check = 1, cijfers = 0;
        while (getal >= check) {
            check *= 10;
            cijfers++;
        }
        return cijfers;
    }
};

var header, grafiek, video, kaart;

// Grafiek
function Grafiek() {
    this.data = null;
    var canvas = $('#canvas');
    var self = this;
    canvas.bind('click', {widget: self}, self.onGrafiekGeklikt);
    $(window).resize(function(e) {
        self.tekenGrafiek();
    });

    this.onRouteVeranderd();
}
// 'events'
Grafiek.prototype.onRouteVeranderd = function() {
    var self = this;
    $.getJSON(route.grafiek).done(function(d) {
        self.data = d;
        self.tekenGrafiek();
    });
};
Grafiek.prototype.onGrafiekGeklikt = function(event) {
    var self = event.data.widget;
    var canvas = $('#canvas');
    var offset = canvas.offset();
    var x = offset ? event.clientX - offset.left : event.clientX;
    var c = canvas.get(0).getContext('2d');
    var paddingLeft = self.getPaddingLeft(c, self.hoogste('value'));
    var paddingX = 15;
    x -= paddingX + paddingLeft;
    var breedte = canvas.width() - 2 * paddingX - paddingLeft;
    if (x < 0) {
        x = 0;
    } else if (x > breedte) {
        x = breedte;
    }
    setHuidigeTijd(self.pixelNaarWaardeX(breedte, x,
            self.laagste('time'), self.hoogste('time')), 'grafiek');
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
Grafiek.prototype.waardeNaarPixelX = function(breedte, waarde, min, max) {
    return breedte * (waarde - min) / (max - min);
};
Grafiek.prototype.pixelNaarWaardeX = function(breedte, pixel, min, max) {
    return pixel * (max - min) / breedte + min;
};
Grafiek.prototype.waardeNaarPixelY = function(hoogte, waarde, min, max) {
// bijna hetzelfde
    return hoogte - this.waardeNaarPixelX(hoogte, waarde, min, max);
};
Grafiek.prototype.waardeNaarTijd = function(waarde) {
    for (var i = 0; i < this.data.length; i++) {
        if (this.data[i].time > waarde) {
            if (i > 0) {
                var t1 = Math.abs(this.data[i].time - waarde);
                var t2 = Math.abs(this.data[i - 1].time - waarde);
                if (t2 <= t1) {
                    // dichterbij
                    return i - 1;
                }
            }
            return i;
        }
    }
};
Grafiek.prototype.getPaddingLeft = function(context2D, max) {
    context2D.font = 'italic 11px arial';
    context2D.textAlign = 'right';
    context2D.textBaseline = 'middle';
    return context2D.measureText(max.toString()).width + 5;
};
Grafiek.prototype.getYBounds = function() {
    var minY = 0, maxY = 40000;
    if (this.data && this.data.length > 0) {
        var hoogsteWaarde = false, huidigeIndex = this.waardeNaarTijd(huidigeTijd);
        for (var i = huidigeIndex - 10; i <= huidigeIndex + 10; i++) {
            if (i >= 0 && i < this.data.length) {
                var waarde = this.data[i].value;
                if (hoogsteWaarde === false || waarde > hoogsteWaarde) {
                    hoogsteWaarde = waarde;
                }
            }
        }
        if (hoogsteWaarde !== false && hoogsteWaarde > maxY) {
            maxY = hoogsteWaarde;
        }
    }
    return {min: minY, max: maxY};
};
// tekenen
Grafiek.prototype.tekenGrafiek = function() {
    var colors = {
        background: '#f8f8f8',
        hoofdstrepen: '#333333',
        strepen: 'rgba(128,128,128,0.5)',
        yasbeschrijving: '#333333',
        shape_stroke: 'rgba(110, 37, 133, 0.75)',
        shape_fill: 'rgba(110, 37, 133, 0.5)',
        tijd_balk: '#00a9e0'
    };
    var graph = $('#canvas');
    var graphElem = graph.get(0);
    graphElem.width = $('#grafiek').width();
    var c = graphElem.getContext('2d');
    var w = graph.width(), h = graph.height();
    c.fillStyle = colors.background;
    c.fillRect(0, 0, w, h);
    var paddingX = 15, paddingY = paddingX;
    w -= 2 * paddingX;
    h -= 2 * paddingY;
    var paddingLeft = 0, paddingBottom = 0;

    c.translate(paddingX, paddingY);

    if (this.data && this.data.length) {
        paddingLeft = this.getPaddingLeft(c, this.hoogste('value'));
        var yBounds = this.getYBounds();
        var minX = this.laagste('time'), maxX = this.hoogste('time');
        c.strokeStyle = colors.strepen;
        // verticale strepen
        var aantalStrepen = (maxX - minX) / 50; // om de 50 seconden
        for (var i = 0; i < aantalStrepen; i++) {
            var x = paddingLeft + (w - paddingLeft) * i / aantalStrepen;
            c.beginPath();
            c.moveTo(x, 0);
            c.lineTo(x, h - paddingBottom);
            c.stroke();
        }

        // ultrafijnstof y-asbeschrijving, bv 40000, 35000, 30000
        c.fillStyle = colors.yasbeschrijving;
        // horizontale strepen
        aantalStrepen = 5;
        for (var i = 0; i <= aantalStrepen; i++) {
            var y = (h - paddingBottom) - (h - paddingBottom) * i / aantalStrepen;
            c.beginPath();
            c.moveTo(paddingLeft, y);
            c.lineTo(w, y);
            c.stroke();
            var value = util.rondAf(yBounds.min + (yBounds.max - yBounds.min) * i / aantalStrepen, 3);
            c.fillText(value.toString(), paddingLeft - 5, y);
        }
        // clip
        if (c.clip) {
            c.save();
            c.beginPath();
            c.moveTo(paddingLeft, 0);
            c.lineTo(w, 0);
            c.lineTo(w, h - paddingBottom);
            c.lineTo(paddingLeft, h - paddingBottom);
            c.clip();
        }
        // lijnen
        c.beginPath();
        for (var i = 0; i < this.data.length; i++) {
            var x = paddingLeft + this.waardeNaarPixelX(w - paddingLeft, this.data[i].time, minX, maxX);
            var y = this.waardeNaarPixelY(h - paddingBottom, this.data[i].value, yBounds.min, yBounds.max);
            if (i === 0) {
                c.moveTo(x, y);
            } else {
                c.lineTo(x, y);
            }
        }
        c.lineTo(w, h - paddingBottom);
        c.lineTo(paddingLeft, h - paddingBottom);
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
    }
    // assen
    c.lineWidth = 1;
    c.strokeStyle = colors.hoofdstrepen;
    c.beginPath();
    c.moveTo(paddingLeft, 0);
    c.lineTo(paddingLeft, h - paddingBottom);
    c.lineTo(w, h - paddingBottom);
    c.stroke();
    // huidigeTijd tekenen
    if (this.data && this.data.length && huidigeTijd <= maxX) {
        c.lineWidth = 2;
        c.strokeStyle = colors.tijd_balk;
        var x = paddingLeft + this.waardeNaarPixelX(w - paddingLeft, huidigeTijd, minX, maxX);
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, h);
        c.stroke();
    }
};


// Video
function Video() {
    this.playbackRate = 1;
    this.listeners = [];
    this.vid = $('#videotag');

    var self = this;
    this.vid.bind('playing', {widget: self}, self.onPlay);
    this.vid.bind('pause', {widget: self}, self.onPause);
    this.vid.bind('timeupdate', {widget: self}, self.onTimeUpdate);
    this.vid.bind('ratechange', {widget: self}, self.onRateChanged);
    this.vid.bind('click', function() {
        self.togglePlaying();
    });

    this.onRouteVeranderd();
}
Video.prototype.onRouteVeranderd = function() {
    this.vid.empty();
    for (var i = 0; i < route.videosrc.length; i++) {
        $("<source />", {
            'src': route.videosrc[i]
        }).appendTo(this.vid);
    }
    this.vid.get(0).load();
};
// events:
Video.prototype.onPlay = function(evt) {
    var self = evt.data.widget;
    self.setPlaybackRate();
    for (var i = 0; i < self.listeners.length; i++) {
        self.listeners[i].update();
    }
};
Video.prototype.onPause = function(evt) {
    var self = evt.data.widget;
    for (var i = 0; i < self.listeners.length; i++) {
        self.listeners[i].update();
    }
};
Video.prototype.onTimeUpdate = function(evt) {
    var self = evt.data.widget;
    var time = self.vid.get(0).currentTime;
    setHuidigeTijd(time, 'video');
};
Video.prototype.onRateChanged = function(evt) {
    var self = evt.data.widget;
    this.playbackRate = self.vid.get(0).playbackRate;
    for (var i = 0; i < self.listeners.length; i++) {
        self.listeners[i].update();
    }
};
// overige
Video.prototype.togglePlaying = function() {
    if (this.isPlaying()) {
        this.pause();
    } else {
        this.play();
    }
};
Video.prototype.isPlaying = function() {
    return !this.vid.get(0).paused;
};
Video.prototype.play = function() {
    this.vid.get(0).play();
};
Video.prototype.pause = function() {
    this.vid.get(0).pause();
};
Video.prototype.setPlaybackRate = function(playbackRate) {
    if (arguments.length > 0) {
        this.playbackRate = playbackRate;
    }
    this.vid.get(0).playbackRate = this.playbackRate;
};
Video.prototype.getPlaybackRate = function(video) {
    if (video) {
        return this.vid.get(0).playbackRate;
    } else {
        return this.playbackRate;
    }
};
Video.prototype.currentTime = function(currentTime) {
    if (arguments.length === 0) {
        return this.vid.get(0).currentTime;
    } else {
        this.vid.get(0).currentTime = currentTime;
    }
};
// listener moet function 'update()' hebben.
Video.prototype.addListener = function(listener) {
    this.listeners.push(listener);
};


// Kaart
function Kaart() {
    this.options = {
        line: {
            stroke: true, color: '#00a9e0', opacity: 1, weight: 5
        }, marker: {
            stroke: true, color: '#00a9e0', opacity: 1, weight: 5,
            fill: true, fillOpacity: 1, fillColor: '#eeeeee'
        }
    };

    this.map = L.map('kaartje').setView([52.15, 5.30], 7);
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
    }).addTo(this.map);

    this.onRouteChanged();
}
Kaart.prototype.onRouteChanged = function() {
    var self = this;
    $.ajax({
        url: route.kaart,
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
        this.locatieLines.push(new L.polyline(this.locaties[i], this.options.line).addTo(this.map));
    }
    if (this.marker) {
        this.marker.setLatLng(this.locaties[0][0]);
        this.marker.setRadius(5);
    } else {
        this.marker = new L.CircleMarker(this.locaties[0][0], this.options.marker).setRadius(5).addTo(this.map);
    }
    if (this.locaties.length > 0) {
        this.map.fitBounds(new L.LatLngBounds(this.locaties[this.locaties.length - 1]));
    }
};
Kaart.prototype.onTijdVeranderd = function() {
    if (this.locaties && this.locatie.segment >= 0 && this.locatie.punt >= 0
            && this.locatie.segment < this.locaties.length
            && this.locatie.punt < this.locaties[this.locatie.segment].length) {
        this.updateMarker();
    }
};
// marker hulpmethodes
Kaart.prototype.updateLocatie = function() {
    var beginTijd = this.locaties[0][0].tijd;
    var locatie = this.locaties[this.locatie.segment][this.locatie.punt];
    var millitijd = huidigeTijd * 1000;
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
        var tijd1 = punt1.tijd;
        var tijd2 = punt2.tijd;

        var beginTijd = this.locaties[0][0].tijd;
        var huidigeTijdMillis = huidigeTijd * 1000;

        var locInterpoleerd = this.interpolate(huidigeTijdMillis,
                tijd1 - beginTijd, tijd2 - beginTijd, punt1, punt2); // tussen 0 en 1

        this.marker.setLatLng(locInterpoleerd);
    }
};


$(document).ready(function() {
    grafiek = new Grafiek();
    video = new Video();
    kaart = new Kaart();

    header = {
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
                if (video.getPlaybackRate() === 1) {
                    video.setPlaybackRate(4);
                } else {
                    video.setPlaybackRate(1);
                }
            },
            update: function() {
                var speedknop = $('#knop-snelheid');
                var rate = video.getPlaybackRate();
                if (rate === 1) {
                    speedknop.html('&#9193; Sneller afspelen');
                } else {
                    speedknop.html('&#9656; Langzamer afspelen');
                }
            }
        },
        labelRouteNaam: {
            init: function() {
                $('#routenaam').html(route.titel);
            },
            setRoute: function(route) {
                $("#routenaam").html(route.titel);
            }
        },
        knopAndereRoutes: {
            onPress: function() {

            }
        }
    };

    header.knopPlay.init();
    header.knopSpeed.init();
    header.labelRouteNaam.init();
    video.addListener(header.knopPlay);
    video.addListener(header.knopSpeed);
});



function setHuidigeTijd(tijd, ignore) {
    huidigeTijd = tijd;
    // video
    if (ignore !== 'video') {
        video.currentTime(huidigeTijd);
        if (video.currentTime() !== huidigeTijd) {
            // luistert niet naar set current time.
            // We kunnen dus niet stukken overslaan...
            // Misschien is het nog niet binnengehaald?
            return;
        }
    }
    // grafiek
    grafiek.tekenGrafiek();
    // kaart
    if (ignore !== 'kaart') {
        kaart.onTijdVeranderd();
    }
}

gpxparser = {
    parse_gpx: function(xml) {
        var coords = [];
        var tags = [['rte', 'rtept'], ['trkseg', 'trkpt']];
        for (var j = 0; j < tags.length; j++) {
            var el = xml.getElementsByTagName(tags[j][0]);
            for (var i = 0; i < el.length; i++) {
                var trackSegment = this.parse_trkseg(el[i], xml, tags[j][1]);
                if (trackSegment.length > 0) {
                    coords.push(trackSegment);
                }
            }
        }
        return coords;
    },
    parse_trkseg: function(line, xml, tag) {
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