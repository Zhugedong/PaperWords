// Split by UTF-8 bytes, preserving all characters and preferring paragraph,
// sentence and word boundaries. Each part fits the downstream service limit.
export function splitText(text,maxBytes=480){
 if(!Number.isInteger(maxBytes)||maxBytes<4)throw Error('分段大小无效');
 const encoder=new TextEncoder(),chunks=[];
 let rest=String(text);
 while(rest){
  let end=0,bytes=0,boundary=0;
  for(const character of rest){
   const length=encoder.encode(character).length;
   if(bytes+length>maxBytes)break;
   bytes+=length;end+=character.length;
   if(/[\s.!?。！？；;]/u.test(character))boundary=end;
  }
  if(end<rest.length&&boundary>=end*.4)end=boundary;
  chunks.push(rest.slice(0,end));rest=rest.slice(end);
 }
 return chunks;
}

// Only one request is sent at a time. Cancellation discards an in-flight
// response and prevents subsequent requests; it does not erase completed work.
export async function translateParts(text,{maxBytes,query,isCurrent,onProgress}){
 const parts=splitText(text,maxBytes),translations=[];
 let single=null;
 for(let i=0;i<parts.length;i++){
  if(!isCurrent())return null;
  onProgress({done:i,total:parts.length,translations});
  const part=parts[i];
  if(!part.trim()){translations.push(part);continue}
  const result=await query(part);
  if(!isCurrent())return null;
  if(!result.translation?.trim())throw Error(result.translationError||'翻译服务未返回译文');
  translations.push(result.translation);single=result;
  onProgress({done:i+1,total:parts.length,translations});
 }
 return parts.length===1?single:{q:text,translation:translations.join('\n\n')};
}
