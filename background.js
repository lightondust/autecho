chrome.contextMenus.create({
  "title" : "このページを登録する(まだ工事中)",
  "type"  : "normal",
  "contexts" : ["all"],
  "onclick" : function(){
      console.log('menu button triggered');
  }
});

chrome.tabs.onUpdated.addListener( function( tabId,  changeInfo,  tab) {
    chrome.storage.local.get(tab.url, function(rec_old){
        let contents = {};
        contents[tab.url] = {
            'title': tab.title,
            'time': new Date(),
            'url': tab.url
        };
        if(!rec_old.count){
            contents['count'] = 1;
        }else{
            contents['count'] = rec_old.count+1;
        }
        chrome.storage.local.set(contents, function(){});
    });
});