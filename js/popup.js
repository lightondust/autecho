console.log('start loading');

let now;
let endTime;
let endTimeToUse;
let startTime;
let startTimeToUse;
let history=[];


function getHistory(){
    now = new Date();
    endTime = now;
    startTime= new Date(endTime.getFullYear(), endTime.getMonth(), endTime.getDate(), endTime.getHours()-1);

    getHistorySlice();
}

function getHistorySlice(){
    endTimeToUse = endTime.getTime();
    startTimeToUse = startTime.getTime();
    let query = {
        text: '',
        maxResults: 500,
        startTime: startTimeToUse,
        endTime: endTimeToUse
    };

    chrome.history.search(query, function(res){
        history = history.concat(res);
        console.log(res);
        endTime = startTime;
        startTime = new Date(endTime.getFullYear(), endTime.getMonth(), endTime.getDate(), endTime.getHours()-1);
    })
}