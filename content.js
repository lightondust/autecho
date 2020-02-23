function getLanguage(){
    return navigator.language;
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse){
        console.log(request);
        if(request['action'] === 'get_language'){
            sendResponse({'data':getLanguage()});
        }
    }
);

window.onload = function(){
    let message = {
        'action': 'send_page_information',
        'data': getLanguage(),
        'url': location.href
    };
    console.log(message);
    chrome.runtime.sendMessage(message, function(res){
        console.log(res);
    });
};
