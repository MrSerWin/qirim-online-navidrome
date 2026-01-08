function transliterate(regexp_file) {
    var editSrc = document.getElementById('editSrc');

    var agt = navigator.userAgent.toLowerCase();
    if (agt.indexOf("msie")!=-1) { //IE
       var range = document.selection.createRange()
       txt = range.text;
       if (txt == '') {
         var str= editSrc.value;
       }else{
         var str=range.text;
       }
    }
    else {
      str= editSrc.value;
    }

    //---------------
      str = " " + str + " ";
      for ( i in regexp_file ) {
        str = str.replace( regexp_file[i][0], regexp_file[i][1] );
      }
      str = str.substring(1,str.length -1);
    //----------------
    if (agt.indexOf("msie")!=-1) { //IE
      if (txt == ''){
        editSrc.value = str;
      }else{
        range.text = str;
        //if (!window.opera) txt = txt.replace(/\r/g,'')
        if (range.moveStart) range.moveStart('character', - txt.length)
        range.select() 
      }
    }
    else{
      editSrc.value = str;
    }
 
    return true;
}

function clearField() {
  var editSrc = document.getElementById('editSrc');
  editSrc.value = '';
}

function transliterate(regexp_file) {
    var editSrc = document.getElementById('editSrc');

    var agt = navigator.userAgent.toLowerCase();
    if (agt.indexOf("msie")!=-1) { //IE
       var range = document.selection.createRange()
       txt = range.text;
       if (txt == '') {
         var str= editSrc.value;
       }else{
         var str=range.text;
       }
    }
    else {
      str= editSrc.value;
    }

    //---------------
      str = " " + str + " ";
      for ( i in regexp_file ) {
        str = str.replace( regexp_file[i][0], regexp_file[i][1] );
      }
      str = str.substring(1,str.length -1);
    //----------------
    if (agt.indexOf("msie")!=-1) { //IE
      if (txt == ''){
        editSrc.value = str;
      }else{
        range.text = str;
        //if (!window.opera) txt = txt.replace(/\r/g,'')
        if (range.moveStart) range.moveStart('character', - txt.length)
        range.select() 
      }
    }
    else{
      editSrc.value = str;
    }
 
    return true;
}

function clearField() {
  var editSrc = document.getElementById('editSrc');
  editSrc.value = '';
}
