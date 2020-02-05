const ITERATE_TIME=24 * 100;
let iter_counter = 0;
let endTime;
let startTime;
let history=[];
let historyStatistics={};
let historyStatisticsArray=[];
let historyDomainSelected;
let detail_id = -1;
let show_domain_no = 100;
let show_detail_no = 100;
let current_tab_contents;
let registed_contents;
let settings_status=false;  // false to hide, true to show
let server_address;
let DEFAULT_SERVER_ADDRESS='http://localhost:8009';


function get_tag_to_regist(){
    let if_use_new_tag = document.getElementById('if_use_new_tag').checked;
    let tag;
    if(if_use_new_tag){
        tag = document.getElementById('new_tag_name').value;
    }else{
        tag = document.getElementById('selected_tag').value;
    }
    return tag
}

function regist_current_url(){
    let tag = get_tag_to_regist();
    chrome.tabs.query({'active': true, 'currentWindow': true}, function (tabs) {
        let time = new Date();
        current_tab_contents = {
            'url': tabs[0].url,
            'title': tabs[0].title,
            'time': time.toLocaleString(),
            'tag': [tag],
            'type': ['item']
        };
        regist_url(current_tab_contents);
    });
}

function regist_url(tab_contents){
    let contents = {};
    contents[tab_contents['url']] = tab_contents;
    chrome.storage.local.get(contents['url'], function(contents_old){
        if(contents_old[tab_contents['url']]){
            if(contents_old[tab_contents['url']]['type'].includes('record')){
                contents[tab_contents['url']]['type'].push('record');
            }
            if(contents_old[tab_contents['url']]['tag'].length){
                contents[tab_contents['url']]['tag'].push(contents_old[tab_contents['url']]['tag']);
            }
        }
        chrome.storage.local.set(contents, function() {
            display_current_registed_url(tab_contents);
            display_registed_items();
        })
    });
}

function display_current_registed_url(tab_contents){
    get_registed_items();
    let registed_url_link_el = document.getElementById('registed_url');
    let registed_url_description_el = document.getElementById('registed_url_description');
    let regist_time = document.getElementById('regist_time');

    registed_url_description_el.innerText = tab_contents['tag']+':';
    registed_url_link_el.href = tab_contents.url;
    registed_url_link_el.innerText = tab_contents.title;
    regist_time.innerText = tab_contents['time'];
}

function get_registed_items(){
    chrome.storage.local.get(null, function(records){
        records = object_to_array(records);
        registed_contents = {};
        for(let i=0; i<records.length; i++){
            let rec = records[i];
            let rec_data = rec['data'];
            let type = rec_data['type'];
            if(type.includes('item')) {
                let tag = rec_data['tag'];
                if (!tag.length) {
                    tag = ['none'];
                }
                for(let i=0; i<tag.length; i++){
                    let t = tag[i];
                    if (registed_contents[t]) {
                        registed_contents[t].push(rec);
                    } else {
                        registed_contents[t] = [rec];
                    }
                }
            }
        }
    })
}

function display_registed_items(){
    let target_element = document.getElementById('items');
    target_element.innerHTML = '';

    for(let [tag, items] of Object.entries(registed_contents)){
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
                item_tag.innerText = item_data.tag + ': ';
                item_tag.className = 'item_tag';
                item_element.className = 'item_block';
                item_element.appendChild(item_tag);
                item_element.appendChild(item_title_link);
                target_element.appendChild(item_element);
            }
        }

    }
}

function display_recorded_urls(){
    chrome.storage.local.get(null, function(recorded_urls){
        let target_element = document.getElementById('records');
        target_element.innerHTML = '';
        recorded_urls = object_to_array(recorded_urls);
        for(let i=0; i<recorded_urls.length; i++){
            let item = recorded_urls[i];
            let item_data = item['data'];
            if(item_data['type'].includes('record')){
                let item_element = document.createElement('li');
                item_element.innerText = item_data.title;
                target_element.appendChild(item_element);
            }
        }
    })
}

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

function get_server_address(){
    chrome.storage.sync.get('server_address', function(res){
        if(res.server_address){
            server_address = res.server_address;
        }else{
            server_address = DEFAULT_SERVER_ADDRESS;
        }
    })
}

function set_server_address(address){
    chrome.storage.sync.set({'server_address': address}, function(res){
        server_address = address;
    });
}

function switch_setting_view(){
    get_server_address();
    let setting_area = document.getElementById('setting_contents');
    let server_address_element = document.getElementById('server_address');
    server_address_element.value = server_address;
    if(settings_status){
    //    hide settings
        setting_area.style.display = 'none';
    }else{
    //    show settings
        setting_area.style.display = 'block';
    }
    settings_status = !settings_status;
}

function change_server_address(){
    let server_address_element = document.getElementById('server_address');
    let address = server_address_element.value;
    set_server_address(address);
}

function change_record_domains(){
    console.log('change record domains called');
}

let get_history_button = document.getElementById('get_history_button');
let regist_current_url_button = document.getElementById('regist_current_url_button');
let show_record_button = document.getElementById('show_records_button');
let show_registed_item_button = document.getElementById('show_registed_items_button');
let setting_button = document.getElementById('setting_button');
let change_server_button = document.getElementById('change_server_button');
let change_record_domains_button = document.getElementById('change_record_domains');
get_history_button.addEventListener('click', getHistory);
regist_current_url_button.addEventListener('click', regist_current_url);
show_record_button.addEventListener('click', display_recorded_urls);
show_registed_item_button.addEventListener('click', display_registed_items);
setting_button.addEventListener('click', switch_setting_view);
change_server_button.addEventListener('click', change_server_address);
change_record_domains_button.addEventListener('click', change_record_domains);

get_server_address();
get_registed_items();

// dev area
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
