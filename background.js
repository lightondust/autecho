let url_domain_list;
const RECORD_DOMAINS_KEY = 'record_domains';

function updateRecordDomains(){
    chrome.storage.sync.get(RECORD_DOMAINS_KEY, function(rec){
        url_domain_list = rec[RECORD_DOMAINS_KEY];
    })
}

function url_domain_filter(url){
    if(url_domain_list.includes('*')){
        return true;
    }
    let url_obj = new URL(url);
    let hostname = url_obj.hostname;
    return url_domain_list.includes(hostname);
}

function setContents(cont) {
    chrome.storage.local.set(cont, function(){});
}

updateRecordDomains();

chrome.contextMenus.create({
  "title" : "このページを登録する(まだ工事中)",
  "type"  : "normal",
  "contexts" : ["all"],
  "onclick" : function(){
      console.log('menu button triggered');
  }
});

chrome.tabs.onUpdated.addListener( function( tabId,  changeInfo,  tab) {
    updateRecordDomains();
    chrome.storage.local.get(tab.url, function(rec_old){
        let url = tab.url;
        let time = new Date();
        if(url_domain_filter(url)){
            let contents = {};
            contents[tab.url] = {
                'title': tab.title,
                'time': time.toLocaleString(),
                'url': tab.url,
                'type': ['record'],
            };
            if(!rec_old[tab.url]){
                contents[tab.url]['count'] = 1;
            }else{

                // count
                if(!rec_old[tab.url].count){
                    contents[tab.url]['count'] = 1;
                }else {
                    contents[tab.url]['count'] = rec_old[tab.url].count + 1;
                }

                // type
                if(rec_old[tab.url]['type'].includes('item')){
                    contents[tab.url]['type'].push('item');
                    contents[tab.url]['tag'] = rec_old[tab.url]['tag'];
                }

                // lang
                if(rec_old[tab.url]['lang']){
                    contents[tab.url]['lang'] = rec_old[tab.url]['lang'];
                }
            }
            setContents(contents);
        }
    });
});

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse){
        if(request['action']==='send_page_information') {
            console.log(request);
            let url = request['url'];
            if (url_domain_filter(url)) {
                chrome.storage.local.get(url, function (rec_old) {
                    rec_old[url]['lang'] = request['data'];
                    setContents(rec_old);
                })
            }
            sendResponse({'results': 'OK'});
        }
    }
);
