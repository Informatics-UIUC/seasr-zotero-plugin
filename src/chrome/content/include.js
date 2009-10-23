if (typeof(SEASR) == "undefined") {
    var _jsLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                        .getService(Components.interfaces.mozIJSSubScriptLoader);
    
    // get a reference to the Zotero instance
    _jsLoader.loadSubScript("chrome://zotero/content/include.js");
    
    _jsLoader.loadSubScript("chrome://zeasr/content/utils.js");
    _jsLoader.loadSubScript("chrome://zeasr/content/zeasr.js");
    _jsLoader.loadSubScript("chrome://zeasr/content/preferences/preferences.js");
}