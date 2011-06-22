var SEASR = new function() {
    var _tmpfile, translator, flow;

    this.init = init;
    this.retrieveConfiguration = retrieveConfiguration;
    this.submitItems = submitItems;
    this.submitCollection = submitCollection;
    
    // localized strings
    var Strings;

    //////////////////
    // Initialization
    //////////////////
    function init() {        
        Strings = document.getElementById('zeasr-strings');
 
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
    
        // update the UI with data extracted from the provider configuration
        retrieveConfiguration(SEASR.Preferences.getProviders());
        
        this.initialized = true;
    }
    
    //////////////////////////////////////////////////////////////////////////////////
    // Load the configuration data from the configured providers
    // and populate the item and collection context menu entries with the flows found
    //////////////////////////////////////////////////////////////////////////////////
    function retrieveConfiguration(providers) {
        if (!providers) throw new Error("updateConfiguration: Need to specify the providers to use");

        // remove all entries in the seasr analytics item context menu
        var itemAnalyticsDOM = document.getElementById('seasr-item-analytics');
        // TODO: need to remove event listeners from nodes to prevent memory leak
        //for (var i in itemAnalyticsDOM.children)
        removeChildrenFromNode(itemAnalyticsDOM.firstChild);
        
        // remove all entries in the seasr analytics collection context menu
        var collectionAnalyticsDOM = document.getElementById('seasr-collection-analytics');
        removeChildrenFromNode(collectionAnalyticsDOM.firstChild);
    
        // the IO service
        var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                            .getService(Components.interfaces.nsIIOService);

        var parser = Components.classes["@mozilla.org/xmlextras/domparser;1"]
                            .createInstance(Components.interfaces.nsIDOMParser);
                                 
        for each(provider in providers) {
            try {
                var uri = ioService.newURI(provider.url, null, null);
                var channel = ioService.newChannelFromURI(uri);
                channel.loadFlags |= Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
                var inputStream = channel.open();
                
                var scriptableInputStream = Components.classes["@mozilla.org/scriptableinputstream;1"]
                        .createInstance(Components.interfaces.nsIScriptableInputStream);
                scriptableInputStream.init(inputStream);
                
                var data = "";
        
                var str = scriptableInputStream.read(4096);
                while (str.length > 0) {
                  data += str;
                  str = scriptableInputStream.read(4096);
                }
              
                var flows = new Array();
                
                if (provider.url.toLowerCase().endsWith(".xml")) {
                    // Load in XML format
                    var doc = parser.parseFromString(data, "text/xml");
                    var iterator = doc.evaluate('//flow', doc, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
    
                    try {
                        var flowNode = iterator.iterateNext();
                      
                        while (flowNode) {
                            flows.push({ name: flowNode.getAttribute('name'), url: flowNode.getAttribute('url') });
                            flowNode = iterator.iterateNext();
                        }	
                    }
                    catch (xmlError) {
                        LOG("Unable to parse configuration data from "+ provider.name + " (" + provider.url + ")");
                        LOG("Reason: " + xmlError.message);
                        alert("Error parsing configuration data from " + provider.name + " (" + provider.url + ") - skipping it...")
                        continue;
                    }
                } else {
                    // Load in JSON format
                    try {
                        var configData = _JSON.unserialize(data);
                    } catch (jsonError) {
                        LOG("Unable to parse configuration data from "+ provider.name + " (" + provider.url + ")");
                        LOG("Reason: " + jsonError.message);
                        alert("Syntax error parsing configuration data from " + provider.name + " (" + provider.url + ") - skipping it...")
                        continue;
                    }
                    
                    flows = configData["seasr_flows"];
                }
                                
                addFlows(provider.name, flows, provider.enabled);
            } catch (e) {
                LOG("Unable to retrieve configuration data from " + provider.name + " (" + provider.url + ")");
                LOG("Reason: " + e.message);
                alert("Error retrieving configuration data from " + provider.name + " (" + provider.url + ")!\nReason: " + e.message);
            }
        }
    }
        
    function addFlows(providerName, flows, enabled) {
        providerName = providerName.trim();
        providerId = providerName.toLowerCase();
       
        var itemAnalyticsDOM = document.getElementById('seasr-item-analytics');
        var collectionAnalyticsDOM = document.getElementById('seasr-collection-analytics');

        var itemProviderDOM = document.getElementById('seasr-item-provider-' + providerId);
        var collectionProviderDOM = document.getElementById('seasr-collection-provider-' + providerId);
        
        if (!itemProviderDOM) {
            itemProviderDOM = createNode('menu', providerName);
            itemProviderDOM.setAttribute('id', 'seasr-item-provider-' + providerId);
            itemProviderDOM.appendChild(createNode('menupopup'));
            
            itemAnalyticsDOM.firstChild.appendChild(itemProviderDOM);
        }
        
        if (!collectionProviderDOM) {
            collectionProviderDOM = createNode('menu', providerName);
            collectionProviderDOM.setAttribute('id', 'seasr-collection-provider-' + providerId);
            collectionProviderDOM.appendChild(createNode('menupopup'));
            
            collectionAnalyticsDOM.firstChild.appendChild(collectionProviderDOM);
        }

        itemProviderDOM.hidden = !enabled;
        collectionProviderDOM.hidden = !enabled;
       
        if (!flows || flows.length == 0) {
            LOG("No flows found. Provider: " + providerName + " - network connection absent?");
            itemProviderDOM.setAttribute("disabled", true);
            collectionProviderDOM.setAttribute("disabled", true);
            return;
        }
  
        // for each explicit flow defined in the configuration file
        for each (var flow in flows) {
            // create a menuitem entry
            var flowDOM = createNode("menuitem", flow.name);
            flowDOM.flowURL = flow.url;
            flowDOM.flowName = flow.name;
            flowDOM.setAttribute('disabled', !enabled);
            //flowDOM.setAttribute('oncommand', 'alert("flow clicked");');
            flowDOM.addEventListener('click', itemFlowClicked, false);
            
            // ... and add it to the item context menu
            itemProviderDOM.firstChild.appendChild(flowDOM);
            
            // ... then clone it and add it to the collection context menu as well
            var collectionFlowDOM = flowDOM.cloneNode(true);
            collectionFlowDOM.flowURL = flow.url;
            collectionFlowDOM.flowName = flow.name;
            collectionFlowDOM.addEventListener('click', collectionFlowClicked, false);
            collectionProviderDOM.firstChild.appendChild(collectionFlowDOM);
        }
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

    //////////////////////////////////////////////////////////////////////////////
    // Called when the translator has completed the export of the metadata to RDF
    //////////////////////////////////////////////////////////////////////////////
    function _exportDone(obj, worked) {
        if (!worked) {
            throw new Error("An error was encountered while retrieving the metadata from the translation service!");
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
        channel.loadFlags |= Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
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
        }
        
        function onStopRequest(aRequest, aContext, aStatus) {   
            this.callback(Components.isSuccessCode(aStatus) ? this.data : null);
        }
        
        function onDataAvailable(aRequest, aContext, aStream, aSourceOffset, aLength) {
            var scriptableInputStream =
                Components.classes["@mozilla.org/scriptableinputstream;1"]
                .createInstance(Components.interfaces.nsIScriptableInputStream);
                
            scriptableInputStream.init(aStream);
            this.data += scriptableInputStream.read(aLength); 
        }
    }
    
    function processExecutionResult(response) {
        if (response == null) {
            alert("There was a problem retrieving the results from the server");
            return;
        }
        
        // Construct the result html
        var htmlResult = response;
 
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

        var resTitle;
        
        if (translator.itemIds != null) {
            if (translator.itemIds.length == 1)
                resTitle = Zotero.Items.get(translator.itemIds[0]).getField('title');
            else
                resTitle = getCollectionName(translator.selectedCollection) + " (" + translator.itemIds.length + ")";
        } else {
            resTitle = getCollectionName(Zotero.Collections.get(translator.collectionId));
        }
        
        // Create the result item
        var data = {
            title: resTitle,
            creators: [
                ['SEASR Analytics', flow.flowName, 'author']
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
            if ('addRelatedItem' in resultItem) {
                resultItem.addRelatedItem(itemId);
                Zotero.Items.get(itemId).addRelatedItem(resultItem.id);
            }
            else 
                resultItem.addSeeAlso(itemId);  // for backward compatibility with Zotero 1.0.*
        
        // Add the result item to the results collection
        getCollectionResults().addItem(resultItem.id);
        
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
    
    function getCollectionName(collection) {
        return (!collection) ? "My Library" : collection.getName();
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
        translator.selectedCollection = ZoteroPane.getSelectedCollection(false);
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
        var resultsCollectionName = Strings.getString("seasr.analytics.results.collection");
        
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