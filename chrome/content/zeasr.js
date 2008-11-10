Zotero.SEASR = new function() {
    var _tmpfile, translator;

    this.init = init;
    this.refreshFlows = refreshFlows;

    // localized strings
    var Strings;
    
    function init() {
        Strings = document.getElementById('zeasr-strings');

        // hook the "popupshowing" event for the item context menu
        document.getElementById('zotero-itemmenu')
                .addEventListener('popupshowing',
                    function(e) {
                        var itemAnalyticsDOM = document.getElementById('seasr-item-analytics');
                        var itemSelectionCount = ZoteroPane.itemsView.selection.count;
                        if (itemSelectionCount == 0) {
                            itemAnalyticsDOM.setAttribute('hidden', true);
                            return;
                        }
                            
                        var multiple = itemSelectionCount > 1 ? ".multiple" : "";
                        var label = Strings.getString("item.analytics.submit" + multiple);
                        
                        itemAnalyticsDOM.setAttribute('hidden', false);
                        itemAnalyticsDOM.setAttribute('label', label);
                    }, false);
        
        // hook the "popupshowing" event for the collection context menu
        document.getElementById('zotero-collectionmenu')
                .addEventListener('popupshowing',
                    function(e) {
                        var label;
                        
                        var collectionAnalyticsDOM = document.getElementById('seasr-collection-analytics');
                        var selectedCollection = ZoteroPane.getSelectedCollection(false);

                        if (!selectedCollection)
                            label = Strings.getString("collection.analytics.submit.all");
                        else {
                            if (selectedCollection.isCollection())
                                label = Strings.getFormattedString("collection.analytics.submit", [selectedCollection.getName()]);
                            else {
                                collectionAnalyticsDOM.setAttribute('hidden', true);
                                return;
                            }
                        }
                        
                        collectionAnalyticsDOM.setAttribute('hidden', false);
                        collectionAnalyticsDOM.setAttribute('label', label);
                    }, false);
        
        // create a temporary file to store the results of the RDF export
        _tmpfile = Components.classes["@mozilla.org/file/directory_service;1"]
                     .getService(Components.interfaces.nsIProperties)
                     .get("TmpD", Components.interfaces.nsIFile);
        _tmpfile.append("zeasr.tmp");

        // create an RDF translator to be used for exporting the selected items
        translator = new Zotero.Translate("export");
        translator.setHandler("done", _exportDone);
        if (!translator.setTranslator("14763d24-8ba0-45df-8f52-b8d1108e7ac9"))
            throw ("Cannot instantiate the Zotero RDF translator!");
    }

    function onItemAnalyticsContextMenuShowing() {
        LOG("itemAnalyticsContextMenuShowing");
    }
    
    function onCollectionAnalyticsontextMenuShowing() {
        LOG("collectionAnalyticsContextMenuShowing");
    }

    function _exportDone(obj, worked) {
        if (!worked) {
            LOG("translate() did not work");
            return;
        }

        // the IO service
        var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                          .getService(Components.interfaces.nsIIOService);

        // create an nsIURI
        var uri = ioService.newURI("http://localhost:8081/test/hello", null, null);

        // get a channel for that nsIURI
        var channel = ioService.newChannelFromURI(uri);

        var inputStream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                .createInstance(Components.interfaces.nsIFileInputStream);
        inputStream.init(_tmpfile, -1, -1, Components.interfaces.nsIFileInputStream.DELETE_ON_CLOSE |
                         Components.interfaces.nsIFileInputStream.CLOSE_ON_EOF);

        var uploadChannel = channel.QueryInterface(Components.interfaces.nsIUploadChannel);
        uploadChannel.setUploadStream(inputStream, "application/x-www-form-urlencoded", -1);

        var httpChannel = channel.QueryInterface(Components.interfaces.nsIHttpChannel);
        // order important - setUploadStream resets to PUT
        httpChannel.requestMethod = "POST";

        var StreamListener = {
            // nsIStreamListener
            onStartRequest: function(aRequest, aContext) {
                LOG("onStartRequest");
            },

            onStopRequest: function(aRequest, aContext, aStatus) {
                LOG("onStopRequest")
                
                if (Components.isSuccessCode(aStatus)) {
                    LOG("Request succeeded");
                } else {
                    LOG("Request failed");
                }
            },

            onDataAvailable: function(aRequest, aContext, aStream, aSourceOffset, aLength) {
                LOG("onDataAvailable: srcOffset=" + aSourceOffset + " length=" + aLength);
            }
        };

        httpChannel.asyncOpen(StreamListener, null);
    }

    function runAnalysis(items) {
        _tmpfile.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0666);

        translator.setLocation(_tmpfile);
        translator.setItems(items);
        translator.translate();
    }

    function analyzeCollection(collection) {
        if (!collection || !collection.isCollection()) {
            LOG("analyzeCollection: selection is not a collection - ignoring");
            return;
        } else {
            LOG("analyzeCollection: Analyzing collection: " + collection.getName());
        }
    }
    
    function refreshFlows() {
        LOG("Refreshing flows from " + Zotero.SEASR.Prefs.get("flowURL"));
    }
};


Zotero.SEASR.Prefs = new function() {
    this.init = init;
    this.get = get;
    this.set = set;
    
    this.register = register;
    this.unregister = unregister;
    this.observe = observe;
    
    this.prefBranch;
    
    ///////////////////////////////////////
    // Initializes the preference observer
    ///////////////////////////////////////
    function init() {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                              .getService(Components.interfaces.nsIPrefService);
        this.prefBranch = prefs.getBranch("extensions.zeasr.");
        
        // Observe preference changes
        this.register();
    }
    
    /////////////////////////
    // Retrieve a preference
    /////////////////////////
    function get(pref, global) {
        try {
            if (global) {
                var service = Components.classes["@mozilla.org/preferences-service;1"]
                                        .getService(Components.interfaces.nsIPrefService);
            }
            else {
                var service = this.prefBranch;
            }
            
            switch (this.prefBranch.getPrefType(pref)){
                case this.prefBranch.PREF_BOOL:
                    return this.prefBranch.getBoolPref(pref);
                case this.prefBranch.PREF_STRING:
                    return this.prefBranch.getCharPref(pref);
                case this.prefBranch.PREF_INT:
                    return this.prefBranch.getIntPref(pref);
                default:
                    throw ("Unsupported preference type '" +
                           this.prefBranch.getPrefType(pref) + "'");
            }
        }
        catch(e) {
            throw ("Invalid preference '" + pref + "'");
        }
    }
    
    ////////////////////
    // Set a preference
    ////////////////////
    function set(pref, value){
        try {
            switch (this.prefBranch.getPrefType(pref)){
                case this.prefBranch.PREF_BOOL:
                    return this.prefBranch.setBoolPref(pref, value);
                case this.prefBranch.PREF_STRING:
                    return this.prefBranch.setCharPref(pref, value);
                case this.prefBranch.PREF_INT:
                    return this.prefBranch.setIntPref(pref, value);
                default:
                    throw ("Unsupported preference type '" +
                           this.prefBranch.getPrefType(pref) + "'");
            }
        }
        catch(e) {
            throw ("Invalid preference '" + pref + "'");
        }
    }
    
    ///////////////////////////////////////////////
    // Registers a preference change event observer
    ///////////////////////////////////////////////
    function register() {
        this.prefBranch.QueryInterface(Components.interfaces.nsIPrefBranch2);
        this.prefBranch.addObserver("", this, false);
    }
    
    ///////////////////////////////////////
    // Unregisters the preference observer
    ///////////////////////////////////////
    function unregister() {
        if (!this.prefBranch) return;
        
        this.prefBranch.removeObserver("", this);
    }
    
    //////////////////////////////
    // Handles preference changes
    //////////////////////////////
    function observe(subject, topic, data) {
        if (topic != "nsPref:changed") return;
        
        // subject is the nsIPrefBranch we're observing (after appropriate QI)
        // data is the name of the pref that's been changed (relative to subject)
        switch(data) {
            /*
            case "flowURL":
                LOG("flowURL preferenced has been changed");
                break;
            */
        }
    }
}

window.addEventListener('load', function(e) { Zotero.SEASR.init(); Zotero.SEASR.Prefs.init(); }, false);
