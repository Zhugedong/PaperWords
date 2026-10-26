// Apply the saved stylesheet before the first paint; model credentials remain separate.
(() => {
  const themes = [
    {id:'midnight', name:'午夜蓝紫', detail:'深色 · 蓝紫微光', file:'dark.css', colors:['#10131e','#242d4b','#9295ff']},
    {id:'forest', name:'森林浅绿', detail:'浅色 · 清新自然', file:'', colors:['#f5f8f5','#dcece3','#16866d']},
    {id:'paper', name:'暖纸米色', detail:'浅色 · 温暖书页', file:'themes/paper.css', colors:['#f8f6f2','#eee6da','#9a6e26']},
    {id:'ocean', name:'海盐浅蓝', detail:'浅色 · 清澈明快', file:'themes/ocean.css', colors:['#f2f6f9','#dce6ee','#1674a8']},
    {id:'graphite', name:'石墨深灰', detail:'深色 · 低彩度专注', file:'themes/graphite.css', colors:['#111419','#292e35','#929aa5']}
  ];
  const key = 'paperwords.theme';
  let selected = 'midnight';
  try { const saved = localStorage.getItem(key); if(themes.some(t=>t.id===saved)) selected=saved; } catch {}
  function apply(id, persist=false) {
    const theme = themes.find(t=>t.id===id) || themes[0];
    selected=theme.id;
    const link=document.getElementById('themeStylesheet');
    link.disabled=!theme.file;
    if(theme.file) link.setAttribute('href',theme.file);
    document.documentElement.dataset.theme=theme.id;
    document.documentElement.style.colorScheme=['midnight','graphite'].includes(theme.id)?'dark':'light';
    let saved=true;
    if(persist) { try { localStorage.setItem(key,selected); } catch { saved=false; } }
    document.querySelectorAll('[data-theme-option]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.themeOption===selected)));
    const status=document.getElementById('themeStatus');
    if(status) status.textContent=`当前：${theme.name}${persist?(saved?' · 已自动保存':' · 本次已切换，无法保存偏好'):''}`;
  }
  apply(selected);
  document.addEventListener('DOMContentLoaded',()=>{
    const options=document.getElementById('themeOptions');
    themes.forEach(theme=>{
      const button=document.createElement('button');
      button.type='button'; button.className='themeOption'; button.dataset.themeOption=theme.id;
      const preview=document.createElement('span'); preview.className='themePreview'; preview.setAttribute('aria-hidden','true');
      theme.colors.forEach(color=>{const swatch=document.createElement('span');swatch.style.background=color;preview.append(swatch)});
      const name=document.createElement('strong');name.textContent=theme.name;
      const detail=document.createElement('small');detail.textContent=theme.detail;
      button.append(preview,name,detail);button.onclick=()=>apply(theme.id,true);options.append(button);
    });
    apply(selected);
    document.getElementById('railSettings').onclick=()=>document.getElementById('settings').showModal();
    window.addEventListener('storage',event=>{if(event.key===key)apply(event.newValue)});
  });
})();
