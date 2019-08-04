var map;

function GetMap() {
    map = new Microsoft.Maps.Map("#map", {
        center: new Microsoft.Maps.Location(40.740456, -73.992088),
        mapTypeId: Microsoft.Maps.MapTypeId.road,
        zoom: 13,
        disableScrollWheelZoom: true,
    });
    drawBusPath();
}

// var BUSTIME_URL = "https://bustime.mta.info/api/where/routes-for-agency/MTA%20NYCT.xml?key=37a0f4fb-981f-4007-8471-e676a2e92b16"
// var ROUTE_URL = "http://bustime.mta.info/api/where/stops-for-route/MTA%20NYCT_M20.json?key=37a0f4fb-981f-4007-8471-e676a2e92b16&version=2";
ROUTE_URL = "data.json";

function drawBusPath(){
    Promise.all([
        d3.json(ROUTE_URL)
    ]).then(loadBusData);
}

function loadBusData(allData){
    var busData = allData[0].data;
    var originPolylineLs = busData.entry.polylines;
    var stopLs = busData.references.stops;
    console.log(busData);
    // parse polylines
    var polylineLs = [];
    for(var i = 0; i < originPolylineLs.length; i ++){
        var polyline = [];
        if(originPolylineLs[i].points){
            var parseArray = L.PolylineUtil.decode(originPolylineLs[i].points);
            for(var j = 0; j < parseArray.length; j ++){
                polyline.push(new Microsoft.Maps.Location(parseArray[j][0], parseArray[j][1]));
            }
            polylineLs.push(polyline);
        }
    }
    // create polyline
    for(var i = 0; i < polylineLs.length; i ++){
        var polyline = new Microsoft.Maps.Polyline(polylineLs[i], {
            strokeColor: "orange",
            strokeThickness: 2
        });
        map.entities.push(polyline);
    }
    var busLocation = [];
    var filterStop = [];
    for(var i = 0; i < stopLs.length; i ++){
        var stop = stopLs[i];
        var routeIds = stop.routeIds;
        var is_bus = false;
        for(var j = 0; j < routeIds.length; j ++){
            if(routeIds[j].indexOf("MTABC") != -1){
                is_bus = true;
                break;
            }
        }
        if(is_bus){
            busLocation.push(stop);
        }else{
            filterStop.push(stop);
        }
    }
    // create point
    Microsoft.Maps.loadModule('Microsoft.Maps.SpatialMath', function () {
        for(var i = 0; i < filterStop.length; i ++){
            var stop_pos = new Microsoft.Maps.Location(filterStop[i].lat, filterStop[i].lon);
            var locs = Microsoft.Maps.SpatialMath.getRegularPolygon(stop_pos, 0, 36, Microsoft.Maps.SpatialMath.DistanceUnits.Miles);
            var poly = new Microsoft.Maps.Polygon(locs, { 
                strokeColor: "red",
                strokeThickness: 3
            });
            map.entities.push(poly);
        }
    });
    // create bus location
    var img = new Image();
    img.src = "bus2.png";
    img.onload = function(){
        var c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        var context = c.getContext("2d");
        context.drawImage(img, 0, 0);
        for(var i = 0; i < busLocation.length; i ++){
            var busL = busLocation[i];
            var location = new Microsoft.Maps.Location(busL.lat, busL.lon);
            var pin = new Microsoft.Maps.Pushpin(location, {
                icon: c.toDataURL(),
                anchor: new Microsoft.Maps.Point(busL.lat, busL.lon)
            });
            map.entities.push(pin);
        }
    }
}
