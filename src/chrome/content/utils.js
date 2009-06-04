///////////////////////////////////
// Utility functions
///////////////////////////////////

if (typeof(_JSON) == "undefined") {
    try {
        var nativeJSON = Components.classes["@mozilla.org/dom/json;1"].createInstance(Components.interfaces.nsIJSON);
        if (!nativeJSON)
            throw new Error("No native JSON support");
        
        var _JSON = {};
        _JSON.serialize = nativeJSON.encode;
        _JSON.unserialize = nativeJSON.decode;
        LOG("Using native JSON support");
    } catch (e) {
        if (typeof(Zotero) != "undefined") {
            var _JSON = Zotero.JSON;
            LOG("Using Zotero JSON support");
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