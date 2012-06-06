///////////////////////////////////
// Utility functions
///////////////////////////////////

function LOG(msg){
    Components.classes["@mozilla.org/consoleservice;1"]
            .getService(Components.interfaces.nsIConsoleService)
            .logStringMessage(msg);
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
