/* -----------------------------------------------------------------------------
 TODO:
 1. klikken op de kaart
 2. grafiek schaling wordt animatie
 3. verhaaltjes staan beschreven op grafiek.
 4. kaart wordt groter bij 'fullscreen' knop
 ------------------------------------------------------------------------------*/
var routes = {
    'Amsterdam': {
        'titel': 'Oscar\'s route van Amsterdam',
        'pad': 'data/amsterdam-1/'
    },
    'Test': {
        'titel': 'test route van niks eigenlijk...',
        'pad': 'data/amsterdam-1/'
    }
};
(function() {
    for (var key in routes) {
        if (routes.hasOwnProperty(key)) {
            var route = routes[key];
            route.naam = key;
            route.grafiek = route.pad + 'meetresultaten.json';
            route.kaart = route.pad + 'track.gpx';
            route.verhaal = route.pad + 'verhaal.json';
            route.faceDir = route.pad + 'faces/';
            route.videosrc = [
                route.pad + 'movie.mp4',
                route.pad + 'movie.webm'
            ];
        }
    }
}());

var grafiek, video, kaart, header, gpxtracker, verhaal;

$(document).ready(function() {
    header.setRoute('Amsterdam');

    header.labelRouteNaam.init();
    header.knopPlay.init();
    header.knopSpeed.init();
    header.knopRouteMenu.init();

    grafiek = new Grafiek();
    kaart = new Kaart();
    video = new Video();
    verhaal = new Verhaal();

    video.addListener(header.knopPlay);
    video.addListener(header.knopSpeed);
});



// Grafiek
function Grafiek() {
    this.data = null;

    var self = this;
    $('#canvas').bind('click', {widget: self}, self.onGrafiekGeklikt);
    $(window).resize(function(e) {
        self.tekenGrafiek();
    });

    this.onRouteVeranderd();
}
// 'events'
Grafiek.prototype.onRouteVeranderd = function() {
    var self = this;
    $.getJSON(header.route.grafiek).done(function(d) {
        self.data = d;
        self.tekenGrafiek();
    });
};
Grafiek.prototype.onGrafiekGeklikt = function(evt) {
    var self = evt.data.widget;
    var canvas = $('#canvas');
    var offset = canvas.offset();
    var x = offset ? evt.clientX - offset.left : evt.clientX;
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
    header.setHuidigeTijd(self.pixelNaarWaardeX(breedte, x,
            self.laagste('time'), self.hoogste('time')), 'grafiek');
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
    context2D.font = '11px arial';
    context2D.textAlign = 'right';
    context2D.textBaseline = 'middle';
    return context2D.measureText(max.toString()).width + 5;
};
Grafiek.prototype.getYBounds = function() {
    var minY = 0, maxY = 40000;
    if (this.data && this.data.length > 0) {
        var hoogsteWaarde = false, huidigeIndex = this.waardeNaarTijd(header.huidigeTijd);
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
Grafiek.prototype.rondAf = function(getal, significanteCijfers) {
    var check = 1, cijfers = 0;
    while (getal >= check) {
        check *= 10;
        cijfers++;
    }
    var verkleining = Math.pow(10, cijfers - significanteCijfers);
    return Math.round(getal / verkleining) * verkleining;
};
// tekenen
Grafiek.prototype.tekenGrafiek = function() {
    var colors = {
        hoofdstrepen: '#333333',
        strepen: 'rgba(128,128,128,0.5)',
        yasbeschrijving: '#000000',
        shape_stroke: 'rgba(110, 37, 133, 0.6)',
        shape_fill: 'rgba(110, 37, 133, 0.4)',
        tijd_balk: '#00a9e0'
    };
    var graph = $('#canvas');
    var graphElem = graph.get(0);
    graphElem.width = $('#grafiek').width();
    var c = graphElem.getContext('2d');
    var paddingX = 15, paddingY = paddingX;
    var w = graph.width() - 2 * paddingX, h = graph.height() - 2 * paddingY;
    var paddingLeft = 0, paddingBottom = 0;

    c.translate(paddingX, paddingY);

    if (this.data && this.data.length) {
        paddingLeft = this.getPaddingLeft(c, this.hoogste('value'));
        var yBounds = this.getYBounds();
        var minX = this.laagste('time'), maxX = this.hoogste('time');

        c.strokeStyle = colors.strepen;
        // verticale strepen
        var aantalStrepen = (maxX - minX) / 60; // om de 60 seconden
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
        var omde = 10000, keer5 = true;
        do {
            aantalStrepen = (yBounds.max - yBounds.min) / omde;
            omde *= keer5 ? 5 : 2;
        } while (aantalStrepen > 10);
        for (var i = 0; i <= aantalStrepen; i++) {
            var y = (h - paddingBottom) - (h - paddingBottom) * i / aantalStrepen;
            c.beginPath();
            c.moveTo(paddingLeft, y);
            c.lineTo(w, y);
            c.stroke();
            var value = this.rondAf(yBounds.min + (yBounds.max - yBounds.min) * i / aantalStrepen, 3);
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
    if (this.data && this.data.length) {
        var huidigeTijd = header.huidigeTijd > maxX ? maxX : header.huidigeTijd;

        c.lineWidth = 3;
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
    for (var i = 0; i < header.route.videosrc.length; i++) {
        $("<source />", {
            'src': header.route.videosrc[i]
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
    header.setHuidigeTijd(time, 'video');
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
Video.prototype.onTijdVeranderd = function() {
    video.currentTime(header.huidigeTijd);
    return video.currentTime() === header.huidigeTijd;
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
    });
};
Verhaal.prototype.onTijdVeranderd = function() {
    var self = this;
    for (var i = this.data.length - 1; i >= 0; i--) {
        var verhaal = this.data[i];
        if (header.huidigeTijd >= verhaal.time &&
                header.huidigeTijd < verhaal.time + this.tijdZichtbaar) {
            // tekst fade
            if (!this.isTextFading) {
                if (this.tekst.html() && this.tekst.html() !== verhaal.text) {
                    this.isTextFading = true;
                    this.tekst.fadeOut(this.textFade, function() {
                        self.tekst.html(verhaal.text).fadeIn(self.textFade, function() {
                            self.isTextFading = false;
                        });
                    });
                } else {
                    this.tekst.html(verhaal.text);
                }
            }
            var face = '';
            // trace back last face
            for (var j = i; j >= 0; j--) {
                if (this.data[j].face) {
                    face = this.data[j].face;
                    break;
                }
            }
            this.gezicht.attr('src', face ? (header.route.faceDir + face + this.gezichtExtensie) : '');


            if (!this.verhaal.is(':visible')) {
                this.verhaal.fadeIn(this.fadeDuration);
            }
            return;
        }
    }
    // geen verhaal.
    this.verhaal.fadeOut(this.fadeDuration, function() {
        self.tekst.html('');
        self.gezicht.attr('src', '');
    });
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
            for (var i in routes) {
                var routeNaam = routes[i].naam;
                var li = $('<li></li>');
                if (header.route && routeNaam === header.route.naam) {
                    li.addClass('current');
                }
                var action = function(evt) {
                    header.setRoute(evt.data.routeNaam);
                };
                li.append($('<a></a>').html(routeNaam).addClass('klikbaar').click({routeNaam: i}, action));
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
        this.route = routes[routeNaam];
        this.labelRouteNaam.setRoute(this.route);
        this.knopRouteMenu.updateRouteMenu();

        if (grafiek)
            grafiek.onRouteVeranderd();
        if (video)
            video.onRouteVeranderd();
        if (kaart)
            kaart.onRouteVeranderd();
    },
    setHuidigeTijd: function(tijd, ignore) {
        this.huidigeTijd = tijd;
        // video
        if (ignore !== 'video') {
            if (!video.onTijdVeranderd()) {
                // de video kan niet geskipt worden.
                return;
            }
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