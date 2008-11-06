Zotero.SEASR = new function() {
    var _tmpfile, translator;

    this.init = init;
    this.runAnalysis = runAnalysis;
    this.collectionContextMenuShowing = collectionContextMenuShowing;
    this.analyzeCollection = analyzeCollection;
    this.result = "";

    function init() {
        // create a temporary file to store the results of the RDF export
        _tmpfile = Components.classes["@mozilla.org/file/directory_service;1"]
                     .getService(Components.interfaces.nsIProperties)
                     .get("TmpD", Components.interfaces.nsIFile);
        _tmpfile.append("zeasr.tmp");

        // create an RDF translator to be used for exporting the selected items
        translator = new Zotero.Translate("export");
        if (!translator.setTranslator("14763d24-8ba0-45df-8f52-b8d1108e7ac9")) {
            LOG("Cannot instantiate the Zotero RDF translator!");
            return;
        }
        translator.setHandler("done", _exportDone);

        // hook the context menu for collections
        var zCollectionContextMenu = document.getElementById('zotero-collectionmenu');
        zCollectionContextMenu.addEventListener('popupshowing', collectionContextMenuShowing, false);
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
        // var helloStr = document.getElementById('zeasr-strings').getString('say.Hello');

        //for (var i in items) {
        //    var item = items[i];
        //
        //    LOG("item: " + item.getDisplayTitle(true));
        //}

        _tmpfile.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0666);

        translator.setLocation(_tmpfile);
        translator.setItems(items);
        translator.translate();
    }

    function collectionContextMenuShowing(event) {
        LOG("analyzeCollection: context menu showing");
        var collection = ZoteroPane.getSelectedCollection(false);
        LOG("collection is " + collection);
        var label = "Analyze ";
        if (!collection) {
            label += "library";
        } else {
            label += collection.getName();
        }
        var mnuAnalyze = document.getElementById('seasr-collection-analyze');
        mnuAnalyze.setAttribute('label', label);
    }

    function analyzeCollection(collection) {
        if (!collection || !collection.isCollection()) {
            LOG("analyzeCollection: selection is not a collection - ignoring");
            return;
        } else {
            LOG("analyzeCollection: Analyzing collection: " + collection.getName());
        }
    }
};

window.addEventListener('load', function(e) { Zotero.SEASR.init(); }, false);
