let url_domain_list = [
    "qiita.com",
    "github.com",
    "arxiv.org",
    "scholar.google.com",
    "stackoverflow.com",
    "medium.com"
];

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
        let url = tab.url;
        let time = new Date();
        if(url_domain_filter(url)){
            let contents = {};
            contents[tab.url] = {
                'title': tab.title,
                'time': time.toLocaleString(),
                'url': tab.url,
                'type': ['record']
            };
            if(!rec_old[tab.url]){
                contents[tab.url]['count'] = 1;
            }else{
                if(!rec_old[tab.url].count){
                    contents[tab.url]['count'] = 1;
                }else {
                    contents[tab.url]['count'] = rec_old[tab.url].count + 1;
                }
                if(rec_old[tab.url]['type'].includes('item')){
                    contents[tab.url]['type'].push('item');
                    contents[tab.url]['tag'] = rec_old[tab.url]['tag'];
                }
            }
            chrome.storage.local.set(contents, function(){});
        }
    });
});

function url_domain_filter(url){
    let url_obj = new URL(url);
    let hostname = url_obj.hostname;
    return url_domain_list.includes(hostname);
}