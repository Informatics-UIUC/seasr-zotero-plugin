// Define a logging mechanism for debugging
function LOG(msg)
{
    Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService)
        .logStringMessage(msg);
}

if (typeof(Zotero) == "undefined") {
    Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                        .getService(Components.interfaces.mozIJSSubScriptLoader)
                        .loadSubScript("chrome://zotero/content/include.js");
}

// Only create the main object once
if (typeof(Zotero.SEASR) == "undefined") {
    const loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                        .getService(Components.interfaces.mozIJSSubScriptLoader);
    loader.loadSubScript("chrome://zeasr/content/utils.js");
    loader.loadSubScript("chrome://zeasr/content/zeasr.js");
    loader.loadSubScript("chrome://zeasr/content/preferences/preferences.js");
    
    Zotero.SEASR.PrefManager.init();
    
    LOG("SEASR Analytics for Zotero loaded");
}
