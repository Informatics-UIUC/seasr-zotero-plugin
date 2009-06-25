const jsLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                    .getService(Components.interfaces.mozIJSSubScriptLoader);

// get a reference to the Zotero instance
jsLoader.loadSubScript("chrome://zotero/content/include.js");

jsLoader.loadSubScript("chrome://zeasr/content/utils.js");
jsLoader.loadSubScript("chrome://zeasr/content/zeasr.js");
jsLoader.loadSubScript("chrome://zeasr/content/preferences/preferences.js");

