config = {
    "marker-icons":{
        "Above 100 MW":"img/marker_above_100.png",
        "Between 25 and 100 MW":"img/marker_25_to_100.png",
        "Between 1 and 25 MW":"img/marker_1_to_25.png"
    }
};

$(document).ready(function () {
    var OpenStreetMap_DE = L.tileLayer('http://{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });
    var OpenStreetMap_BlackAndWhite = L.tileLayer('http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });

    var bingSatellite = new L.BingLayer("Ar6LXWO1eL_1WqmnLuiYTRqBRuaeI-DSza-3xlTR_p54D2LXD0CvRzFVjfQPAvkz");
    var googleLayer = new L.Google();

    var baseMaps = {
        "Bing Satellite": bingSatellite,
        "Google Maps": googleLayer,
        "OSM DE": OpenStreetMap_DE,
        "Black And White": OpenStreetMap_BlackAndWhite
    };
    
    var markerTypeList = Object.keys(config["marker-icons"]);
    
    var southWest = L.latLng(26.487043,79.739439),
    northEast = L.latLng(30.688485,88.847341),
    bounds = L.latLngBounds(southWest, northEast);

    var map = L.map('map', {
        //center: [28.430, 83.848],
        minZoom: 7,
        maxZoom: 19,
        maxBounds:bounds,
        layers: [googleLayer]
    });
    
    map.fitBounds(bounds);
    
    var layerControl = L.control.layers({},{},{
        collapsed:false
    });
    
    layerControl.addTo(map);
    //layerControl.addBaseLayer(bingSatellite, "Bing Satellite");
    layerControl.addBaseLayer(googleLayer, "Google Maps");
    layerControl.addBaseLayer(OpenStreetMap_BlackAndWhite, "OSM Black And White");
    layerControl.addBaseLayer(OpenStreetMap_DE, "OSM DE");

    L.control.scale().addTo(map);
    
    /*zooming*/
    function fullExtent() {
        map.fitBounds(bounds);
    }
    
    $("div.leaflet-control-zoom").append("<a class='new-control-zoom-to-extent' href=# title='Zoom to extent'><div id = 'zoom'><img src = 'img/MapFullExtent.png'></div></a>");
    $("a.new-control-zoom-to-extent").click(function(){
        fullExtent();
        document.activeElement.blur();
    });
    /*zooming*/
    
    var districtStyle = {
        fillColor: '#ffffff',
        weight: 2,
        opacity: 1,
        color: '#ccaaff',
        dashArray: '3',
        fillOpacity: 0,
        clickable:false
    };
    
    var nepalBorderStyle = {
        fillColor: '#ffffff',
        weight: 8,
        opacity: 1,
        color: 'black',
        fillOpacity: 0,
        clickable:false
    };
    
    $.getJSON("data/nepal.geojson",function(data){
        L.geoJson(data,{
            style:nepalBorderStyle
        }).addTo(map);
    });
    
    $.getJSON("data/district.geojson",function(data){
        L.geoJson(data,{
            style:districtStyle
        }).addTo(map);
    });

    function TableContent(jsonData, invert) {
        var content = $('<div></div>').addClass('table-content');
        for (var key in jsonData) {
            if (!(key === "sn" || key === "start_lat" || key === "start_lng" || key === "end_lat" || key === "start_lng")){
            var tableRow = $('<div></div>').addClass('table-row').append(function () {
                
                    return jsonData[key] ? $("<div></div>").text(key+"  :").append($("<div></div>").text((jsonData[key]+"").replace(/,/g,", "))) : $("<div></div>").text(key+"  :").append($("<div class='not-available'></div>").text("Not Available"));
            });
            invert ? tableRow.prependTo(content).addClass(key) : tableRow.appendTo(content).addClass(key);
        }
        }
        return $(content)[0];
    }

    function markerChooser(name) {
        return config["marker-icons"][name];
    }

    var layerGroupSearch = L.layerGroup();

    var pointBuild = function (name) {
        return L.geoJson(null, {
            pointToLayer: function (feature, latlng) {
                marker = L.marker(latlng, {
                    icon: L.icon({
                        iconUrl: markerChooser(name),
                        iconSize: [30, 30],
                        iconAnchor: [15, 15]
                    }),
                    riseOnHover: true,
                    title: feature.properties.Project
                });
                return marker;
            },
            onEachFeature: function (feature, layer) {
                var popup = L.popup();
                layerGroupSearch.addLayer(layer);
                //layer.feature.properties["tags"] = feature["Project"]+feature["River"]+feature["Promoter"]+feature["VDC/District"];
                layer.on('click', function (e) {
                    popup.setLatLng(e.latlng);
                    popup.setContent(new TableContent(feature.properties));
                    popup.openOn(map);
                });
            }
        });
    };

    function hydropowerStartPoint(receivedPoints, name) {
        var deferredPoint = $.Deferred();
        var points_;
        
        $.getJSON(receivedPoints, function (data) {
            setTimeout(function () {
                points_ = new pointBuild(name).addData(data);
                layerControl.addOverlay(points_, name);
                var checkbox = $(layerControl._form).find("input[type='checkbox']");
                
                checkbox = $(checkbox[checkbox.length-1]);
                checkbox.click();
                
                for(var c in markerTypeList){
                    $($(layerControl._form).find("input[type='checkbox']")[c]).after(function(){
                        return $("<span></span>").addClass("legend-icon").css({
                            "background-image": "url('"+config["marker-icons"][markerTypeList[c]]+"')"
                        });
                    });
                }
                
                deferredPoint.resolve();
            }, 0);
        });
    }    

    hydropowerStartPoint("data/Above 100 MW/above_100_start_points.geojson", "Above 100 MW");
    hydropowerStartPoint("data/25 to 100 MW/25_to_100_start_points.geojson", "Between 25 and 100 MW");
    hydropowerStartPoint("data/1 to 25 MW/1_to_25_start_points.geojson", "Between 1 and 25 MW", true);

    var searchControl = new L.Control.Search({
        layer: layerGroupSearch,
        propertyName: "Project",
        zoom: 16,
        circleLocation: false,
        animateCircle: false
    });

    searchControl
            .on('search_locationfound', function (e) 
            {
                $(e.layer._icon).click();
                e.layer.openPopup();
            })
            .on('search_collapsed', function (e) {
                layerGroupSearch.eachLayer(function (layer) {
                layerGroupSearch.resetStyle(layer);
            });
    });

    map.addControl(searchControl);

});
