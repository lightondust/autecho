let history=[];
const ITERATE_TIME=24 * 10;

function getHistory(){
    let endTime = new Date();
    let startTime= new Date(endTime.getFullYear(), endTime.getMonth(), endTime.getDate(), endTime.getHours()-1);
    counter = 0;

    for(i=0; i<ITERATE_TIME; i++){
        getHistorySlice(endTime, startTime);
        endTime = startTime;
        startTime = new Date(endTime.getFullYear(), endTime.getMonth(), endTime.getDate(), endTime.getHours()-1);
    }
}

function getHistorySlice(endTime, startTime){
    let endTimeToUse = endTime.getTime();
    let startTimeToUse = startTime.getTime();

    let query = {
        text: '',
        maxResults: 500,
        startTime: startTimeToUse,
        endTime: endTimeToUse
    };

    chrome.history.search(query, function(res){
        history = history.concat(res);
        console.log(res);
    })
}