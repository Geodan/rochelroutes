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

var routes = {
    'Amsterdam': {
        'titel': 'Oscar\'s route van Amsterdam',
        'pad': 'data/amsterdam-1/'
    }
};
var route, data, dataURL, huidigeTijd = 0, playbackRate = 1;
// kaart variabelen. locaties = alle plaatsen zoals: [ [ LatLon: { tijd: ?, hoogte: ? }, ... punten ... ], ... segmenten ... ]
// beginTijd = Date van eerste locatie. Huidigelocatie = segmentindex in locaties en puntindex, locatieMarker is marker op huidige locatie.
var locaties, beginTijd = 0, huidigeLocatie = {seg: 0, pt: 0}, locatieMarker = null;
setRoute('Amsterdam');
function setRoute(routeNaam) {
    route = routeNaam;
    dataURL = routes[routeNaam].pad;
    if (header) {
        header.labelRouteNaam.setRoute(routes[routeNaam]);
    }
    //$('#routenaam').html(routes[routeNaam].titel).css('width', 'auto');
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


function Grafiek() {
    this.data = null;
    this.init();
}
;
Grafiek.prototype.init = function() {
    var canvas = $('#canvas');
    var thiz = this, geklikt = this.onGrafiekGeklikt;
    canvas.click(function(event) {
        geklikt.call(thiz, event);
    });
    this.onRouteVeranderd();
};
Grafiek.prototype.onRouteVeranderd = function() {
    var thiz = this, redraw = this.tekenGrafiek;
    $.getJSON(dataURL + 'meetresultaten.json').done(function(d) {
        thiz.data = d;
        redraw.call(thiz, d);
    });
};
Grafiek.prototype.onGrafiekGeklikt = function(event) {
    var canvas = $('#canvas');
    var offset = canvas.offset();
    var x = offset ? event.clientX - offset.left : event.clientX;
    var c = canvas.get(0).getContext('2d');
    var paddingLeft = this.getPaddingLeft(c, this.hoogste('value'));
    var paddingX = 15;
    x -= paddingX + paddingLeft;
    var breedte = canvas.width() - 2 * paddingX - paddingLeft;
    if (x < 0) {
        x = 0;
    } else if (x > breedte) {
        x = breedte;
    }
    setHuidigeTijd(this.pixelNaarWaardeX(breedte, x,
            this.laagste('time'), this.hoogste('time')), 'grafiek');
};
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
    context2D.font = 'italic 9pt Arial';
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
Grafiek.prototype.tekenGrafiek = function() {
    var graph = $('#canvas');
    var graphElem = graph.get(0);
    graphElem.width = $('#grafiek').width();
    var c = graphElem.getContext('2d');
    var w = graph.width(), h = graph.height();
    c.fillStyle = '#f8f8f8';
    c.fillRect(0, 0, w, h);
    var yBounds = this.getYBounds();
    var paddingX = 15, paddingY = paddingX;
    var paddingLeft = this.getPaddingLeft(c, this.hoogste('value')), paddingBottom = 0;
    w -= 2 * paddingX;
    h -= 2 * paddingY;
    c.translate(paddingX, paddingY);
    if (this.data && this.data.length) {
        var minX = this.laagste('time'), maxX = this.hoogste('time');
        c.strokeStyle = 'rgba(150,150,150, 0.5)';
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
        c.fillStyle = '#333333';
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
        c.fillStyle = 'rgba(150, 0, 180, 0.3)';
        c.fill();
        c.lineWidth = 2;
        c.strokeStyle = 'rgba(200, 0, 255, 0.8)';
        c.stroke();
        // unclip
        if (c.restore) {
            c.restore();
        }
    }
    // assen
    c.lineWidth = 1;
    c.strokeStyle = '#000';
    c.beginPath();
    c.moveTo(paddingLeft, 0);
    c.lineTo(paddingLeft, h - paddingBottom);
    c.lineTo(w, h - paddingBottom);
    c.stroke();
    // huidigeTijd tekenen
    if (this.data && this.data.length && huidigeTijd <= maxX) {
        c.strokeStyle = '#0044ff';
        var x = paddingLeft + this.waardeNaarPixelX(w - paddingLeft, huidigeTijd, minX, maxX);
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, h);
        c.stroke();
    }
};


function Video() {
    this.playbackRate = 1;
    this.listeners = [];
    this.vid = $('#videotag');
    var _vid = this.vid.get(0);
    _vid.onplaying = function() {
        console.log('0');
        video.onPlay();
    };
    _vid.onpause = function() {
        console.log('1');
        video.onPause();
    };
    _vid.ontimeupdate = function() {
        console.log('2');
        video.onTimeUpdate();
    };
    _vid.onplaying = function() {
        console.log('3');
        video.onPlay();
    };
    _vid.onratechange = function() {
        console.log('4');
        video.onRateChanged();
    };

    /*
     this.vid.attr('onplaying', 'video.onPlay();');
     this.vid.attr('onpause', 'video.onPause();');
     this.vid.attr('ontimeupdate', 'video.onTimeUpdate();');
     this.vid.attr('onratechange', 'video.onRateChanged();');
     */
    var thiz = this, toggle = this.togglePlaying;
    this.vid.click(function() {
        toggle.call(thiz);
    });
}

Video.prototype.setVideoURL = function() {
    this.vid.attr('src', dataURL + 'movie.webm');
};
// events:
Video.prototype.onPlay = function() {
    this.setPlaybackRate();
    for (var i = 0; i < this.listeners.length; i++) {
        this.listeners[i].update();
    }
};
Video.prototype.onPause = function() {
    for (var i = 0; i < this.listeners.length; i++) {
        this.listeners[i].update();
    }
};
Video.prototype.onTimeUpdate = function() {
    var time = this.vid.get(0).currentTime;
    setHuidigeTijd(time, 'video');
};
Video.prototype.onRateChanged = function() {
    this.playbackRate = this.vid.get(0).playbackRate;
    for (var i = 0; i < this.listeners.length; i++) {
        this.listeners[i].update();
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
Video.prototype.setCurrentTime = function(currentTime) {
    this.vid.get(0).currentTime = currentTime;
};
// listener moet function 'update()' hebben.
Video.prototype.addListener = function(listener) {
    this.listeners.push(listener);
};


$(document).ready(function() {
    grafiek = new Grafiek();
    video = new Video();

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
                $('#routenaam').html(routes[route].titel);
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
    $.ajax({
        url: dataURL + 'track.gpx',
        dataType: 'xml'
    }).done(function(data) {
        locaties = gpxparser.parse_gpx(data);
        if (locaties.length === 0) {
            return;
        }
// http://leafletjs.com/reference.html#path-options
        var polyline_options = {
            color: '#7237A3',
            opacity: 1,
            weight: 3
        };
        beginTijd = locaties[0][0].tijd;
        huidigeLocatie.seg = 0;
        huidigeLocatie.pt = 0;
        locatieMarker = L.marker(locaties[0][0]).addTo(map);
        for (var i = 0; i < locaties.length; i++) {
            new L.polyline(locaties[i], polyline_options).addTo(map);
        }
        if (locaties.length >= 1) {
            map.fitBounds(new L.LatLngBounds(locaties[locaties.length - 1]), {padding: [5, 5]});
        }
    });
});
/*
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
 */
function setHuidigeTijd(tijd, ignore) {
    huidigeTijd = tijd;
    // grafiek
    grafiek.tekenGrafiek();
    // video
    if (ignore !== 'video') {
        video.setCurrentTime(huidigeTijd);
    }
    // kaart
    if (ignore !== 'kaart') {
        syncHuidigeLocatie();
        syncMarker();
    }
}

function next(i, j, forward) {
    if (forward) {
// eerstvolgende punt na i,j uit locaties
        if (locaties[i].length > j + 1) {
            return {seg: i, pt: j + 1};
        } else {
//var k = i + 1;
            for (i++; i < locaties.length; i++) {
                if (locaties[i].length > 0) {
                    return {seg: i, pt: 0};
                }
            }
            return null;
        }
    } else {
// vorige punt
        if (j - 1 >= 0) {
            return {seg: i, pt: j - 1};
        } else {
            for (i--; i < locaties.length; i++) {
                if (locaties[i].length > 0) {
                    return {seg: i, pt: locaties[i].length - 1};
                }
            }
            return null;
        }
    }
}

function syncHuidigeLocatie() {
    if (!locaties || huidigeLocatie.seg < 0 || huidigeLocatie.pt < 0
            || huidigeLocatie.seg >= locaties.length
            || huidigeLocatie.pt >= locaties[huidigeLocatie.seg].length) {
        return;
    }

    var loc = locaties[huidigeLocatie.seg][huidigeLocatie.pt];
    var millitijd = huidigeTijd * 1000;
    if (loc.tijd - beginTijd === millitijd) {
        return;
    } else if (loc.tijd - beginTijd < millitijd) {
// verder in de tijd
        for (var i = huidigeLocatie.seg; i < locaties.length; i++) {
            var j = (i === huidigeLocatie.seg) ? huidigeLocatie.pt : 0;
            for (; j < locaties[i].length; j++) {
// ga elk punt af vanaf seg,pt tot het laatste punt
                if (locaties[i][j].tijd - beginTijd > millitijd) {
// kijk welke er het dichtste bijzit: dit punt of de vorige
                    var vorige = next(i, j, false);
                    if (vorige !== null) {
                        var t1 = Math.abs(locaties[i][j].tijd - beginTijd - millitijd);
                        var t2 = Math.abs(locaties[vorige.seg][vorige.pt].tijd - beginTijd - millitijd);
                        if (t2 < t1) {
// dichter bij millitijd in de buurt
                            huidigeLocatie.seg = vorige.seg;
                            huidigeLocatie.pt = vorige.pt;
                            return;
                        } else if (t2 === t1) {
                            return;
                        }
                    }
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
            var j = (i === huidigeLocatie.seg) ? huidigeLocatie.pt : locaties[i].length - 1;
            for (; j >= 0; j--) {
// ga elk punt af vanaf seg,pt tot 0,0
                if (locaties[i][j].tijd - beginTijd < millitijd) {
// kijk welke er het dichtste bijzit: dit punt of de volgende
                    var volgende = next(i, j, true);
                    if (volgende !== null) {
                        var t1 = Math.abs(locaties[i][j].tijd - beginTijd - millitijd);
                        var t2 = Math.abs(locaties[volgende.seg][volgende.pt].tijd - beginTijd - millitijd);
                        if (t2 < t1) {
// dichter bij millitijd in de buurt
                            huidigeLocatie.seg = volgende.seg;
                            huidigeLocatie.pt = volgende.pt;
                            return;
                        } else if (t2 === t1) {
                            return;
                        }
                    }
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
    if (locatieMarker) {
        locatieMarker.setLatLng(locaties[huidigeLocatie.seg][huidigeLocatie.pt]);
    }
}

$(window).resize(function(e) {
    grafiek.tekenGrafiek();
});

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