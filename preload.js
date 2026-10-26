const {contextBridge,ipcRenderer}=require('electron');
const call=name=>(...args)=>ipcRenderer.invoke(name,...args);
contextBridge.exposeInMainWorld('api',{domainCatalog:call('domain-catalog'),paperDomain:call('paper-domain'),bookCatalog:call('book-catalog'),bookWords:call('book-words'),lexicon:call('lexicon'),learn:call('learn'),learningSummary:call('learning-summary'),ocr:call('ocr'),query:call('query'),ai:call('ai'),words:call('words'),save:call('save'),remove:call('remove'),speak:call('speak'),library:call('library'),importPdf:call('import-pdf'),pdfBytes:call('pdf-bytes'),position:call('paper-position'),notes:call('notes'),saveNote:call('note-save'),deleteNote:call('note-delete'),exportWords:call('export-words'),onPaste:f=>ipcRenderer.on('paste',(_,q)=>f(q)),onNotice:f=>ipcRenderer.on('notice',(_,q)=>f(q))});


