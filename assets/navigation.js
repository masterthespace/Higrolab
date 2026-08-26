(() => {
  'use strict';

  function goBack(){
    try{
      const ref = document.referrer ? new URL(document.referrer) : null;
      if(ref && ref.origin === window.location.origin){
        window.history.back();
        return;
      }
    }catch(e){}

    window.location.assign('index.html');
  }

  document.querySelectorAll('[data-higrolab-back]').forEach(btn => {
    btn.addEventListener('click', goBack);
  });
})();