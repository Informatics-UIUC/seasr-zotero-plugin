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
                LOG("The SEASR providers preference has changed");
                Zotero.SEASR.PrefPane.updateProviderList();
                Zotero.SEASR.retrieveConfiguration(Zotero.SEASR.Preferences.getProviders());
                break;
        }
    }
}


Zotero.SEASR.Preferences = new function() {
    this.addProvider = addProvider;
    this.deleteProvider = deleteProvider;
    this.changeProvider = changeProvider;
    this.getProviders = getProviders;
    
    
    function getProviders() {
        return _JSON.unserialize(Zotero.SEASR.PrefManager.get("configProviders"));
    }
    
    function setProviders(providers) {
        Zotero.SEASR.PrefManager.set("configProviders", _JSON.serialize(providers));
    }
    
    function addProvider(provider) {
        var configProviders = getProviders();
        
        // trim out spaces
        provider.name = provider.name.trim();
        provider.url = provider.url.trim();
        
        // check for duplicate
        for each(item in configProviders) {
            if (item.name.trim().toLowerCase() == provider.name.toLowerCase() &&
                item.url.trim() == provider.url)
                    throw new Error("Duplicate provider");
        }

        configProviders.push(provider);
            
        setProviders(configProviders);
    }
    
    function deleteProvider(index) {
        var configProviders = getProviders();
        configProviders.splice(index, 1);
        setProviders(configProviders);
    }
    
    /*function deleteProvider(providerName, providerURL)
    {
        var configProviders = getProviders();
        var n = configProviders.length;
        
        for (var i = 0; i < configProviders.length; i++) {
            if (configProviders[i].name.trim().toLowerCase() == providerName.trim().toLowerCase() &&
                configProviders[i].url.trim() == providerURL.trim()) {
                configProviders.splice(i, 1);
                break;
            }
        }
        
        if (configProviders.length == n)
            // nothing was removed
            return;
        
        setProviders(configProviders);
    }*/
    
    function changeProvider(index, newProvider) {
        var configProviders = getProviders();
        
        // trim out spaces
        newProvider.name = newProvider.name.trim();
        newProvider.url = newProvider.url.trim();
                
        configProviders.splice(index, 1);
        
        // check for duplicate
        for each(item in configProviders) {
            if (item.name.trim().toLowerCase() == newProvider.name.toLowerCase() &&
                item.url.trim() == newProvider.url)
                    throw new Error("Duplicate provider");
        }
        
        configProviders.splice(index, 0, newProvider);
                
        setProviders(configProviders);
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
        if (!prefpane) return;
        
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
        if (!prefpane) return;
        
        var tree = prefpane.getElementById('configProviders');
        if (tree.currentIndex < 0) return;
    
        //var treeitem = tree.lastChild.childNodes[tree.currentIndex];
        //var providerName = treeitem.firstChild.childNodes[0].getAttribute('label');
        //var providerURL = treeitem.firstChild.childNodes[1].getAttribute('label');
 
        Zotero.SEASR.Preferences.deleteProvider(tree.currentIndex);
    }
    
    function showProviderEditor(idx)
    {
        if (!prefpane) return;
        
        var treechildren = prefpane.getElementById('configProviders-rows');
        
        if (typeof(idx) != "undefined" && idx >= 0 && idx < treechildren.childNodes.length) {
            var treerow = treechildren.childNodes[idx].firstChild;
            var providerName = treerow.childNodes[0].getAttribute('label');
            var providerURL = treerow.childNodes[1].getAttribute('label');
            var providerEnabled = treerow.childNodes[2].getAttribute('value');
        } else {
            var providerName = "";
            var providerURL = "";
            var providerEnabled = "false";
        }
        
        var param = { provider: { name: providerName, url: providerURL, enabled: providerEnabled }, ok: false };
        window.openDialog('chrome://zeasr/content/preferences/providerEditor.xul', "zeasr-providerEditor", "chrome, modal", param);
        
        if (!param.ok) {
            return;
        }
        
        if (typeof(idx) == "undefined")
            try {
                Zotero.SEASR.Preferences.addProvider(param.provider);
            } catch(e) {
                alert("Could not add the specified provider. Reason: " + e.message);
            }
        else {
            if (providerName != param.provider.name || providerURL != param.provider.url || providerEnabled != param.provider.enabled)
                try {
                    Zotero.SEASR.Preferences.changeProvider(idx, param.provider);
                } catch(e) {
                    alert("Could not change the specified provider. Reason: " + e.message);
                }
        }
    }
}