///////////////////////////////////
// Utility functions
///////////////////////////////////

function LOG(msg){
    Components.classes["@mozilla.org/consoleservice;1"]
            .getService(Components.interfaces.nsIConsoleService)
            .logStringMessage(msg);
}

if (typeof(_JSON) == "undefined") {
    try {
        var nativeJSON = Components.classes["@mozilla.org/dom/json;1"].createInstance(Components.interfaces.nsIJSON);
        if (!nativeJSON)
            throw new Error("No native JSON support");
        
        var _JSON = {};
        _JSON.serialize = nativeJSON.encode;
        _JSON.unserialize = nativeJSON.decode;
    } catch (e) {
        if (typeof(Zotero) != "undefined") {
            var _JSON = Zotero.JSON;
        }
    }
}

if (typeof(String.trim) == "undefined") {
    String.prototype.trim = function () {
        return this.replace(/^\s*/, "").replace(/\s*$/, "");
    }
}

if (typeof(String.toBoolean) == "undefined") {
    String.prototype.toBoolean = function() {
        return (/^true$/i).test(this);
    };
}

if (typeof(String.endsWith) == "undefined") {
    String.prototype.endsWith = function(str) {
        var lastIndex = this.lastIndexOf(str);
        return (lastIndex != -1) && (lastIndex + str.length == this.length);
    }
}
