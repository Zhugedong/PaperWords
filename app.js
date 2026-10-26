import {ContinuousReader} from './continuous-reader.js';
import {translateParts} from './translation.js';
import {identifyPaper,academicOptions,onDomainChange,preparePaper} from './academic-ui.js';
import * as pdfjs from './node_modules/pdfjs-dist/build/pdf.mjs';
pdfjs.GlobalWorkerOptions.workerSrc=new URL('./node_modules/pdfjs-dist/build/pdf.worker.mjs',import.meta.url).href;
const $=id=>document.getElementById(id);let papers=[],active=null,pdf=null,pageNumber=1,zoom=0,current=null,selected='',selectionPage=1,words=[],openSerial=0,querySerial=0;
const status=(text,error=false)=>{$('status').textContent=text;$('status').classList.toggle('error',error)};
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
const safe=fn=>(...args)=>Promise.resolve().then(()=>fn(...args)).catch(e=>status(e.message,true));
function tab(name){document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));for(const t of ['translate','notes','ai'])$(t+'Panel').hidden=t!==name}
function setSelection(text){$('selectionBar').hidden=true;translationBusy(false);$('translationProgress').textContent='';$('result').textContent=text.trim()?'选文已更新，等待翻译…':'选中英文后，译文会显示在这里。';$('result').classList.add('muted');selected=text.replace(/\r\n?/g,'\n').trim();selectionPage=pageNumber;$('selection').value=selected;$('selectionCount').textContent=selected.length+' 字符';$('noteQuote').textContent=selected||'选中文字后，可连同原文一起保存。';$('aiQuote').textContent=selected||'先在原文中选取一段文字。';current=null;$('saveWord').disabled=true;querySerial++}
function library(){const q=$('paperSearch').value.toLowerCase();$('papers').replaceChildren();$('paperCount').textContent=papers.length;for(const p of papers.filter(p=>p.title.toLowerCase().includes(q))){const b=el('button',undefined,'paper'+(active?.id===p.id?' active':''));b.append(el('span','▤','paperIcon'));const info=el('div');info.append(el('strong',p.title),el('small',`PDF 文献 · 第 ${p.page||1} 页`));b.append(info);b.onclick=safe(()=>open(p));$('papers').append(b)}if(!papers.length)$('papers').append(el('div','还没有文献。导入一篇 PDF，开始你的阅读空间。','emptyLibrary'))}
async function importPapers(){const added=await api.importPdf();papers=await api.library();library();if(added.length)await open(added[0])}
let positionTimer,pendingPosition;
function flushPosition(){clearTimeout(positionTimer);if(!pendingPosition)return;const {id,page}=pendingPosition;pendingPosition=null;api.position(id,page).catch(e=>status('阅读位置保存失败：'+e.message,true))}
function updatePage(n){
 if(!pdf)return;
 pageNumber=n;$('pageNum').value=n;$('pageTotal').textContent='/ '+pdf.numPages;
 $('prev').disabled=n<=1;$('next').disabled=n>=pdf.numPages;
 $('readerStatus').textContent='第 '+n+' / '+pdf.numPages+' 页 · 滚轮连续阅读 · 划选自动翻译';
 if(active){active.page=n;const listed=papers.find(p=>p.id===active.id);if(listed)listed.page=n;library();pendingPosition={id:active.id,page:n};clearTimeout(positionTimer);positionTimer=setTimeout(flushPosition,200)}
}
const continuousReader=new ContinuousReader({container:$('pdfScroll'),viewer:$('textLayer'),
 onPage:updatePage,onScale:scale=>$('zoomLabel').textContent=Math.round(scale*100)+'%',
 onText:(n,count)=>{if(n===pageNumber)$('readerStatus').textContent=count?'第 '+n+' / '+pdf.numPages+' 页 · 滚轮连续阅读 · 划选自动翻译':'第 '+n+' 页没有可选文字，可点击「OCR 本页」识别。'},
 onError:e=>status('页面渲染失败：'+e.message,true)});
window.addEventListener('beforeunload',flushPosition);

async function open(p){const serial=++openSerial;showWords(false);flushPosition();continuousReader.clear();const previousPdf=pdf;pdf=null;if(previousPdf)previousPdf.destroy().catch(()=>{});active=p;preparePaper(p);setSelection('');$('docTitle').textContent=p.title;library();$('welcome').hidden=true;$('pdfPage').hidden=true;$('pdfScroll').hidden=false;$('readerStatus').textContent='正在打开 PDF…';status('正在读取本地文献…');try{const bytes=await api.pdfBytes(p.id);if(serial!==openSerial)return;const task=pdfjs.getDocument({data:bytes,cMapUrl:new URL('./node_modules/pdfjs-dist/cmaps/',import.meta.url).href,cMapPacked:true,standardFontDataUrl:new URL('./node_modules/pdfjs-dist/standard_fonts/',import.meta.url).href,wasmUrl:new URL('./node_modules/pdfjs-dist/wasm/',import.meta.url).href,isEvalSupported:false});task.onPassword=(callback,reason)=>{const password=prompt(reason===1?'此 PDF 已加密，请输入密码':'密码不正确，请重新输入');if(password===null){task.destroy();status('已取消打开加密 PDF',true)}else callback(password)};const loaded=await task.promise;if(serial!==openSerial){loaded.destroy();return}pdf=loaded;identifyPaper(p,loaded);pageNumber=Math.min(p.page||1,pdf.numPages);zoom=0;await renderPage();if(serial!==openSerial)return;await renderNotes();status('已打开。滚轮连续阅读，划选原文后右侧自动翻译。')}catch(e){if(serial!==openSerial)return;$('readerStatus').textContent='打开失败';status('无法打开 PDF：'+e.message,true)}}
async function renderPage(){
 if(!pdf)return;
 $('pdfPage').hidden=false;
 if(continuousReader.document!==pdf){const document=pdf,target=pageNumber;if(!await continuousReader.load(document,{page:target,scale:zoom||'page-width'})||document!==pdf)return}
 else continuousReader.scale(zoom||'page-width');
 updatePage(continuousReader.viewer.currentPageNumber);
 $('zoomLabel').textContent=Math.round(continuousReader.currentScale*100)+'%';
 $('selectionBar').hidden=true;if($('cancelTranslation').hidden)translationBusy(false);
}
async function go(n){if(!pdf)return;setSelection('');continuousReader.go(Math.max(1,Math.min(pdf.numPages,Math.floor(n))));continuousReader.refresh()}
function showResult(r){$('result').replaceChildren();$('result').classList.remove('muted');$('result').append(el('h3',r.q.length<60?r.q:'选文译文'));$('result').append(el('div',r.translation||'翻译暂不可用：'+r.translationError,'translation'));for(const entry of r.dictionary||[]){if(entry.phonetic)$('result').append(el('div',entry.phonetic,'phonetic'));for(const meaning of entry.meanings||[]){const d=el('div',undefined,'meaning');d.append(el('b',meaning.partOfSpeech));for(const x of meaning.definitions.slice(0,3)){d.append(el('p',x.definition));if(x.example)d.append(el('small',x.example))}$('result').append(d)}}if(r.dictionaryError)$('result').append(el('p','词典未返回词条；可以使用 AI 精读解释术语。','muted'))}
function translationBusy(busy){$('translate').disabled=busy;$('cancelTranslation').hidden=!busy;$('translatePage').disabled=busy||!pdf;$('translateDocument').disabled=busy||!pdf}
async function translate(meta={}){
 const q=$('selection').value.trim();
 if(!q){status('请先选中或输入英文。',true);return}
 const request=++querySerial,label=typeof meta.label==='string'?meta.label:'选文';
 const source=active?{paperId:active.id,paperTitle:active.title,page:selectionPage}:{};
 const options=academicOptions(active,q),useModel=!!(options.base&&options.model);
 if(meta.fromDocument)options.context=q.slice(0,6000);
 current=null;$('saveWord').disabled=true;translationBusy(true);tab('translate');
 $('result').textContent='正在翻译选文…';$('result').classList.add('muted');
 let partial='',offset=0;
 try{
  const r=await translateParts(q,{
   maxBytes:useModel?6000:480,isCurrent:()=>request===querySerial,
   query:async part=>{
    const start=offset;offset+=part.length;
    if(!useModel)return api.query(part);
    const context=q.length>6000?q.slice(Math.max(0,start-1000),start+part.length+1000):options.context;
    return {q:part,translation:await api.ai({...options,text:part,context}),domain:options.domain};
   },
   onProgress:({done,total,translations})=>{
    if(request!==querySerial)return;
    partial=translations.join('\n\n');
    if(partial){$('result').textContent=partial;$('result').classList.remove('muted')}
    $('translationProgress').textContent=label+'：'+done+' / '+total+' 段';status('正在翻译'+label+'：'+done+' / '+total+' 段');
   }
  });
  if(!r||request!==querySerial)return;
  current={...r,q,...source};showResult(current);$('saveWord').disabled=false;
  $('translationProgress').textContent=label+'翻译完成'+(meta.notice?' · '+meta.notice:'');status(label+'翻译完成。'+(meta.notice||'专业术语请结合上下文核对。'));
 }catch(e){if(request===querySerial){$('result').textContent=(partial?partial+'\n\n':'')+'翻译失败：'+e.message+'。可点击翻译重试。';$('translationProgress').textContent=partial?'翻译中断 · 已保留完成部分':'翻译失败';status(e.message,true)}}
 finally{if(request===querySerial)translationBusy(false)}
}
$('cancelTranslation').onclick=()=>{querySerial++;translationBusy(false);$('translationProgress').textContent='已停止 · 保留已完成译文';status('已停止后续翻译，已完成的译文保留。')};
async function renderNotes(){const id=active?.id;$('noteList').replaceChildren();if(!id){$('noteCount').textContent='0';return}const notes=await api.notes(id);if(active?.id!==id)return;$('noteCount').textContent=notes.length;for(const n of notes){const card=el('article',undefined,'noteCard');const meta=el('div',undefined,'noteMeta');const jump=el('button','第 '+n.page+' 页');jump.onclick=safe(()=>go(n.page));const del=el('button','删除');del.onclick=safe(async()=>{if(confirm('删除这条笔记？')){await api.deleteNote(n.id);await renderNotes()}});meta.append(jump,del);card.append(meta);if(n.quote)card.append(el('blockquote',n.quote));card.append(el('p',n.text));$('noteList').append(card)}}
function showWords(show){$('selectionBar').hidden=true;$('vocabView').hidden=!show;$('reader').hidden=show;document.querySelector('.readerTools').hidden=show;$('navWords').classList.toggle('active',show);$('navRead').classList.toggle('active',!show);if(show)renderWords();else requestAnimationFrame(()=>continuousReader.refresh())}
async function renderWords(){words=await api.words();const q=$('wordSearch').value.toLowerCase();$('wordList').replaceChildren();for(const w of words.filter(w=>(w.q+' '+(w.note||'')).toLowerCase().includes(q))){const card=el('article',undefined,'wordCard');card.append(el('h3',w.q),el('p',w.translation||''));if(w.note)card.append(el('p',w.note));if(w.paperTitle)card.append(el('p',`${w.paperTitle} · 第 ${w.page} 页`,'privacy'));for(const [label,fn] of [['▷ 朗读',()=>api.speak(w.q,$('rate').value)],['查看释义',()=>{setSelection(w.q);current=w;showResult(w);$('saveWord').disabled=false;tab('translate')}],['删除',async()=>{if(confirm('删除这条收藏？')){await api.remove(w.q);await renderWords()}}]]){const b=el('button',label);b.onclick=safe(fn);card.append(b)}$('wordList').append(card)}if(!words.length)$('wordList').append(el('p','阅读时收藏单词和句子，它们会出现在这里。','muted'))}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.tab));$('import').onclick=safe(importPapers);$('welcomeImport').onclick=safe(importPapers);$('paperSearch').oninput=library;$('prev').onclick=safe(()=>go(pageNumber-1));$('next').onclick=safe(()=>go(pageNumber+1));$('pageNum').onchange=safe(()=>go(Number($('pageNum').value)||1));$('fit').onclick=safe(async()=>{zoom=0;await renderPage()});for(const [id,d] of [['zoomIn',.15],['zoomOut',-.15]])$(id).onclick=safe(async()=>{zoom=Math.max(.3,Math.min(3,(zoom||parseInt($('zoomLabel').textContent)/100||1)+d));await renderPage()});
$('pdfScroll').addEventListener('wheel',event=>{
 if(!event.ctrlKey)return;
 event.preventDefault();
 if(!pdf||continuousReader.document!==pdf||!continuousReader.viewer.pagesCount||!event.deltaY)return;
 const unit=event.deltaMode===1?16:event.deltaMode===2?$('pdfScroll').clientHeight:1;
 const delta=Math.max(-120,Math.min(120,event.deltaY*unit));
 const target=Math.max(.3,Math.min(3,continuousReader.currentScale*Math.exp(-delta*.0015)));
 zoom=continuousReader.zoomAt(target,event.clientX,event.clientY);
 hideSelectionBar();
},{passive:false});
function hideSelectionBar(){$('selectionBar').hidden=true}
function readDocumentSelection(){
 const sel=window.getSelection(),layer=$('textLayer');
 if(!sel||sel.isCollapsed||!layer.contains(sel.anchorNode)||!layer.contains(sel.focusNode)){hideSelectionBar();return}
 const text=sel.toString().replace(/\s*\r?\n\s*/g,' ').trim();
 if(!text){hideSelectionBar();return}
 const changed=text!==selected;
 if(changed){setSelection(text);const start=sel.getRangeAt(0).startContainer;const page=(start.nodeType===Node.ELEMENT_NODE?start:start.parentElement)?.closest('.page[data-page-number]');if(page)selectionPage=Number(page.dataset.pageNumber)}
 const rect=sel.getRangeAt(0).getBoundingClientRect();
 $('selectionBar').hidden=false;
 const bar=$('selectionBar');
 bar.style.left=Math.max(10,Math.min(rect.left,window.innerWidth-bar.offsetWidth-10))+'px';
 bar.style.top=Math.max(10,rect.top-bar.offsetHeight-8)+'px';
 tab('translate');
 if(changed)translate()
}
document.addEventListener('pointerdown',event=>{if(!$('selectionBar').contains(event.target))hideSelectionBar()});
// Keep the PDF selection while a toolbar action receives its click.
$('selectionBar').addEventListener('mousedown',event=>event.preventDefault());
document.addEventListener('mouseup',event=>{if($('textLayer').contains(event.target))readDocumentSelection()});
document.addEventListener('keyup',event=>{if(event.key==='Escape')hideSelectionBar();else if(event.shiftKey&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))readDocumentSelection()});
document.addEventListener('selectionchange',()=>{const sel=window.getSelection();if(!sel||sel.isCollapsed||!$('textLayer').contains(sel.anchorNode)||!$('textLayer').contains(sel.focusNode))hideSelectionBar()});
window.addEventListener('blur',hideSelectionBar);
$('pdfScroll').addEventListener('scroll',hideSelectionBar,{passive:true});$('selection').oninput=()=>setSelection($('selection').value);$('selection').onkeydown=e=>{if(e.ctrlKey&&e.key==='Enter')translate()};$('translate').onclick=translate;$('quickTranslate').onclick=()=>{tab('translate');$('selectionBar').hidden=true;translate()};$('speak').onclick=safe(()=>api.speak($('selection').value,$('rate').value));$('quickSpeak').onclick=safe(()=>{hideSelectionBar();return api.speak(selected,$('rate').value)});$('stop').onclick=safe(()=>api.speak(''));$('rate').oninput=()=>$('rateLabel').textContent=$('rate').value==='0'?'标准':$('rate').value;$('quickNote').onclick=()=>{tab('notes');$('noteText').focus();$('selectionBar').hidden=true};$('saveWord').onclick=safe(async()=>{if(!current)return;await api.save({...current,note:$('wordNote').value});status('已收藏，可在左侧「生词」中复习。')});$('saveNote').onclick=safe(async()=>{if(!active)throw Error('请先打开一篇文献');await api.saveNote({paperId:active.id,page:selectionPage,quote:selected,text:$('noteText').value});$('noteText').value='';await renderNotes();status('笔记已保存，并关联当前文献和页码。')});$('navRead').onclick=()=>showWords(false);$('navWords').onclick=()=>showWords(true);$('wordSearch').oninput=safe(renderWords);$('exportWords').onclick=safe(async()=>{if(await api.exportWords())status('收藏已导出。')});$('settingsBtn').onclick=()=>$('settings').showModal();$('closeSettings').onclick=()=>$('settings').close();$('settingsDone').onclick=()=>$('settings').close();$('runAi').onclick=async()=>{const text=$('selection').value.trim();if(!$('base').value||!$('model').value){$('settings').showModal();status('请先设置接口地址和模型名称。');return}if(!text){status('请先选取英文段落。',true);return}$('runAi').disabled=true;$('aiResult').textContent='正在解析，请稍候…';$('aiResult').classList.add('loading');try{const answer=await api.ai(academicOptions(active,text,'explain'));$('aiResult').textContent=answer;status('精读完成，对应请求时选中的段落。')}catch(e){$('aiResult').textContent=e.message;status('精读请求失败。',true)}finally{$('runAi').disabled=false;$('aiResult').classList.remove('loading')}};
$('translatePage').onclick=()=>translatePdf(false);$('translateDocument').onclick=()=>translatePdf(true);
api.onPaste(q=>{setSelection(q);tab('translate');status('已粘贴剪贴板文字，点击翻译开始。')});api.onNotice(q=>status(q,true));let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(pdf&&!zoom) safe(renderPage)()},250)});papers=await api.library();library();if(papers.length){const recent=[...papers].sort((a,b)=>(b.lastRead||b.addedAt).localeCompare(a.lastRead||a.addedAt))[0];await open(recent)}

$('ocr').onclick=async()=>{if(!pdf){status('请先打开 PDF。',true);return}const paperId=active.id,number=pageNumber;$('ocr').disabled=true;status('正在本机识别英文，不上传页面…');try{const page=await pdf.getPage(number),viewport=page.getViewport({scale:2}),canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);if(canvas.width*canvas.height>24000000)throw Error('页面尺寸过大，暂不支持识别');await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;const text=await api.ocr(canvas.toDataURL('image/png'));if(active?.id!==paperId||pageNumber!==number){status('识别已完成，但文献或页码已变化；请返回原页重新识别。');return}if(!text.trim()){status('没有识别出英文，请检查页面清晰度。',true);return}setSelection(text);tab('translate');status('英文 OCR 完成。结果可编辑；选取需要的句子查询，或用 AI 精读。')}catch(e){status('OCR 失败：'+e.message,true)}finally{$('ocr').disabled=false}};


onDomainChange(()=>{setSelection($('selection').value);if(selected){tab('translate');translate()}});

async function translatePdf(all){
 if(!pdf){status('请先打开 PDF。',true);return}
 const document=pdf,request=++querySerial,first=all?1:pageNumber,last=all?pdf.numPages:pageNumber;
 translationBusy(true);tab('translate');current=null;$('saveWord').disabled=true;$('selectionBar').hidden=true;
 $('result').textContent='正在读取论文文字…';
 try{
  const pages=[],missing=[];
  for(let n=first;n<=last;n++){
   if(request!==querySerial)return;
   $('translationProgress').textContent='正在读取第 '+n+' / '+last+' 页';
   const content=await (await document.getPage(n)).getTextContent();
   if(request!==querySerial)return;
   let text='';for(const item of content.items)if(typeof item.str==='string')text+=item.str+(item.hasEOL?'\n':' ');
   if(text.trim())pages.push(text.trim());else missing.push(n);
  }
  if(!pages.length)throw Error('没有可选文字，请先使用「OCR 本页」识别扫描件，再翻译识别结果。');
  setSelection(pages.join('\n\n'));selectionPage=first;
  await translate({fromDocument:true,label:all?'全文':'本页',notice:missing.length?'第 '+missing.join('、')+' 页没有文字层，已跳过；扫描页需先 OCR。':''});
 }catch(e){if(request===querySerial){$('result').textContent=e.message;status(e.message,true);$('translationProgress').textContent='读取失败'}}
 finally{if(request===querySerial)translationBusy(false)}
}
