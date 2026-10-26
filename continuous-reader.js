import './node_modules/pdfjs-dist/build/pdf.mjs';
import {PDFViewer,EventBus} from './node_modules/pdfjs-dist/web/pdf_viewer.mjs';

// PDF.js owns page placeholders, rendering priority, canvas eviction and scroll
// anchoring. The application only tracks the visible page and reading tools.
export class ContinuousReader {
 constructor({container,viewer,onPage,onScale,onText,onError}){
  this.events=new EventBus();this.generation=0;this.document=null;this.pending=null;
  this.viewer=new PDFViewer({container,viewer,eventBus:this.events,
   textLayerMode:1,annotationMode:0,annotationEditorMode:-1,
   maxCanvasPixels:8000000,enableDetailCanvas:false});
  this.events.on('pagechanging',event=>{if(this.document)onPage(event.pageNumber)});
  this.events.on('scalechanging',event=>{if(this.document)onScale(event.scale)});
  this.events.on('textlayerrendered',event=>{
   if(this.document&&event.source===this.viewer.getPageView(event.pageNumber-1)){
    if(event.error)onError(event.error);else onText(event.pageNumber,event.source.div.querySelector('.textLayer')?.textContent.trim().length||0);
   }
  });
  this.events.on('pagerendered',event=>{
   if(event.error&&this.document&&event.source===this.viewer.getPageView(event.pageNumber-1))onError(event.error);
  });
 }
 clear(){
  this.generation++;this.document=null;
  if(this.pending){this.events.off('pagesinit',this.pending.ready);this.pending.resolve(false);this.pending=null}
  this.viewer.setDocument(null);
 }
 async load(document,{page=1,scale='page-width'}={}){
  this.clear();const generation=this.generation;
  // Surface invalid-page errors to the application's existing error status.
  await document.getPage(1);
  if(generation!==this.generation)return false;
  this.document=document;
  return new Promise(resolve=>{
   const ready=()=>{
    this.events.off('pagesinit',ready);this.pending=null;
    if(generation!==this.generation){resolve(false);return}
    this.viewer.currentScaleValue=scale;
    this.viewer.currentPageNumber=Math.max(1,Math.min(document.numPages,page));
    this.viewer.update();resolve(true);
   };
   this.pending={ready,resolve};this.events.on('pagesinit',ready);
   this.viewer.setDocument(document);
  });
 }
 go(page){if(this.document)this.viewer.currentPageNumber=page}
 scale(value){if(this.document)this.viewer.currentScaleValue=value}
 zoomAt(value,clientX,clientY){
  if(!this.document)return this.currentScale;
  const container=this.viewer.container,rect=container.getBoundingClientRect();
  this.viewer.update();
  this.viewer.updateScale({scaleFactor:value/this.currentScale,drawingDelay:120,
   origin:[clientX-rect.left+container.offsetLeft,clientY-rect.top+container.offsetTop]});
  return this.currentScale;
 }
 refresh(){if(this.document)this.viewer.update()}
 get currentScale(){return this.viewer.currentScale}
}
