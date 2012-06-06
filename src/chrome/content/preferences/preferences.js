SEASR.PrefManager = new function() {
    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                .getService(Components.interfaces.nsIPrefService);
    var branch = prefService.getBranch("extensions.zeasr.");
    branch.QueryInterface(Components.interfaces.nsIPrefBranch2);

    this.get = get;
    this.set = set;
    
    this.register = register;
    this.unregister = unregister;
    this.observe = observe;
 
    /////////////////////////
    // Retrieve a preference
    /////////////////////////
    function get(pref, global) {
        try {
            var service = (global) ? prefService : branch;
            
            switch (service.getPrefType(pref)){
                case service.PREF_BOOL:
                    return service.getBoolPref(pref);
                case service.PREF_STRING:
                    return service.getCharPref(pref);
                case service.PREF_INT:
                    return service.getIntPref(pref);
                default:
                    throw ("Unsupported preference type '" +
                           service.getPrefType(pref) + "'");
            }
        }
        catch(e) {
            throw ("Invalid preference: '" + pref + "'");
        }
    }
    
    ////////////////////
    // Set a preference
    ////////////////////
    function set(pref, value){
        try {
            switch (branch.getPrefType(pref)){
                case branch.PREF_BOOL:
                    return branch.setBoolPref(pref, value);
                case branch.PREF_STRING:
                    return branch.setCharPref(pref, value);
                case branch.PREF_INT:
                    return branch.setIntPref(pref, value);
                default:
                    throw ("Unsupported preference type '" +
                           branch.getPrefType(pref) + "'");
            }
        }
        catch(e) {
            throw ("Invalid preference: '" + pref + "'");
        }
    }
    
    ///////////////////////////////////////////////
    // Registers a preference change event observer
    ///////////////////////////////////////////////
    function register() {
        branch.addObserver("", this, false);
    }
    
    ///////////////////////////////////////
    // Unregisters the preference observer
    ///////////////////////////////////////
    function unregister() {
        if (branch)
            branch.removeObserver("", this);
    }
    
    //////////////////////////////
    // Handles preference changes
    //////////////////////////////
    function observe(subject, topic, data) {
        if (topic != "nsPref:changed") return;
        
        // subject is the nsIPrefBranch we're observing (after appropriate QI)
        // data is the name of the pref that's been changed (relative to subject)
        switch (data) {
            case "configProviders":
                SEASR.PrefPane.updateProviderList();
                if (SEASR.initialized)
                    SEASR.retrieveConfiguration(SEASR.Preferences.getProviders());
                break;
        }
    }
}


SEASR.Preferences = new function() {
    this.addProvider = addProvider;
    this.deleteProvider = deleteProvider;
    this.changeProvider = changeProvider;
    this.getProviders = getProviders;
    
    
    function getProviders() {
        return JSON.parse(SEASR.PrefManager.get("configProviders"));
    }
    
    function setProviders(providers) {
        SEASR.PrefManager.set("configProviders", JSON.stringify(providers));
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


SEASR.PrefPane = new function() {
    this.init = init;
    this.updateProviderList = updateProviderList;
    this.showProviderEditor = showProviderEditor;
    this.deleteSelectedProvider = deleteSelectedProvider;
    
    
    var prefpane;
    
    function init()
    {
        prefpane = document;
        updateProviderList();
    }
    
    function updateProviderList()
    {
        if (!prefpane) return;

        var providerTreeRows = prefpane.getElementById('configProviders-rows');
        while (providerTreeRows.hasChildNodes()) {
            providerTreeRows.removeChild(providerTreeRows.firstChild);
        }
    
        var providers = SEASR.Preferences.getProviders();
        
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
 
        SEASR.Preferences.deleteProvider(tree.currentIndex);
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
            var providerEnabled = "true";
        }
        
        var param = { provider: { name: providerName, url: providerURL, enabled: providerEnabled }, ok: false };
        window.openDialog('chrome://zeasr/content/preferences/providerEditor.xul', "zeasr-providerEditor", "chrome, modal", param);
        
        if (!param.ok) {
            return;
        }
        
        if (typeof(idx) == "undefined")
            try {
                SEASR.Preferences.addProvider(param.provider);
            } catch(e) {
                alert("Could not add the specified provider. Reason: " + e.message);
            }
        else {
            if (providerName != param.provider.name || providerURL != param.provider.url || providerEnabled != param.provider.enabled)
                try {
                    SEASR.Preferences.changeProvider(idx, param.provider);
                } catch(e) {
                    alert("Could not change the specified provider. Reason: " + e.message);
                }
        }
    }
}