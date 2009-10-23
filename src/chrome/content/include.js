if (typeof(SEASR) == "undefined") {
    var seasr_jsLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                        .getService(Components.interfaces.mozIJSSubScriptLoader);
    
    // get a reference to the Zotero instance
    seasr_jsLoader.loadSubScript("chrome://zotero/content/include.js");
    
    seasr_jsLoader.loadSubScript("chrome://zeasr/content/utils.js");
    seasr_jsLoader.loadSubScript("chrome://zeasr/content/zeasr.js");
    seasr_jsLoader.loadSubScript("chrome://zeasr/content/preferences/preferences.js");
}