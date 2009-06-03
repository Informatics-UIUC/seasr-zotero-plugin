Zotero.SEASR.PrefManager = new function() {
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
            case "configProviders":
                LOG("The config providers preference has changed");
                Zotero.SEASR.PrefPane.updateProviderList();
                break;
        }
    }
}


Zotero.SEASR.Preferences = new function() {
    this.addProvider = addProvider;
    this.deleteProvider = deleteProvider;
    this.getProviders = getProviders;
    
    
    function getProviders() {
        return getProvidersFromPref("configProviders");
    }
    
    function getProvidersFromPref(pref)
    {
        return JSON.unserialize(Zotero.SEASR.PrefManager.get(pref));
    }
    
    function setProvidersPref(pref, providers)
    {
        Zotero.SEASR.PrefManager.set(pref, JSON.serialize(providers));
    }
    
    function addProvider(provName, provURL, provEnabled) {
        var configProviders = getProvidersFromPref('configProviders');
        configProviders.push({ name: provName, url: provURL, enabled: provEnabled });
        setProvidersPref('configProviders', configProviders);
    }
    
    function deleteProvider(providerURL)
    {
        var configProviders = getProvidersFromPref('configProviders');
        
        for (var i = 0; i < configProviders.length; i++) {
            if (configProviders[i].url == providerURL) {
                configProviders.splice(i, 1);
                break;
            }
        }
        
        setProvidersPref('configProviders', configProviders);
    }
}


Zotero.SEASR.PrefPane = new function() {
    this.init = init;
    this.updateProviderList = updateProviderList;
    this.showProviderEditor = showProviderEditor;
    this.deleteSelectedProvider = deleteSelectedProvider;
    
    
    var prefpane;
    
    function init(doc)
    {
        prefpane = doc;
        updateProviderList();
    }
    
    function updateProviderList()
    {
        var providerTreeRows = prefpane.getElementById('configProviders-rows');
        while (providerTreeRows.hasChildNodes()) {
            providerTreeRows.removeChild(providerTreeRows.firstChild);
        }
    
        var providers = Zotero.SEASR.Preferences.getProviders();
        
        for each(var provider in providers) {
            var treeitem = prefpane.createElement('treeitem');
            var treerow = prefpane.createElement('treerow');
            var cellProviderName = prefpane.createElement('treecell');
            var cellProviderURL = prefpane.createElement('treecell');
            var cellProviderEnabled = prefpane.createElement('treecell');
            
            cellProviderName.setAttribute('label', provider.name);
            cellProviderURL.setAttribute('label', provider.url);
            cellProviderEnabled.setAttribute('value', provider.enabled);
            
            treerow.appendChild(cellProviderName);
            treerow.appendChild(cellProviderURL);
            treerow.appendChild(cellProviderEnabled);
            treeitem.appendChild(treerow);
            
            providerTreeRows.appendChild(treeitem);
        }
    }

    function deleteSelectedProvider() {
        var tree = prefpane.getElementById('configProviders');
        if (tree.currentIndex < 0) return;
    
        var treeitem = tree.lastChild.childNodes[tree.currentIndex];
        var providerURL = treeitem.firstChild.childNodes[1].getAttribute('label');
        
        Zotero.SEASR.Preferences.deleteProvider(providerURL);
    }
    
    function showProviderEditor(index)
    {
        var treechildren = prefpane.getElementById('configProviders-rows');
        
        if (typeof(index) != "undefined" && index >= 0 && index < treechildren.childNodes.length) {
            var treerow = treechildren.childNodes[index].firstChild;
            var providerName = treerow.childNodes[0].getAttribute('label');
            var providerURL = treerow.childNodes[1].getAttribute('label');
            var providerEnabled = treerow.childNodes[2].getAttribute('value');
        } else {
            var providerName = "";
            var providerURL = "";
            var providerEnabled = "false";
        }
        
        var param = { name: providerName, url: providerURL, enabled: providerEnabled };
        window.openDialog('chrome://zeasr/content/preferences/providerEditor.xul', "zeasr-providerEditor", "chrome, modal", param);
    }
    
    function editProvider(index)
    {
        var treechildren = prefpane.getElementById('configProviders-rows');
        
        if (typeof(index) == "undefined" || index < 0 || index >= treechildren.childNodes.length)
            return;
        
        var treerow = treechildren.childNodes[index].firstChild;
        var providerName = treerow.childNodes[0].getAttribute('label');
        var providerURL = treerow.childNodes[1].getAttribute('label');
        var providerEnabled = treerow.childNodes[2].getAttribute('value');
        
        LOG(providerName + "," + providerURL + "," + providerEnabled);
    }
}