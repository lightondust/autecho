const ITERATE_TIME=24 * 10;
let iter_counter = 0;
let endTime;
let startTime;
let history=[];
let historyStatistics={};
let historyStatisticsArray=[];
let get_history_button = document.getElementById('get_history_button');

get_history_button.addEventListener('click', getHistory);

function getHistory(){
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

    chrome.history.search(query, post_history_search)
}

function post_history_search(res){
    history = history.concat(res);
    if(iter_counter < ITERATE_TIME){
        getHistorySlice();
    } else{
        get_history_statistics(history);
        show_history_statistics(historyStatistics);
    }
}

function show_history_statistics(historyStatistics) {
    let target_element = document.getElementById('history_results');
    let template_element = document.getElementById('history_element_template');
    for(let i=0; i<10; i++){
        let content_element = template_element.cloneNode();
        content_element.id = '';
        target_element.appendChild(content_element);
    }
}

function get_history_statistics(history){
    for(let i=0; i<history.length; i++){
        let hist = history[i];
        let url_str = hist.url;
        let url_obj = new URL(url_str);
        let hostname = url_obj.hostname;
        let visitCount = hist.visitCount;
        let title = hist.title;
        if(historyStatistics[hostname]){
            historyStatistics[hostname].count += visitCount;
            historyStatistics[hostname].details[url_str] = {
                'title': title,
                'count': visitCount
            }
        }else{
            historyStatistics[hostname] = {
                'count': visitCount,
                'details': {
                    url_str: {
                        'title': title,
                        'count': visitCount
                    }
                }
            };
        }
    }
}

function compare(hist1, hist2){
    if(hist1.count > hist2.count){
        return 1;
    }else{
        return -1;
    }
}

