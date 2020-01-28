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

let get_history_button = document.getElementById('get_history_button');
get_history_button.addEventListener('click', getHistory);
let regist_current_url_button = document.getElementById('regist_current_url_button');
regist_current_url_button.addEventListener('click', regist_current_url);

function get_tag(){
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
    let tag = get_tag();
    chrome.tabs.query({'active': true, 'currentWindow': true}, function (tabs) {
        current_tab_contents = {
            'url': tabs[0].url,
            'title': tabs[0].title,
            'time': new Date(),
            'tag': tag
        };
        regist_url(current_tab_contents);
    });
}

function regist_url(tab_contents){
    let contents = {};
    contents[tab_contents['url']] = tab_contents;
    chrome.storage.sync.set(contents, function() {
        display_registed_url(tab_contents);
    })
}

function display_registed_url(tab_contents){
    let registed_url_link_el = document.getElementById('registed_url');
    let registed_url_description_el = document.getElementById('registed_url_description');
    let regist_time = document.getElementById('regist_time');

    registed_url_description_el.innerText = tab_contents['tag']+':';
    registed_url_link_el.href = tab_contents.url;
    registed_url_link_el.innerText = tab_contents.title;
    regist_time.innerText = tab_contents['time'];
}

function updateHistoryDomainSelected(){
    let input_element_list = document.getElementsByClassName('select_history_domain');
    historyDomainSelected = [];
    for(let i=0; i<input_element_list.length; i++){
        if(input_element_list[i].checked){
            historyDomainSelected.push(input_element_list[i].value);
        }
    }
}

function getHistory(){
    // clean old results
    updateHistoryDomainSelected();
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

    chrome.history.search(query, process_after_history_search)
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
        let wrapper_element = document.createElement('div');
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

