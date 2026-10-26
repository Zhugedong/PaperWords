const $=id=>document.getElementById(id),size=40;
let catalog=[],words=[],learning=new Map(),page=0,loadSerial=0,session=[],position=0,studying=false,studySerial=0;
const lines=s=>String(s||'').replace(/\\n/g,'\n');
function node(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e}
function button(text,fn,cls){const b=node('button',text,cls);b.type='button';b.onclick=async()=>{b.disabled=true;try{await fn()}catch(e){$('bookMessage').textContent=e.message}finally{b.disabled=false}};return b}
function due(word){return learning.get(word.q)?.due<=Date.now()}
function progress(){
 const learned=words.filter(w=>learning.get(w.q)?.lastReview).length;
 $('bookProgress').textContent=`共 ${words.length} 词 · 已学 ${learned} 词 · 到期 ${words.filter(due).length} 词`;
}
async function refresh(){learning=new Map((await api.learningSummary()).map(r=>[r.q,r]));progress()}
function render(){
 const q=$('bookSearch').value.trim().toLowerCase();
 const filtered=words.filter(w=>(w.q+' '+lines(w.translation)).toLowerCase().includes(q));
 const pages=Math.max(1,Math.ceil(filtered.length/size));page=Math.min(page,pages-1);
 $('bookWordList').replaceChildren();
 for(const w of filtered.slice(page*size,(page+1)*size)){
  const row=node('div',undefined,'bookRow'),info=node('div');
  info.append(node('strong',w.q),node('small',w.phonetic||''),node('p',lines(w.translation)));
  const state=learning.get(w.q);info.append(node('small',state?.lastReview?(due(w)?'待复习':'已学 · 已安排复习'):'未学习'));
  row.append(info,button('学习',()=>{session=[w];position=0;showStudy()}),button('查词',()=>{document.dispatchEvent(new CustomEvent('paperwords:lookup',{detail:w.q}))}));
  $('bookWordList').append(row);
 }
 if(!filtered.length)$('bookWordList').append(node('p','没有匹配的单词。','muted'));
 $('bookPage').textContent=`${page+1} / ${pages} 页 · ${filtered.length} 词`;
 $('bookPrev').disabled=page===0;$('bookNext').disabled=page>=pages-1;
}
async function loadBook(){
 const request=++loadSerial,id=$('bookSelect').value;
 $('bookMessage').textContent='正在加载词书…';$('startBook').disabled=true;$('reviewBook').disabled=true;
 $('bookStudy').hidden=true;studying=false;studySerial++;
 try{
  const [list,states]=await Promise.all([api.bookWords(id),api.learningSummary()]);if(request!==loadSerial)return;
  words=list;learning=new Map(states.map(r=>[r.q,r]));page=0;$('bookSearch').value='';
  $('bookSource').textContent=catalog.find(b=>b.id===id)?.source||'';
  $('bookMessage').textContent='进度与查词页共用，自动保存在本机。';
  try{localStorage.setItem('paperwords.book',id)}catch{}
  progress();render();
 }catch(e){if(request===loadSerial){words=[];progress();render();$('bookMessage').textContent='加载失败：'+e.message}}
 finally{if(request===loadSerial){$('startBook').disabled=!words.length;$('reviewBook').disabled=!words.length}}
}
function showStudy(){
 const request=++studySerial;let grading=false;
 studying=true;const box=$('bookStudy');box.hidden=false;box.replaceChildren();
 const w=session[position];
 if(!w){box.append(node('h3','本组学习完成'),node('p','已保存本次进度，可继续学习或复习其他词。'));studying=false;render();return}
 box.append(node('small',`${position+1} / ${session.length}`,'muted'),node('h3',w.q),node('p',w.phonetic||'','muted'));
 const meaning=node('div',lines(w.translation),'studyMeaning');meaning.hidden=true;
 const actions=node('div',undefined,'actions');
 const reveal=button('显示释义',()=>{meaning.hidden=false;reveal.hidden=true;again.hidden=false;known.hidden=false});
 const grade=async value=>{if(grading)return;grading=true;again.disabled=known.disabled=true;try{const state=await api.learn(w.q,{grade:value});if(request!==studySerial)return;learning.set(w.q,{q:w.q,...state});position++;progress();showStudy()}finally{grading=false;again.disabled=known.disabled=false}};
 const again=button('还不熟',()=>grade('again')),known=button('记住了 ✓',()=>grade('known'),'primary');again.hidden=known.hidden=true;
 actions.append(button('▷ 朗读',()=>api.speak(w.q,0)),reveal,again,known,button('结束本组',()=>{studySerial++;box.hidden=true;studying=false;render()}));
 box.append(meaning,actions);
 box.scrollIntoView({block:'nearest'});
}
async function start(review){
 await refresh();
 session=words.filter(review?due:w=>!learning.get(w.q)?.lastReview).slice(0,20);position=0;
 if(!session.length){$('bookStudy').hidden=true;$('bookMessage').textContent=review?'当前词书没有到期词。':'当前词书已全部学过，可按到期计划复习，或点击列表中的单词重学。';return}
 $('bookMessage').textContent=review?'先回忆词义，再显示释义并标记记忆情况。':'每组最多 20 词，先回忆再查看释义。';showStudy();
}
$('browseBooks').onclick=async()=>{
 const open=$('bookLibrary').hidden;$('bookLibrary').hidden=!open;$('wordSearch').hidden=open;$('wordList').hidden=open;$('exportWords').hidden=open;
 $('browseBooks').textContent=open?'返回我的收藏':'单词书';
 if(!open)return;
 try{
  if(!catalog.length){catalog=await api.bookCatalog();$('bookSelect').replaceChildren(...catalog.map(b=>new Option(`${b.name} · ${b.count} 词`,b.id)));let saved;try{saved=localStorage.getItem('paperwords.book')}catch{}if(catalog.some(b=>b.id===saved))$('bookSelect').value=saved;await loadBook()}
  else{await refresh();if(!studying)render()}
 }catch(e){$('bookMessage').textContent='词书加载失败：'+e.message}
};
$('bookSelect').onchange=loadBook;$('bookSearch').oninput=()=>{page=0;render()};
$('bookPrev').onclick=()=>{page--;render()};$('bookNext').onclick=()=>{page++;render()};
$('startBook').onclick=()=>start(false).catch(e=>$('bookMessage').textContent=e.message);
$('reviewBook').onclick=()=>start(true).catch(e=>$('bookMessage').textContent=e.message);
$('navWords').addEventListener('click',async()=>{if(!$('bookLibrary').hidden&&catalog.length){try{await refresh();render()}catch(e){$('bookMessage').textContent=e.message}}});
