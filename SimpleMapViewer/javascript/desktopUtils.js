// JavaScript Document
function buildMobile() {
  new dojox.mobile.View({
    id      :'container',
    selected:true
  }).placeAt(dojo.body(), 'first');

  // splitter
  var fixedSplitter = new dojox.mobile.FixedSplitter({
    id         :'splitter',
    orientation:'H'
  }, dojo.byId('container'));
  fixedSplitter.startup();

  var leftPanel = new dojox.mobile.ContentPane({
    id  :'leftPane',
    href:"data/FixedSplitterfragment1.html"
  });
  fixedSplitter.addChild(leftPanel);

  var rightPanel = new dojox.mobile.ContentPane({
    id  :'rightPane',
    href:"data/FixedSplitterfragment2.html"
  });
  fixedSplitter.addChild(rightPanel);

  //dojo.connect(dojo.byId('legendButton'), 'onclick', displayLegend);
}

/**
 * Build the DOM programmatically
 */
function buildDesktopDOM() {
  // load the desktop CSS
  new dijit.layout.BorderContainer({
    id     :'mainWindow',
    design :'headline',
    gutters:'false',
    style  :{
      height:'100%',
      width :'100%'
    }
  }).placeAt(dojo.body(), 'first');

  // left content pane will hold the legend
  addCutsomContentPane('leftPane', 'left', '<div id="leftPaneContent" dojotype="dijit.layout.BorderContainer" design="headline" gutters="false" style="width:100%; height:100%;">' +
    '<div id="leftPaneHeader" dojotype="dijit.layout.ContentPane" region="top">' +
    '<span id="legendHeader"></span>' +
    '</div>' +
    '<div id="leftPaneBody" dojotype="dijit.layout.StackContainer" region="center">' +
    '<div id="panel1" class="panel_content" dojotype="dijit.layout.ContentPane">' +
    '<div id="legendDiv">' +
    '</div></div></div></div>', 'mainWindow', 'first');
  // header content pane
  addCutsomContentPane('header', 'top', '<div id="title"></div><div id="subtitle"></div><div id="header_flourish"></div>', 'mainWindow', 'first');
  // map
  addCutsomContentPane('map', 'center', '', 'mainWindow', 'first');
  // footer content pane
  addCutsomContentPane('footer', 'bottom', '<span id="footerText"></span><span id="owner"></span>', 'mainWindow', 'last');
}

function addCutsomContentPane(domId, domRegion, domContent, domPlacement, domLoc) {
  new dijit.layout.ContentPane({
    id     :domId,
    region :domRegion,
    content:domContent
  }).placeAt(domPlacement, domLoc);
}