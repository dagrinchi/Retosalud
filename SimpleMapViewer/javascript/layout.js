dojo.require("esri.map");
dojo.require("esri.widgets");
dojo.require("esri.layout");

dojo.require("dojox.mobile");
dojo.require("dojox.mobile.ScrollableView");
dojo.require("dojox.mobile.FixedSplitter");
dojo.require("dojox.mobile.ContentPane");
dojo.require("dojox.mobile.TabBar");
dojo.require("dojox.mobile.ToolBarButton");
dojo.require("dojox.mobile.Button");
dojo.require("dojox.mobile.deviceTheme");
dojo.require("dojox.fx");
dojo.require("dojo.has");
dojo.require("dojo.sniff");
dojo.require("dojo.date.locale");

var map;
var configOptions;
var popup;
var isSmartPhone;
var isTablet;
var isDesktop;
var headerGeom;
var vp;
var viewportHeight;
var viewportWidth;
var MAX_SMARTPHONE_WIDTH = 360;
var legendButtonSelected = false;


function initMap(options) {

  configOptions = options;

  // Smartphone, Tablet, or Desktop
  if (dojo.has('touch') && window.innerWidth <= MAX_SMARTPHONE_WIDTH) {
    isSmartPhone = true;
  } else if (dojo.has('touch') && window.innerWidth > MAX_SMARTPHONE_WIDTH) {
    isTablet = true;
  } else {
    isDesktop = true;
  }

  // Load the stylesheet depending on the type of device
  var ss = document.createElement('link');
  ss.type = 'text/css';
  ss.rel = 'stylesheet';
  if (isSmartPhone || isTablet) {
    isDesktop = false;
    // mobile popup
    popup = new esri.dijit.PopupMobile(null, dojo.create("div"));
    buildMobile();
    if (dojo.sniff('android')) {
      // android (quirk in the android browser)
      if (isTablet) {
        ss.href = 'css/iPad.css';
      } else {
        if (dojo.sniff('chrome')) {
          ss.href = 'css/devices.css';
        } else {
          ss.href = 'css/iPhone.css';
        }
      }
    } else {
      // iOS
      ss.href = 'css/devices.css';
    }
  } else {
    isDesktop = true;
    isSmartPhone = false;
    // desktop popup instead of mobile popoup
    require(['esri/dijit/Popup'], function () {
      popup = new esri.dijit.Popup(null, dojo.create("div"));
    });
    buildDesktopDOM();
    ss.href = "css/desktop.css";
  }
  // add stylesheet to the head of the document
  document.getElementsByTagName("head")[0].appendChild(ss);


  var supportsOrientationChange = "onorientationchange" in window, orientationEvent = supportsOrientationChange ? "orientationchange" : "resize";

  if (!dojo.has("ie")) {
    window.addEventListener(orientationEvent, function () {
      orientationChanged();

      if (isTablet || isSmartPhone) {
        var h = document.body.clientHeight;
        var w = document.body.clientWidth;
        dojo.style('map', 'height', '95%');
        dojo.style('map', 'width', '100%');
      }
    }, false);
  } else {
    // IE
    window.attachEvent(orientationEvent, function () {
      orientationChanged();
    }, false);
  }

  dojo.connect(window, 'load', hideAddressBar);

  createMap();

}

function createMap() {

  // load the specified theme
  var ss = document.createElement('link');
  ss.type = 'text/css';
  ss.rel = 'stylesheet';
  ss.href = 'css/' + configOptions.theme + '.css';
  document.getElementsByTagName("head")[0].appendChild(ss);

  // Create a map using information from an ArcGIS.com item.
  var mapDeferred = esri.arcgis.utils.createMap(configOptions.webmap, 'map', {
    mapOptions  :{
      infoWindow   :popup
    },
    ignorePopups:false,
    bingMapsKey :configOptions.bingmapskey
  });
  mapDeferred.addCallback(function (response) {
    configOptions.title = configOptions.title || response.itemInfo.item.title;
    configOptions.subtitle = configOptions.subtitle || response.itemInfo.item.snippet || "";
    configOptions.owner = response.itemInfo.item.owner;

    document.title = configOptions.title;
    dojo.byId('title').innerHTML = configOptions.title;
    dojo.byId('subtitle').innerHTML = configOptions.subtitle;
    dojo.byId('footerText').innerHTML = configOptions.i18n.viewer.footer.label + ' ' + configOptions.owner;

    if (dojo.byId('legendButton')) {
      dojo.byId('legendButton').innerHTML = configOptions.i18n.viewer.buttons.legend;
      dojo.byId('listItemLegend').innerHTML = configOptions.i18n.viewer.buttons.legend;
    }
    if (dojo.byId('aboutButton')) {
      dojo.byId('aboutButton').innerHTML =configOptions.i18n.viewer.buttons.about;
      dojo.byId('listItemAbout').innerHTML = configOptions.i18n.viewer.buttons.about;
    }

    map = response.map;
    var layers = response.itemInfo.itemData.operationalLayers;
    if (map.loaded) {
      initUI(layers);
    } else {
      dojo.connect(map, 'onLoad', function () {
        initUI(layers);
      });
    }

    if (isTablet && (window.innerHeight < window.innerWidth)) {
      dojo.place('legendDiv', 'legendContainer', 'first');
      dojo.setStyle(legendDiv, 'margin', '1px');
      dojo.setStyle(legendDiv, 'padding', '1px');
      dojo.setStyle(legendDiv, 'font-size', '0.7em');
    }
  });
  mapDeferred.addErrback(function (error) {
    alert(configOptions.i18n.viewer.errors.createMap + " : " + error.message);
  });
}

/**
 * First layer has loaded
 *
 * @param layers
 */
function initUI(layers) {

  if (isDesktop) {
    // set the size of the widget and make the widget adjust the size of its children
    dijit.byId('mainWindow').resize();
  }
  //add theme for popup
  dojo.addClass(map.infoWindow.domNode, configOptions.theme);

  //add the scalebar
  var scalebar = new esri.dijit.Scalebar({
    map :map,
    scalebarUnit: configOptions.i18n.viewer.main.scaleBarUnits
  });

  var layerInfo = buildLayersList(layers);
  // if there are layers, create a legend
  if (layerInfo.length > 0) {
    var legendDijit = new esri.dijit.Legend({
      map       :map,
      layerInfos:layerInfo
    }, 'legendDiv');
    legendDijit.startup();
  } else {
    dojo.byId('legendDiv').innerHTML = configOptions.i18n.viewer.sidePanel.message;
  }

  // If smartphone and tablet, build the UI manually
  if (isSmartPhone || isTablet) {
    require([
      'dojo/dom',
      'dojo/window',
      'dojo/_base/window',
      'dojo/dom-geometry'],
      function (dom, win, doc, geom) {
        headerGeom = geom.position(dojo.byId('rightPanelHeader'));
        vp = win.getBox();
        viewportWidth = vp.w;
        viewportHeight = vp.h;
      });

    // 'About' button
    var aboutTooBarButton = new dojox.mobile.ToolBarButton({
      id     :'aboutToolbarButton',
      label  :configOptions.i18n.viewer.buttons.about,
      toggle :true,
      style  :{
        float:'left'
      },
      onClick:function () {
        aboutButtonSelectionHandler();
      }
    });
    dijit.byId('rightPanelHeader').addChild(aboutTooBarButton);

    // 'Geolocate' button
    var geoLocateTooBarButton = new dojox.mobile.ToolBarButton({
      id     :'geoLocateToolbarButton',
      icon   :'images/geolocateIcon.png',
      style  :{
        float        :'right',
        width        :'44px',
        'padding-top':'2px'
      },
      onClick:function () {
        geoLocate();
      }
    });
    dijit.byId('rightPanelHeader').addChild(geoLocateTooBarButton);

    // 'Legend' button
    var legendTooBarButton = new dojox.mobile.ToolBarButton({
      id     :'legendToolbarButton',
      toggle :true,
      icon   :'images/legendIcon.png',
      style  :{
        float        :'right',
        width        :'44px',
        'padding-top':'2px'
      },
      onClick:function () {
        legendButtonSelectionHandler();
      }
    });
    // for smartphones only, add the legend toolbar button to the right side of the header
    if (isSmartPhone)
      dijit.byId('rightPanelHeader').addChild(legendTooBarButton);

    dojo.setStyle('rightPane', 'height', viewportHeight + 'px');
    dojo.setStyle('map', 'height', (viewportHeight - headerGeom.h) + 'px');

    // bulid the div the will house the legend widget
    if (isSmartPhone) {
      var legendBackground = dojo.create('div', null, dojo.byId('rightPane'));
      dojo.attr(legendBackground, 'id', 'legendBackgroundDiv');
      dojo.setStyle(legendBackground, 'bottom', '2px');
      dojo.setStyle(legendBackground, 'height', '180px');
      dojo.setStyle(legendBackground, 'right', '5px');
      dojo.setStyle(legendBackground, 'left', '5px');
      dojo.setStyle(legendBackground, 'background-color', '#FFF');
      dojo.setStyle(legendBackground, 'position', 'absolute');
      dojo.setStyle(legendBackground, 'z-index', '10');
      dojo.setStyle(legendBackground, 'opacity', '.8');
      dojo.setStyle(legendBackground, 'overflow', 'scroll');
      dojo.setStyle(legendBackground, '-webkit-border-radius', '6px');
      dojo.setStyle(legendBackground, '-moz-border-radius', '6px');
      dojo.setStyle(legendBackground, 'border-radius', '6px');
      dojo.place('legendDiv', 'legendBackgroundDiv', 'first');
      dojo.setStyle('legendDiv', 'margin', '1px');
      dojo.setStyle('legendDiv', 'padding', '1px');
      dojo.setStyle('legendDiv', 'font-size', '0.7em');
      dojo.setStyle(legendBackground, 'display', 'none');
    }
  }
}

function buildLayersList(layers) {
  var layerInfos = [];
  dojo.forEach(layers, function (mapLayer, index) {
    var layerInfo = {};
    if (mapLayer.featureCollection && mapLayer.type !== "CSV") {
      if (mapLayer.featureCollection.showLegend === true) {
        dojo.forEach(mapLayer.featureCollection.layers, function (fcMapLayer) {
          if (fcMapLayer.showLegend !== false) {
            layerInfo = {
              "layer"        :fcMapLayer.layerObject,
              "title"        :mapLayer.title,
              "defaultSymbol":false
            };
            if (mapLayer.featureCollection.layers.length > 1) {
              layerInfo.title += " - " + fcMapLayer.layerDefinition.name;
            }
            layerInfos.push(layerInfo);
          }
        });
      }
    } else if (mapLayer.showLegend !== false && mapLayer.layerObject) {
      var showDefaultSymbol = false;
      if (mapLayer.layerObject.version < 10.1 && (mapLayer.layerObject instanceof esri.layers.ArcGISDynamicMapServiceLayer || mapLayer.layerObject instanceof esri.layers.ArcGISTiledMapServiceLayer)) {
        showDefaultSymbol = true;
      }
      layerInfo = {
        "layer"        :mapLayer.layerObject,
        "title"        :mapLayer.title,
        "defaultSymbol":showDefaultSymbol
      };
      //does it have layers too? If so check to see if showLegend is false
      if (mapLayer.layers) {
        var hideLayers = dojo.map(dojo.filter(mapLayer.layers, function (lyr) {
          return (lyr.showLegend === false);
        }), function (lyr) {
          return lyr.id;
        });
        if (hideLayers.length) {
          layerInfo.hideLayers = hideLayers;
        }
      }
      layerInfos.push(layerInfo);
    }
  });
  return layerInfos;
}


function getScrollXY() {
  var x = 0, y = 0;
  if (typeof(window.pageYOffset) === 'number') {
    // Netscape
    x = window.pageXOffset;
    y = window.pageYOffset;
  } else if (document.body && (document.body.scrollLeft || document.body.scrollTop)) {
    // DOM
    x = document.body.scrollLeft;
    y = document.body.scrollTop;
  } else if (document.documentElement && (document.documentElement.scrollLeft || document.documentElement.scrollTop)) {
    // IE6 standards compliant mode
    x = document.documentElement.scrollLeft;
    y = document.documentElement.scrollTop;
  }
  return [x, y];
}

function hideAddressBar() {
  // Set a timeout...
  setTimeout(function () {
    // Hide the address bar!
    window.scrollTo(0, 1);
  }, 0);
}


function orientationChanged() {
  clientHeight = document.documentElement.clientHeight;
  if (map) {
    //dojo.byId('map').style.height = (clientHeight + headerGeom.h) + 'px';
    hideAddressBar();
  }
}

function legendButtonSelectionHandler() {
  var legendNode = dojo.byId('legendBackgroundDiv');
  var fadeArgs = {
    node    :legendNode,
    duration:800
  };
  if (legendButtonSelected) {
    legendButtonSelected = false;
    var fadeOutArgs = {
      node    :legendNode,
      duration:800,
      onEnd   :function () {
        dojo.setStyle(legendNode, 'display', 'none');
      }
    };
    dojo.fadeOut(fadeOutArgs).play();
  } else {
    legendButtonSelected = true;
    dojo.setStyle(legendNode, 'display', 'block');
    dojo.fadeIn(fadeArgs).play();
    dojo.animateProperty({
      node    :legendNode,
      duration:300
    }).play();
  }
}

var isAboutButtonSelected = false;
function aboutButtonSelectionHandler() {
  if (!isAboutButtonSelected) {
    var aboutBackground = dojo.create('div', null, dojo.byId('rightPane'));
    dojo.attr(aboutBackground, 'id', 'aboutBackgroundDiv');
    dojo.setStyle(aboutBackground, 'height', '70%');
    dojo.setStyle(aboutBackground, 'width', '250px');
    dojo.setStyle(aboutBackground, 'margin-top', '5%');
    dojo.setStyle(aboutBackground, 'margin-right', 'auto');
    dojo.setStyle(aboutBackground, 'margin-left', 'auto');
    dojo.setStyle(aboutBackground, 'background-color', '#FFF');
    dojo.setStyle(aboutBackground, 'z-index', '10');
    dojo.setStyle(aboutBackground, 'opacity', '.90');
    dojo.setStyle(aboutBackground, 'overflow', 'scroll');
    dojo.setStyle(aboutBackground, '-webkit-border-radius', '6px');
    dojo.setStyle(aboutBackground, '-moz-border-radius', '6px');
    dojo.setStyle(aboutBackground, 'border-radius', '6px');
    dojo.setStyle(aboutBackground, '-moz-box-shadow', '10px 10px 5px #888');
    dojo.setStyle(aboutBackground, '-webkit-box-shadow', '10px 10px 5px #888');
    dojo.setStyle(aboutBackground, 'box-shadow', '10px 10px 5px #888');

    dojo.byId('aboutBackgroundDiv').innerHTML = '<div style="padding: 5px;"><span style="font-size: 0.8em; font-weight: bold">' + configOptions.title + '</span><br /><span style="font-size: 0.75em;">' + configOptions.subtitle + '</span></div>';
    isAboutButtonSelected = true;
  } else {
    dojo.destroy('aboutBackgroundDiv');
    isAboutButtonSelected = false;
  }
}

function fadeInNode(theNode, theDuration) {
  var fadeInArgs = {
    node    :theNode,
    duration:theDuration
  };
  dojo.fadeIn(fadeInArgs).play();
}

function fadeOutNode(theNode, theDuration) {
  var fadeOutArgs = {
    node    :theNode,
    duration:theDuration
  };
  dojo.fadeOut(fadeOutArgs).play();
}