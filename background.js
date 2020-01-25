chrome.contextMenus.create({
  "title" : "このページを登録する(まだ工事中)",
  "type"  : "normal",
  "contexts" : ["all"],
  "onclick" : function(){
      console.log('menu button triggered');
  }
});