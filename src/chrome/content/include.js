// Define a logging mechanism for debugging
function LOG(msg)
{
    Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService)
        .logStringMessage(msg);
}

if (typeof(Zotero) == "undefined") {
    const loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                        .getService(Components.interfaces.mozIJSSubScriptLoader);
    loader.loadSubScript("chrome://zotero/content/include.js");
}

if (typeof(JSON) == "undefined") {
    try {
        var nativeJSON = Components.classes["@mozilla.org/dom/json;1"].createInstance(Components.interfaces.nsIJSON);
        if (!nativeJSON)
            throw new Error("No native JSON support");
        
        var JSON = {};
        JSON.serialize = nativeJSON.encode;
        JSON.unserialize = nativeJSON.decode;
        LOG("Using native JSON support");
    } catch (e) {
        var JSON = Zotero.JSON;
        LOG("Using Zotero JSON support");
    }
}

// Only create the main object once
if (!Zotero.SEASR) {
    loader.loadSubScript("chrome://zeasr/content/zeasr.js");
    loader.loadSubScript("chrome://zeasr/content/preferences/preferences.js");
    loader.loadSubScript("chrome://zeasr/content/ajax.js");
    
    Zotero.SEASR.PrefManager.init();
    
    LOG("SEASR Analytics for Zotero loaded");
}
