const $=id=>document.getElementById(id);
let paper=null,serial=0,change=()=>{};
const catalog=api.domainCatalog();
function display(){
 $('paperDomain').value=paper?.domain||'general';
 $('paperDomain').disabled=!paper;
 $('detectDomain').disabled=!paper;
 $('domainStatus').textContent=!paper?'打开论文后自动识别，也可手动选择。':paper.domainMode==='manual'?'手动选择 · 已为当前论文保存':`${paper.domainConfidence||'正在读取论文背景…'}${paper.domainEvidence?.length?' · '+paper.domainEvidence.join('、'):''}`;
 updateTranslationMode();
}
export function updateTranslationMode(){
 $('translationMode').textContent=$('base').value.trim()&&$('model').value.trim()?'学术翻译 · 使用所选领域与论文上下文':'基础翻译 · 配置模型可结合领域与上下文';
}
export function onDomainChange(fn){change=fn}
export function preparePaper(p){serial++;paper=p;display()}
export async function identifyPaper(p,document){
 const request=++serial;paper=p;display();
 try{
  const options=await catalog;
  if(request!==serial)return;
  if($('paperDomain').options.length<2){$('paperDomain').replaceChildren(...options.map(d=>{const option=new Option(d.name,d.id);return option}));display()}
  let text='';
  for(let i=1;i<=Math.min(2,document.numPages);i++){
   const page=await document.getPage(i),content=await page.getTextContent();
   text+=content.items.map(x=>x.str||'').join(' ')+'\n';
  }
  if(request!==serial)return;
  // The backend preserves any manual choice made while extraction is running.
  const saved=await api.paperDomain(p.id,{text});
  if(request!==serial)return;
  const previous=p.domain;Object.assign(p,saved);paper=p;display();
  if(previous!==p.domain&&$('selection').value.trim())change();
 }catch(e){if(request===serial)$('domainStatus').textContent='自动识别暂不可用，可手动选择。'+e.message}
}
export function academicOptions(active,text,mode='translate'){
 const selection=window.getSelection();
 const start=selection&&!selection.isCollapsed?selection.getRangeAt(0).startContainer:null;
 const selectedPage=(start?.nodeType===Node.ELEMENT_NODE?start:start?.parentElement)?.closest('.page[data-page-number]');
 const scope=selectedPage||document.querySelector('#textLayer .page[data-page-number="'+$('pageNum').value+'"]')||$('textLayer');
 const full=Array.from(scope.querySelectorAll('.textLayer span')).map(span=>span.textContent).join(' ').replace(/\s+/g,' ');
 const index=full.indexOf(text);
 const context=index<0?full.slice(0,5000):full.slice(Math.max(0,index-1800),index+text.length+1800);
 return {base:$('base').value.trim(),key:$('key').value.trim(),model:$('model').value.trim(),text,domain:active?.domain||'general',title:active?.title||'',background:active?.background||'',context:active?context:'',mode};
}
$('paperDomain').onchange=async()=>{
 if(!paper)return;
 const target=paper,id=$('paperDomain').value;
 try{const saved=await api.paperDomain(target.id,{mode:'manual',domain:id});if(paper!==target)return;Object.assign(target,saved);display();change()}
 catch(e){display();$('domainStatus').textContent='领域保存失败：'+e.message}
};
$('detectDomain').onclick=async()=>{
 if(!paper)return;const target=paper;
 $('detectDomain').disabled=true;
 try{const saved=await api.paperDomain(target.id,{text:target.background||'',reset:true});if(paper!==target)return;Object.assign(target,saved);display();change()}
 catch(e){if(paper===target){display();$('domainStatus').textContent='识别失败：'+e.message}}
};
for(const id of ['base','model'])$(id).addEventListener('input',updateTranslationMode);
