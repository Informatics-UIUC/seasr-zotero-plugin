Zotero.SEASR = new function() {
    var _tmpfile, translator, flow;

    this.init = init;
    this.updateConfiguration = updateConfiguration;
    this.submitItems = submitItems;
    this.submitCollection = submitCollection;

    // localized strings
    var Strings;

    //////////////////
    // Initialization
    //////////////////
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
                        
                        //TODO change true to false to re-enable collection submittal
                        collectionAnalyticsDOM.setAttribute('hidden', true);
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
        
        // retrieve the list of available servers/flows from the config url
        updateConfiguration(Zotero.SEASR.PrefManager.get("configURL"));
    }
    
    //////////////////////////////////////////////////////////////////////////////////
    // Load the configuration data (servers and flows) from the configuration URL
    // and populate the item and collection context menu entries with the flows found
    //////////////////////////////////////////////////////////////////////////////////
    function updateConfiguration(configURL) {
        LOG("Retrieving configuration data from " + configURL);
        
        var AJAX = new ajaxObject(configURL, function (response, status) {
            if (status != 200) {
                LOG("There was an error retrieving the configuration data!");
                return;
            }
            
            // create a JS object from the received response string
            var configData = JSON.unserialize(response);
            
            var servers = configData["meandre_servers"];
            var flows = configData["seasr_flows"];
    
            // remove all entries in the seasr analytics item context menu
            var itemAnalyticsDOM = document.getElementById('seasr-item-analytics');
            // TODO: need to remove event listeners from nodes to prevent memory leak
            //for (var i in itemAnalyticsDOM.children)
            removeChildrenFromNode(itemAnalyticsDOM.firstChild);
            
            // remove all entries in the seasr analytics collection context menu
            var collectionAnalyticsDOM = document.getElementById('seasr-collection-analytics');
            removeChildrenFromNode(collectionAnalyticsDOM.firstChild);
            
            for each(var server in servers) {
                // create an id used to index the DOM nodes associated with this server
                server.id = server.host.toLowerCase() + ":" + server.port;
                
                // perform an asynchronous call to retrieve the list of flows
                retrieveFlowsFromServer(server, "zotero", function (server, response, status) {
                    if (status != 200) {
                        LOG("Error retrieving flows from " + server.host);
                        return;
                    }
                    
                    // create a JS object from the received response string
                    var flowData = JSON.unserialize(response);
                    // if there are no flows found matching the tag, then do not create a menu entry for this server
                    if (flowData.size() == 0) return;
                    
                    // create a menu entry for this server, and set it disabled by default, pending
                    // the retrieval of the available flows from this server
                    serverDOM = createNode("menu", server.name);
                    serverDOM.setAttribute('id', 'item:' + server.id);
                    serverDOM.setAttribute('disabled', true);
                    serverDOM.appendChild(document.createElement('menupopup'));
                
                    // add the menu to the item context menu
                    itemAnalyticsDOM.firstChild.appendChild(serverDOM);
                
                    // clone the menu so we can add it to the collection context menu as well
                    var clone = serverDOM.cloneNode(true);
                    clone.setAttribute('id', 'collection:' + server.id);
                    collectionAnalyticsDOM.firstChild.appendChild(clone);
                
                    // obtain references to the item and collection context menu entries for this server
                    var itemServerDOM = serverDOM; //document.getElementById('item:' + server.id);
                    var collectionServerDOM = clone; //document.getElementById('collection:' + server.id);
                    
                    for each(var flow in flowData) {
                        // create a menu item entry for the flow
                        var flowDOM = createNode("menuitem", flow.meandre_uri_name);
                        flowDOM.flowURL = flow.meandre_uri;
                        flowDOM.flowName = flow.meandre_uri_name;
                        flowDOM.flowDescription = flow.description;
                        flowDOM.addEventListener('click', itemFlowClicked, false);
                        
                        // ... and append it to the item server context menu
                        itemServerDOM.firstChild.appendChild(flowDOM);
                        
                        // ... then clone it and append it to the collection server context menu
                        var collectionFlowDOM = flowDOM.cloneNode(true);
                        collectionFlowDOM.flowURL = flow.meandre_uri;
                        collectionFlowDOM.flowName = flow.meandre_uri_name;
                        collectionFlowDOM.flowDescription = flow.description;
                        collectionFlowDOM.addEventListener('click', collectionFlowClicked, false);
                        collectionServerDOM.firstChild.appendChild(collectionFlowDOM);
                    }
                    
                    // we successfully received the data and can enable access to the server menus
                    itemServerDOM.setAttribute('disabled', false);
                    collectionServerDOM.setAttribute('disabled', false);
                });
            }
            
            // for each explicit flow defined in the configuration file
            for each (var flow in flows) {
                // create a menuitem entry
                var flowDOM = createNode("menuitem", flow.name);
                flowDOM.flowURL = flow.url;
                flowDOM.flowName = flow.name;
                //flowDOM.setAttribute('oncommand', 'alert("flow clicked");');
                flowDOM.addEventListener('click', itemFlowClicked, false);
                
                // ... and add it to the item context menu
                itemAnalyticsDOM.firstChild.appendChild(flowDOM);
                
                // ... then clone it and add it to the collection context menu as well
                var collectionFlowDOM = flowDOM.cloneNode(true);
                collectionFlowDOM.flowURL = flow.url;
                collectionFlowDOM.flowName = flow.name;
                collectionFlowDOM.addEventListener('click', collectionFlowClicked, false);
                collectionAnalyticsDOM.firstChild.appendChild(collectionFlowDOM);
            }
            
            // configuration received successfully -> enable access to the analytics menus
            itemAnalyticsDOM.setAttribute('disabled', false);
            collectionAnalyticsDOM.setAttribute('disabled', false);
        });
        
        // perform the async http request
        AJAX.update("");
    }
    
    function createNode(type, label) {
        const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
        
        // create a new XUL menuitem
        var item = document.createElementNS(XUL_NS, type);
        item.setAttribute("label", label);
        
        return item;
    
    }

    //////////////////////////////////////
    // Removes all children of a DOM node
    //////////////////////////////////////
    function removeChildrenFromNode(node)
    {
        if (!node) return;

        while (node.hasChildNodes())
        {
            node.removeChild(node.firstChild);
        }
    }
    
    /////////////////////////////////////////////////////////////////////////
    // Performs an asynchronous http request to retrieve all flows available
    // on the specified server, matching a predefined tag
    /////////////////////////////////////////////////////////////////////////
    function retrieveFlowsFromServer(server, tag, callback) {
        var listFlowsUrl = "http://" + server.username + ":" + server.password + "@"
           + server.host + ":" + server.port + "/services/repository/flows_by_tag.json";
           //+ server.host + ":" + server.port + "/services/repository/list_flows.json";
            
        LOG("Querying service: " + listFlowsUrl);
        
        var AJAX = new ajaxObject(listFlowsUrl, function (response, status) {
            callback(server, response, status);
        });
        
        AJAX.update("tag=" + tag);
        //AJAX.update("");
    }

    //////////////////////////////////////////////////////////////////////////////
    // Called when the translator has completed the export of the metadata to RDF
    //////////////////////////////////////////////////////////////////////////////
    function _exportDone(obj, worked) {
        if (!worked) {
            throw ("An error was encountered while retrieving the metadata from the translation service!");
            return;
        }
        
        // the IO service
        var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                          .getService(Components.interfaces.nsIIOService);

        // create an nsIURI
        var uri = ioService.newURI(obj.submitURL, null, null);

        var listener = new StreamListener(processExecutionResult);
        
        // get a channel for that nsIURI
        var channel = ioService.newChannelFromURI(uri);
        channel.notificationCallbacks = listener;

        var inputStream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                .createInstance(Components.interfaces.nsIFileInputStream);
        inputStream.init(_tmpfile, -1, -1, Components.interfaces.nsIFileInputStream.DELETE_ON_CLOSE |
                         Components.interfaces.nsIFileInputStream.CLOSE_ON_EOF);
        
        var scriptableInputStream = Components.classes["@mozilla.org/scriptableinputstream;1"]
                .createInstance(Components.interfaces.nsIScriptableInputStream);
        scriptableInputStream.init(inputStream);
        
        var data = "";

        var str = scriptableInputStream.read(4096);
        while (str.length > 0) {
          data += str;
          str = scriptableInputStream.read(4096);
        }
        
        data = "zoterordf=" + escape(data);

        var stringInputStream = Components.classes["@mozilla.org/io/string-input-stream;1"]
                .createInstance(Components.interfaces.nsIStringInputStream);
        stringInputStream.setData(data, data.length);
        
        var uploadChannel = channel.QueryInterface(Components.interfaces.nsIUploadChannel);
        uploadChannel.setUploadStream(stringInputStream, "application/x-www-form-urlencoded", -1);

        var httpChannel = channel.QueryInterface(Components.interfaces.nsIHttpChannel);
        // order important - setUploadStream resets to PUT
        httpChannel.requestMethod = "POST";

        // perform the asynchronous http post request
        httpChannel.asyncOpen(listener, null);
    }
    
    function StreamListener(callback) {
        this.callback = callback;
        this.onStartRequest = onStartRequest;
        this.onStopRequest = onStopRequest;
        this.onDataAvailable = onDataAvailable;
        this.data = "";
        
        function onStartRequest(aRequest, aContext) {
            LOG("Sending request to server");
        }
        
        function onStopRequest(aRequest, aContext, aStatus) {
            if (Components.isSuccessCode(aStatus)) {
                LOG("Request succeded");
                
                this.callback(this.data);
            } else {
                LOG("Request failed");
                this.callback(null);
            }
        }
        
        function onDataAvailable(aRequest, aContext, aStream, aSourceOffset, aLength) {
            LOG("Data received: srcOffset=" + aSourceOffset + " length=" + aLength);

            var scriptableInputStream =
                Components.classes["@mozilla.org/scriptableinputstream;1"]
                .createInstance(Components.interfaces.nsIScriptableInputStream);
                
            scriptableInputStream.init(aStream);
            this.data += scriptableInputStream.read(aLength); 
        }
    }
    
    function processExecutionResult(response) {
        if (response == null) {
            alert("There was a problem retrieving the results from the server")
            return;
        }
        
        // Construct the result html
        var htmlResult = "<html><head><title>" + flow.flowName + "</title></head><body>" + response + "</body></html>";
 
        // Create a temporary directory to store the result
        var tmpDir = Components.classes["@mozilla.org/file/directory_service;1"]
                    .getService(Components.interfaces.nsIProperties)
                    .get("TmpD", Components.interfaces.nsIFile);
        tmpDir.append("SEASR");
        tmpDir.createUnique(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0777);
        
        // Create the results file
        var file = Components.classes["@mozilla.org/file/local;1"]
                    .createInstance(Components.interfaces.nsILocalFile);
        file.initWithPath(tmpDir.path);
        file.append(flow.flowName.replace(/\\|\/|:|\*|\?|"|<|>|\|/g, "_") + ".html");
        file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0666);
        
        //LOG("Creating results temp file: " + file.path);

        var stream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                .createInstance(Components.interfaces.nsIFileOutputStream);
        stream.init(file, 0x02 | 0x08 | 0x20, 0666, 0);  // write, create, truncate
        
        //TODO use this for writing the result as a non-intl string
        stream.write(htmlResult, htmlResult.length);
        stream.close();
        
        //TODO uncomment below to enable writing intl-aware output
        //// assume UTF-8 encoding for now
        //var charset = "UTF-8";
        //
        //// Write the result to the file
        //var os = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
        //        .createInstance(Components.interfaces.nsIConverterOutputStream);
        //os.init(stream, charset, 0, 0x0000);
        //os.writeString(htmlResult);
        //os.close();

        // Create the result item
        var data = {
            title: flow.flowName,
            creators: [
                ['Meandre', 'SEASR Analytics', 'author']
            ],
            url: flow.flowURL
        };
        var resultItem = Zotero.Items.add('webpage', data);
        
        // Attached the saved results as snapshot to the item
        var attachmentId = Zotero.Attachments.importSnapshotFromFile(
                                file, flow.flowURL, flow.flowName,
                                "text/html", "UTF-8", resultItem.id);
        var attachmentItem = Zotero.Items.get(attachmentId);
        attachmentItem.setField('accessDate', "CURRENT_TIMESTAMP");
        attachmentItem.save();
        
        // Remove the temporary directory (it was copied by Zotero in the previous step)
        tmpDir.remove(true);
        
        // Link the source items used in the analysis to the result item
        for each (itemId in translator.itemIds)
            if ('addRelatedItem' in resultItem)
                resultItem.addRelatedItem(itemId);
            else
                resultItem.addSeeAlso(itemId);  // for backward compatibility with Zotero 1.0.*
        
        // Add the result item to the results collection
        getCollectionResults().addItem(resultItem.id);
        
        //,status=no,toolbar=no,location=no,menubar=no
        
        // Display the result in a window
        window.open("zotero://attachment/" + attachmentId + "/", attachmentId,
                    "width=800,height=600,resizable=yes,scrollbars=yes,centerscreen");
        
        //var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
        //            .getService(Components.interfaces.nsIWindowWatcher);
        //var win = ww.openWindow(null, null, flow.flowURL,
        //                        "width=800,height=600,resizable=yes,scrollbars=yes", null);
        //win.document.open();
        //win.document.write(htmlResult);
        //win.document.close();
    }

    function itemFlowClicked() {
        flow = this;
        submitItems(ZoteroPane.getSelectedItems(), flow.flowURL);
    }
    
    function submitItems(items, url) {
        _tmpfile.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0666);
        
        var itemIds = new Array(items.length);
        for (var i = 0; i < items.length; i++)
            itemIds[i] = items[i].id;

        translator.setLocation(_tmpfile);
        translator.setItems(items);
        translator.submitURL = url;
        translator.itemIds = itemIds;
        translator.collectionId = null;
        translator.translate();
    }
    
    function collectionFlowClicked() {
        flow = this;
        submitCollection(ZoteroPane.getSelectedCollection(false), flow.flowURL);
    }
    
    function submitCollection(collection, url) {
        _tmpfile.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0666);
        
        translator.setLocation(_tmpfile);
        translator.setCollection(collection);
        translator.submitURL = url;
        translator.collectionId = collection.id;
        translator.itemIds = null;
        translator.translate();
    }
    
    function getCollectionResults() {
        var seasrAnalyticsResults = null;
        var resultsCollectionName = Strings.getString("results.collection");
        
        var collections = Zotero.getCollections();
        for each (var collection in collections) {
            if (collection.getName() == resultsCollectionName) {
                seasrAnalyticsResults = collection;
                break;
            }
        }
        
        if (seasrAnalyticsResults == null)
            seasrAnalyticsResults = Zotero.Collections.add(resultsCollectionName);
            
        return seasrAnalyticsResults;
    }
};

window.addEventListener('load', function(e) { Zotero.SEASR.init(); }, false);
