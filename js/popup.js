const ITERATE_TIME=24 * 100;
let iter_counter = 0;
let endTime;
let startTime;
let history=[];
let historyStatistics={};
let historyStatisticsArray=[];
let historyDomainSelected;
let recordDomainSelected;
let detail_id = -1;
let show_domain_no = 100;
let show_detail_no = 100;
let current_tab_contents;
let registeredContentsToDisplay;
let registeredContentsList;
let settings_view_status=false;  // false to hide, true to show
let DEFAULT_SETTINGS = {
    'server_address': 'http://localhost:8009',
    'user': '',
    'password': ''
};
let setting_contents;
let ifSync;
let tagRecent;


// tag section

function update_tag_options(){
    let tags = Object.keys(registeredContentsToDisplay);
    let tags_element = document.getElementById('selected_tag');
    tags_element.innerHTML = '';
    for(let i=0; i<tags.length; i++){
        let tag = tags[i];
        let option_element = document.createElement('option');
        option_element.value = tag;
        option_element.innerText = tag;
        tags_element.appendChild(option_element);
    }
    tags_element.value = 'none';
}

function get_tag_to_register(){
    let tag;
    let tag_input = document.getElementById('new_tag_name').value;
    if(tag_input){
        tag = [tag_input];
    }else{
        tag = [document.getElementById('selected_tag').value];
    }
    return tag
}


// items section

function register_current_url(){
    tagRecent = get_tag_to_register();
    chrome.tabs.query({'active': true, 'currentWindow': true}, function (tabs) {
        let time = new Date();
        current_tab_contents = {
            'url': tabs[0].url,
            'title': tabs[0].title,
            'time': time.toLocaleString(),
            'tag': tagRecent,
            'type': ['item']
        };
        register_url(current_tab_contents, tabs[0].id);
    });
}

function register_url(tab_contents, tabId){
    let contents = {};
    contents[tab_contents['url']] = tab_contents;

    // merge exists records
    chrome.storage.local.get(contents['url'], function(contents_old){
        // merge old contents
        if(contents_old[tab_contents['url']]){
            contents_old = contents_old[tab_contents['url']];
            if(contents_old['type'].includes('record')){
                contents[tab_contents['url']]['type'].push('record');
            }
            if(contents_old['tag']){
                if(contents_old['tag'].length) {
                    for (let i = 0; i < contents_old['tag'].length; i++) {
                        if (!contents[tab_contents['url']]['tag'].includes(contents_old['tag'][i])) {
                            contents[tab_contents['url']]['tag'].push(contents_old['tag'][i]);
                        }
                    }
                }
            }
            if(contents_old['lang']){
                contents[tab_contents['url']]['lang'] = contents_old['lange'];
            }
        }

        if(contents[tab_contents['url']]['lang']){
            setItemContents(contents);
        }else{
            chrome.tabs.sendMessage(tabId, {'action': 'get_language'}, function(response){
                contents[tab_contents['url']]['lang'] = response['data'];
                setItemContents(contents);
            });
        }
    });
}

function setItemContents(cont){
    // sync to server or just save
    if(ifSync){
        let messageToServer = {};
        messageToServer['user'] = setting_contents['user'];
        messageToServer['password'] = setting_contents['password'];
        messageToServer['data'] = object_to_array(cont);

        axios.post(
            setting_contents['server_address'] + '/register',
            messageToServer
        ).then(
            function (response) {
                if(response['data']['results']){
                    setItemContentsToStorage(cont);
                }else{
                    console.log('some thine wrong on communication with server, in register url')
                }
            }).catch(function(error){
            console.log(error);
        });
    }else{
        setItemContentsToStorage(cont);
    }
}

function setItemContentsToStorage(contents_to_set){
    chrome.storage.local.set(contents_to_set, function() {
        let contentsKey = Object.keys(contents_to_set)[0];
        display_current_registered_url(contents_to_set[contentsKey]);
        display_registered_items();
        chrome.storage.sync.set({'last_tag': tagRecent[0]}, function () {});
    })
}

function display_current_registered_url(tab_contents){
    get_registered_items();
    let registered_url_link_el = document.getElementById('registered_url');
    let registered_url_description_el = document.getElementById('registered_url_description');
    let registered_time = document.getElementById('register_time');

    registered_url_description_el.innerText = tab_contents['tag']+':';
    registered_url_link_el.href = tab_contents.url;
    registered_url_link_el.innerText = tab_contents.title;
    registered_time.innerText = tab_contents['time'];
}

// re-arrange data in order to display
function parse_registered_items_from_storage_records(records_arr){
    let contents = {};
    for(let i=0; i<records_arr.length; i++){
        let rec = records_arr[i];
        let rec_data = rec['data'];
        let tag = rec_data['tag'];
        if (!tag.length) {
            tag = ['none'];
        }
        for(let i=0; i<tag.length; i++){
            let t = tag[i];
            if (contents[t]) {
                contents[t].push(rec);
            } else {
                contents[t] = [rec];
            }
        }
    }
    return contents;
}

function filterItemsFromStorageRecords(recordsArr, itemType){
    let recordItems=[];
    for(let i=0; i<recordsArr.length; i++){
        let rec = recordsArr[i];
        let rec_data = rec['data'];
        let type = rec_data['type'];
        if(type.includes(itemType)){
            recordItems.push(rec);
        }
    }
    return recordItems;
}

function get_registered_items(){
    chrome.storage.local.get(null, function(records){
        let records_arr = object_to_array(records);
        registeredContentsList = filterItemsFromStorageRecords(records_arr, 'item');
        registeredContentsToDisplay = parse_registered_items_from_storage_records(registeredContentsList);
        update_tag_options();
    })
}

function display_registered_items(){
    get_registered_items();
    let target_element = document.getElementById('items');
    target_element.innerHTML = '';

    for(let [tag, items] of Object.entries(registeredContentsToDisplay)){
        for(let i=0; i<items.length; i++){
            let item = items[i];
            let item_data = item['data'];
            if(item['key'].startsWith('http')){
                let item_element = document.createElement('li');
                let item_title_link = document.createElement('a');
                let item_tag = document.createElement('span');
                item_title_link.href = item['key'];
                item_title_link.innerText = item_data.title;
                item_title_link.target = '_blank';
                item_tag.innerText = tag + ': ';
                item_tag.className = 'item_tag';
                item_element.className = 'item_block';
                item_element.appendChild(item_tag);
                item_element.appendChild(item_title_link);
                target_element.appendChild(item_element);
            }
        }

    }
}


// domain utils

function getDomainSelected(domain_type){
    let domain_class_name = 'select_' + domain_type + '_domain';
    let input_element_list = document.getElementsByClassName(domain_class_name);
    let domain_list = [];
    historyDomainSelected = [];
    for(let i=0; i<input_element_list.length; i++){
        if(input_element_list[i].checked){
            domain_list.push(input_element_list[i].value);
        }
    }
    return domain_list;
}

// record section

function display_recorded_urls(){
    chrome.storage.local.get(null, function(recorded_urls){
        recorded_urls = object_to_array(recorded_urls);
        let recordedItems = filterItemsFromStorageRecords(recorded_urls, 'record');
        renderRecordedItems(recordedItems);
    })
}

function renderRecordedItems(recordedItemsToRender){
    let target_element = document.getElementById('records');
    target_element.innerHTML = '';
    for(let i=0; i<recordedItemsToRender.length; i++){
        let item = recordedItemsToRender[i];
        let item_data = item['data'];
        let item_element = document.createElement('li');
        item_element.innerText = item_data.title;
        target_element.appendChild(item_element);
    }
}

function syncRecords(){
    chrome.storage.local.get(null, function(recorded_urls) {
        recorded_urls = object_to_array(recorded_urls);
        let recordedItems = filterItemsFromStorageRecords(recorded_urls, 'record');

        let contents = {};
        contents['user'] = setting_contents['user'];
        contents['password'] = setting_contents['password'];
        contents['data'] = recordedItems;
        axios.post(
            setting_contents['server_address'] + '/update_records',
            contents
        ).then(function (res) {
            // pass
        }).catch(function(error){
            console.log(error);
        });
    });
}

function displayRecordDomains(){
    chrome.storage.sync.get('record_domains', function(res){
        let domains = res['record_domains'];
        let domain_class_name = 'select_record_domain';
        if(domains){
            let input_element_list = document.getElementsByClassName(domain_class_name);
            for(let i=0; i<input_element_list.length; i++){
                let el = input_element_list[i];
                el.checked = domains.includes(el.value);
            }
        }else{
            changeRecordDomains();
        }
    });
}


// history section

function getHistory(){
    // clean old results
    historyDomainSelected = getDomainSelected('history');
    let old_domain_elements = document.getElementById('history_results');
    old_domain_elements.innerHTML = '';

    endTime = new Date();
    startTime= new Date(endTime.getFullYear(), endTime.getMonth(), endTime.getDate(), endTime.getHours()-1);
    iter_counter = 0;

    history = [];
    historyStatistics = {};
    historyStatisticsArray = [];

    getHistorySlice(endTime, startTime);
}

function getHistorySlice(){
    let endTimeToUse = endTime.getTime();
    let startTimeToUse = startTime.getTime();

    iter_counter += 1;
    endTime = startTime;
    startTime = new Date(endTime.getFullYear(), endTime.getMonth(), endTime.getDate(), endTime.getHours()-1);

    let query = {
        text: '',
        maxResults: 500,
        startTime: startTimeToUse,
        endTime: endTimeToUse
    };

    chrome.history.search(query, process_after_history_search);
}

function filter_history_domain(res){
    if(historyDomainSelected.includes('*')){
        return res;
    }
    let res_clean = [];
    for(let i=0; i<res.length; i++){
        let url_str = res[i].url;
        let url_obj = new URL(url_str);
        let hostname = url_obj.hostname;
        if(historyDomainSelected.includes(hostname)){
            res_clean.push(res[i]);
        }
    }
    return res_clean;
}

function process_after_history_search(res){
    history = history.concat(filter_history_domain(res));
    if(iter_counter < ITERATE_TIME){
        getHistorySlice();
    } else{
        get_history_statistics(history);
        show_history_statistics(historyStatistics);
    }
}

function show_history_statistics(historyStatistics) {

    historyStatisticsArray = object_to_array(historyStatistics);
    historyStatisticsArray.sort(compare_domain_history_statistics);

    let target_element = document.getElementById('history_results');
    let template_element = document.getElementById('history_element_template');
    for(let i=0; i<show_domain_no; i++){
        let content_element = template_element.cloneNode(true);
        let data_to_show = historyStatisticsArray[i];

        content_element.id = 'history_element_' + i;
        content_element.innerHTML += data_to_show['key'] + '(' + data_to_show['data']['count'] + ')';
        target_element.appendChild(content_element);
        let button_el = content_element.getElementsByTagName('button')[0];
        button_el.onclick = show_detail(i);
    }
}

function get_history_statistics(history) {
    for (let i = 0; i < history.length; i++) {
        let hist = history[i];
        let url_str = hist.url;
        let url_obj = new URL(url_str);
        let hostname = url_obj.hostname;
        let visitCount = hist.visitCount;
        let title = hist.title;

        let data_details = {
            'title': title,
            'count': visitCount
        };

        if (historyStatistics[hostname]) {
            historyStatistics[hostname].count += visitCount;
            historyStatistics[hostname].details[url_str] = data_details;
        } else {
            historyStatistics[hostname] = {
                'count': visitCount
            };
            historyStatistics[hostname]['details'] = {};
            historyStatistics[hostname].details[url_str] = data_details;
        }
    }
}

function show_detail(i){
    return function() {
        console.log('show detail');
        let wrapper_id = 'history_detail';
        let old_wrapper_element = document.getElementById(wrapper_id);
        if(old_wrapper_element){
            old_wrapper_element.remove();
        }
        if(i === detail_id){detail_id=-1; return ;}
        detail_id = i;

        let target_element = document.getElementById('history_element_' + i);
        let wrapper_element = document.createElement('ul');
        let domain_data = historyStatisticsArray[i]['data'];
        let domain_detail_array = object_to_array(domain_data['details']);

        wrapper_element.id = 'history_detail';
        target_element.appendChild(wrapper_element);

        domain_detail_array.sort(compare_domain_history_statistics);

        for (let j = 0; j < show_detail_no; j++) {
            let item_element = document.createElement('li');
            let item_data = domain_detail_array[j];
            let item_data_detail = item_data['data'];
            let item_data_url = item_data['key'];
            let item_link = document.createElement('a');
            item_link.href = item_data_url;
            item_link.innerText = item_data_detail['title'] + ' (' + item_data_detail['count'] + ')';
            item_link.target = 'blank';
            item_element.appendChild(item_link);
            wrapper_element.appendChild(item_element);
        }
    }
}


// utils section

function object_to_array(obj){
    let arr = [];
    for(let [key, value] of Object.entries(obj)){
        let data_element = {key: key, data: value};
        arr = arr.concat([data_element]);
    }
    return arr;
}

function compare_domain_history_statistics(hist1, hist2){
    if(hist1.data.count > hist2.data.count){
        return -1;
    }else{
        return 1;
    }
}

function compare_detail_history_statistics(detail1, detail2){
    if(detail1.count > detail2.count){
        return -1;
    }else{
        return 1;
    }
}

function objectSort(obj){
    let keys = Object.keys(obj).sort();
    let map = {};

    keys.forEach(function(key){
        map[key] = obj[key];
    });

    return map;
}

function compare_data_object(obj_1, obj_2){
    return JSON.stringify(objectSort(obj_1)) === JSON.stringify(objectSort(obj_2));
}


// settings section

function set_settings(settings){
    chrome.storage.sync.set({'settings': settings}, function(){
        setting_contents = settings;
        if(settings['user']){
            checkUser();
        }
        get_settings();
    })
}

function checkUser(){
    axios.post(
        setting_contents['server_address'] + '/login',
        setting_contents
    ).then(function(response){
        let data = response['data'];
        if(data['results']){
            setSync(true);
            let if_merge = document.getElementById('if_merge').checked;
            if(if_merge){
                console.log('merge items');
                mergeItems();
            }else{
                syncItems();
            }
        }else{
            setSync(false);
        }
    }).catch(function(error){
        console.log(error);
    });

}

function setSync(v){
    chrome.storage.sync.set({'sync': v}, function () {
        updateSyncStatus();
    });
}

function get_settings(){
    chrome.storage.sync.get('settings', function(res){
        if(res['settings']){
            setting_contents = res['settings'];
        }else{
            setting_contents = {};
        }
        for(let [k, v] of Object.entries(DEFAULT_SETTINGS)){
            if(!setting_contents[k]){
                setting_contents[k] = v;
            }
        }
        updateServerAddress();
        updateSyncStatus();
    });
}

function switch_setting_view(){
    let setting_area = document.getElementById('setting_contents');
    for(let [k, v] of Object.entries(setting_contents)){
        let el = document.getElementById(k);
        el.value = v;
    }

    if(settings_view_status){
    //    hide settings
        setting_area.style.display = 'none';
    }else{
    //    show settings
        setting_area.style.display = 'block';
    }
    settings_view_status = !settings_view_status;
}

function change_settings(){
    let server_address_element = document.getElementById('server_address');
    let address = server_address_element.value;
    let user_element = document.getElementById('user');
    let user_name = user_element.value;
    let password_element = document.getElementById('password');
    let password = password_element.value;
    let settings = {
        'user': user_name,
        'password': password,
        'server_address': address
    };
    set_settings(settings);
}

function changeRecordDomains(){
    recordDomainSelected = getDomainSelected('record');
    chrome.storage.sync.set({'record_domains': recordDomainSelected});
}

function updateServerAddress(){
    let el = document.getElementById('board_link');
    let serverAddress = setting_contents['server_address'];
    let boardAddress;
    if(!serverAddress.endsWith('/')){
        boardAddress = serverAddress + '/';
    }else{
        boardAddress = serverAddress;
    }

    if(boardAddress.endsWith('/api/')){
        boardAddress = boardAddress.replace('/api/', '/board/')
    }

    el.href = boardAddress;
}

function updateSyncStatus(){
    chrome.storage.sync.get('sync', function(res){
        ifSync = res['sync'];
        let el = document.getElementById('sync_status');
        if(ifSync){
            el.innerText = 'sync: O';
            syncItems();
        }else{
            el.innerText = 'sync: X';
        }
    });
}


// merge and sync section
let registered_contents_sync;

function mergeItems(){
    console.log('merge');
    let contents = {};
    contents['user'] = setting_contents['user'];
    contents['password'] = setting_contents['password'];
    contents['data'] = registeredContentsList;
    axios.post(
        setting_contents['server_address'] + '/merge',
        contents
    ).then(function(response){
        let data = response['data'];
        registered_contents_sync = data;
        syncStorage(data);
    }).catch(function(error){
        console.log(error);
    });
}

function syncItems(){
    console.log('sync');
    let contents = {};
    contents['user'] = setting_contents['user'];
    contents['password'] = setting_contents['password'];
    axios.post(
        setting_contents['server_address'] + '/items',
        contents
    ).then(function(response){
        let data = response['data'];
        registered_contents_sync = data;
        syncStorage(data);
    }).catch(function(error){
        console.log(error);
    });
}

function syncStorage(dataArray){
    chrome.storage.local.get(null, function(records){
        let urlsInServer = new Set();
        for(let i=0; i<dataArray.length; i++){
            let d = dataArray[i];
            let url = d['key'];
            urlsInServer.add(url);
            let rec = d['data'];

            let recStorage = records[url];

            let contentsToStore = {};
            contentsToStore[url] = rec;

            if(recStorage){
                if(!compare_data_object(rec, recStorage)){
                    console.log('diff:'+url);
                    chrome.storage.local.set(contentsToStore);
                }
            }else{
                console.log('new:'+url);
                chrome.storage.local.set(contentsToStore);
            }
        }

        for(let [k, v] of Object.entries(records)){
            if(v['type'].includes('item')){
                if(!urlsInServer.has(k)){
                    chrome.storage.local.remove(k);
                }
            }
        }
    });
}

function displayRecentTag(){
    chrome.storage.sync.get('last_tag', function(res){
        if(res['last_tag']){
            document.getElementById('selected_tag').value = res.last_tag;
        }
    })
}

function displayCurrentTabInformation(){
    chrome.tabs.query({'active': true, 'currentWindow': true}, function (tabs) {
        let url = tabs[0].url;
        let title = tabs[0].title;

        chrome.storage.local.get(url, function(res){
            let tab_info_el = document.getElementById('current_tab_link');
            tab_info_el.innerText = title;
            tab_info_el.href = url;

            if(res[url]){
                document.getElementById('current_tab_tag_information').innerText = res[url]['tag'];
            }
        })
    });
}

// initialization section

let get_history_button = document.getElementById('get_history_button');
let register_current_url_button = document.getElementById('register_current_url_button');
let show_record_button = document.getElementById('show_records_button');
let syncRecordButton = document.getElementById('sync_records_button');
let show_registered_item_button = document.getElementById('show_registered_items_button');
let setting_button = document.getElementById('setting_button');
let change_setting_button = document.getElementById('change_setting_button');
let change_record_domains_button = document.getElementById('change_record_domains');
get_history_button.addEventListener('click', getHistory);
register_current_url_button.addEventListener('click', register_current_url);
show_record_button.addEventListener('click', display_recorded_urls);
syncRecordButton.addEventListener('click', syncRecords);
show_registered_item_button.addEventListener('click', display_registered_items);
setting_button.addEventListener('click', switch_setting_view);
change_setting_button.addEventListener('click', change_settings);
change_record_domains_button.addEventListener('click', changeRecordDomains);

get_settings();
get_registered_items();
displayRecordDomains();
displayRecentTag();
displayCurrentTabInformation();

// debug section
let rec_;

function debug_show_storage(st_type){
    if(st_type==='sync'){
        chrome.storage.sync.get(null, function(res){
            rec_=res;
            console.log(res);
        })
    }else if(st_type==='local'){
        chrome.storage.local.get(null, function(res){
            rec_=res;
            console.log(res);
        })
    }
}
