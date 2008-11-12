// Only create the main object once
if (!Zotero.SEASR) {
    function LOG(msg) {
        var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                                       .getService(Components.interfaces.nsIConsoleService);
        consoleService.logStringMessage(msg);
    };
    
    Components.utils.import("resource://gre/modules/JSON.jsm");

    const loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                             .getService(Components.interfaces.mozIJSSubScriptLoader);
    loader.loadSubScript("chrome://zeasr/content/zeasr.js");
    loader.loadSubScript("chrome://zeasr/content/ajax.js");
}
