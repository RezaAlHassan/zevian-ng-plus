/* Review one match at a time, then explain what the imported data can assess. */
'use strict';
Object.assign(fields,{show_rate:'Show rate',booking_delay_days:'Booking delay',booking_date:'Booking date'});
Object.assign(aliases,{show_rate:['show_rate','show_rate_%','showrate','sit_rate'],booking_delay_days:['booking_delay','booking_delay_days'],booking_date:['booking_date','booked_date','date_booked']});
const importPreviousPrepare=prepare,importPreviousPatterns=patternsScreen,importPreviousBuild=buildPatterns,importPreviousContinueName=v4ContinueMatch;
let importDirectUpload=false;try{importDirectUpload=sessionStorage.getItem('zevian_prototype_direct_upload')==='1'}catch{}
function importToggleDirectUpload(){importDirectUpload=!importDirectUpload;try{sessionStorage.setItem('zevian_prototype_direct_upload',importDirectUpload?'1':'0')}catch{}notify(importDirectUpload?'Prototype: direct upload → summary → findings.':'Prototype: full match and edge-case review.');}
const importPreviousUpload=uploadScreen;
uploadScreen=function(){importPreviousUpload();document.querySelector('#screen h1')?.addEventListener('dblclick',importToggleDirectUpload)};
const importPreviousRender=render;
render=function(...args){importPreviousRender(...args);if(state.upload?.review?.direct&&$('steps').children[1])$('steps').children[1].textContent='Data summary'};
document.addEventListener('keydown',e=>{if(mode==='upload'&&e.altKey&&e.shiftKey&&e.code==='KeyS'){e.preventDefault();importToggleDirectUpload()}});
function importReview(){return state.upload.review||(state.upload.review={version:1,phase:'columns',columnIndex:0,excludedRows:[],duplicateCount:0,resolvedDuplicates:[],fallbackRep:'',fallbackPeriod:'',direct:importDirectUpload&&!state.upload.manual})}
function importHeader(description){return v4Header(state.upload?.review?.direct&&state.upload.review.phase==='summary'?'Data summary':'Review matches',description,state.upload?.file||'')}
function importError(message){const target=$('importError');if(target){target.innerHTML='<p class="error">'+esc(message)+'</p>';target.focus()}}
function importOption(value,label,selected,detail=''){return '<button type="button" class="match-option" data-import-choice="'+esc(value)+'" aria-pressed="'+selected+'"><span>'+esc(label)+'</span><small>'+esc(detail)+(selected?' '+v4Icon('check')+' Linked':'')+'</small></button>'}
prepare=function(...args){importPreviousPrepare(...args);importReview();persist()};
mappingScreen=function(){
 if(!state.upload)return uploadScreen();const review=importReview();if(v4Preview&&!review.direct)return v4PreviewMatches();
 if(review.direct&&!review.autoMatched){review.autoMatched=true;state.mapping.forEach(m=>m.confirmed=true);review.columnIndex=state.mapping.length;return importBuildRecords()}
 if(review.phase==='details'&&review.detail)return importRequiredDetail(review.detail.type,review.detail.rowIndex);
 if(review.phase==='duplicates')return importBuildRecords();review.phase='columns';
 const index=Math.min(review.columnIndex||0,Math.max(0,state.mapping.length-1)),match=state.mapping[index];review.columnIndex=index;if(!match)return importBuildRecords();
 const suggestions=[match.field,...(match.field==='custom'?['ignore']:['custom','ignore'])].filter((v,i,a)=>a.indexOf(v)===i);
 const label=field=>field==='custom'?'Keep as a custom KPI':field==='ignore'?'Do not import this column':fields[field]||field;
 const sample=state.rows.map(row=>row[index]).find(value=>String(value??'').trim());
 render(importHeader('Review each match, then check what your data can assess.')+'<div class="match-panel"><div class="match-meta"><span>Match '+(index+1)+' of '+state.mapping.length+'</span><button class="link-btn" data-action="importSkipColumn">Skip this column →</button></div><h2>What does “'+esc(match.source)+'” represent?</h2><p>Sample value: '+esc(sample??'No value provided')+'</p><div class="match-options">'+suggestions.map(field=>importOption(field,label(field),field===match.field)).join('')+'</div><div class="match-search"><label for="importField">Choose another field</label><select id="importField" aria-label="Import column '+esc(match.source)+'">'+Object.entries({...fields,custom:'Custom KPI',ignore:'Do not import'}).map(([value,text])=>'<option value="'+value+'" '+(value===match.field?'selected':'')+'>'+esc(text)+'</option>').join('')+'</select></div><div id="importError" role="alert" tabindex="-1"></div></div><div class="flow-footer">'+button('Go back','importBackColumn')+button('Continue →','importConfirmColumn',true)+'</div>','mapping',1);
 $('importField').onchange=()=>importSelectField($('importField').value);document.querySelectorAll('[data-import-choice]').forEach(el=>el.onclick=()=>importSelectField(el.dataset.importChoice));persist();
};
function importSelectField(value){const review=importReview(),match=state.mapping[review.columnIndex];if(match.field!==value){review.excludedRows=[];review.resolvedDuplicates=[];review.duplicateCount=0;delete state.upload.nameMatches}match.field=value;match.confirmed=false;mappingScreen()}
function importConfirmColumn(skip=false){
 const review=importReview(),match=state.mapping[review.columnIndex];if(skip)match.field='ignore';
 if(!['custom','ignore'].includes(match.field)&&state.mapping.some((m,i)=>i!==review.columnIndex&&m.confirmed&&m.field===match.field))return importError('This field is already linked to another column. Choose a different field.');
 match.confirmed=true;review.columnIndex++;persist();if(review.columnIndex<state.mapping.length)mappingScreen();else importBuildRecords();
}
function importDate(value){const text=String(value??'').trim();if(!text)return null;const stamp=Date.parse(text);if(!Number.isFinite(stamp))return null;return new Date(stamp).toISOString().slice(0,10)}
function importRequiredDetail(type,rowIndex=null){
 const review=importReview();review.phase='details';review.detail={type,rowIndex};persist();
 const period=type==='period',question=period?(rowIndex===null?'Which reporting period does this file cover?':'Which reporting period does row '+(rowIndex+2)+' cover?'):(rowIndex===null?'Which employee do these rows belong to?':'Which employee does row '+(rowIndex+2)+' belong to?');
 render(importHeader('A required detail is missing. Resolve it here to continue.')+'<section class="match-panel"><div class="match-meta"><span>Required detail</span></div><h2>'+question+'</h2><p>'+(rowIndex===null?'This value will apply to every row in this file. If rows cover different '+(period?'periods':'employees')+', go back and match the correct column.':'Add a valid '+(period?'reporting date':'employee name')+' for this row.')+'</p><form id="importDetailForm"><label for="importDetailValue">'+(period?'Reporting date':'Employee name')+'</label><input id="importDetailValue" type="'+(period?'date':'text')+'" required value="'+esc(rowIndex===null?(period?review.fallbackPeriod:review.fallbackRep):'')+'"><div id="importError" role="alert" tabindex="-1"></div><div class="flow-footer">'+button('Go back','importEditColumns')+'<button type="submit" class="btn primary">Continue →</button></div></form></section>','mapping',1);
 $('importDetailForm').onsubmit=e=>{e.preventDefault();const value=$('importDetailValue').value.trim();if(!value||(period&&!importDate(value)))return importError('Add a valid '+(period?'reporting date':'employee name')+'.');if(rowIndex===null)review[period?'fallbackPeriod':'fallbackRep']=value;else{const index=state.mapping.findIndex(m=>m.field===type);state.rows[rowIndex][index]=value}persist();importBuildRecords()};
}
function importBuildRecords(){
 const review=importReview(),repIndex=state.mapping.findIndex(m=>m.field==='rep'),periodIndex=state.mapping.findIndex(m=>m.field==='period');
 if(repIndex<0&&!review.fallbackRep)return importRequiredDetail('rep');if(periodIndex<0&&!review.fallbackPeriod)return importRequiredDetail('period');
 const metrics=state.mapping.map((m,index)=>({key:m.field==='custom'?m.source:m.field,index})).filter(m=>!['rep','period','ignore','booking_date'].includes(m.key));
 const records=[];for(let index=0;index<state.rows.length;index++){
  if(review.excludedRows.includes(index))continue;const row=state.rows[index],rep=String(repIndex<0?review.fallbackRep:row[repIndex]??'').trim(),period=importDate(periodIndex<0?review.fallbackPeriod:row[periodIndex]);
  if(!rep)return importRequiredDetail('rep',index);if(!period)return importRequiredDetail('period',index);
  const values=Object.fromEntries(metrics.map(m=>[m.key,number(row[m.index])]));records.push({rep,period,metrics:values,sourceRow:index,uploadId:state.upload.id});
 }
 const groups=new Map();for(const record of records){const key=JSON.stringify([record.rep,record.period]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(record)}
 const duplicateGroups=[...groups.values()].filter(group=>group.length>1);review.duplicateCount=review.excludedRows.length+duplicateGroups.reduce((sum,group)=>sum+group.length-1,0);
 if(duplicateGroups.length)return importDuplicateScreen(duplicateGroups[0]);
 state.records=records;state.upload.mappingStatus='confirmed';review.phase='names';buildPatterns();persist();patternsScreen();
}
function importDuplicateScreen(group){
 const review=importReview();review.phase='duplicates';review.duplicateRows=group.map(r=>r.sourceRow);review.duplicateSelection=null;persist();
 render(importHeader('Review duplicate rows before comparing performance.')+'<section class="match-panel"><div class="match-meta"><span>Duplicate records</span></div><h2>Which record should be kept for '+esc(group[0].rep)+'?</h2><p>'+group.length+' rows cover '+esc(formatDate(group[0].period))+'. Keep one record for this employee and period.</p><div class="match-options">'+group.map(r=>importOption(String(r.sourceRow),'Keep row '+(r.sourceRow+2),false,Object.entries(r.metrics).map(([key,value])=>(fields[key]||key)+': '+(value===null?'missing':value)).join(' · '))).join('')+'</div><div id="importError" role="alert" tabindex="-1"></div></section><div class="flow-footer">'+button('Go back','importEditColumns')+'<button class="btn primary" id="importDuplicateContinue" data-action="importKeepDuplicate" disabled>Continue →</button></div>','mapping',1);
 document.querySelectorAll('[data-import-choice]').forEach(el=>el.onclick=()=>{review.duplicateSelection=Number(el.dataset.importChoice);document.querySelectorAll('[data-import-choice]').forEach(item=>item.setAttribute('aria-pressed',String(item===el)));$('importDuplicateContinue').disabled=false});
}
function importKeepDuplicate(){const review=importReview();if(review.duplicateSelection===null)return;const removed=review.duplicateRows.filter(index=>index!==review.duplicateSelection);review.excludedRows.push(...removed);review.resolvedDuplicates.push({kept:review.duplicateSelection,excluded:removed});persist();importBuildRecords()}
v4ContinueMatch=function(skip=false){const match=state.upload.nameMatches?.find(m=>!m.done);if(match)match.skipped=skip;importPreviousContinueName(skip)};
buildPatterns=function(){
 const skipped=new Set((state.upload?.nameMatches||[]).filter(m=>m.skipped).map(m=>m.source)),records=state.records;state.records=records.filter(r=>!skipped.has(r.rep));
 try{importPreviousBuild()}finally{state.records=records}
};
function importAssessment(){
 const review=importReview(),skipped=new Set((state.upload.nameMatches||[]).filter(m=>m.skipped).map(m=>m.source)),records=state.records.filter(r=>!skipped.has(r.rep));
 const latest=records.map(r=>r.period).sort().at(-1),reps=[...new Set(records.map(r=>r.rep))];
 const keys=[...new Set(state.mapping.filter(m=>!['rep','period','booking_date','ignore'].includes(m.field)).map(m=>m.field==='custom'?m.source:m.field))];
 const kpis=keys.map(key=>{let assessable=0,limited=0,missing=0,noHistory=0;for(const rep of reps){const rows=records.filter(r=>r.rep===rep).sort((a,b)=>a.period.localeCompare(b.period)),current=rows.at(-1);if(current?.period!==latest)continue;const previous=rows.slice(0,-1).slice(-4).map(r=>r.metrics[key]).filter(v=>v!==null&&v!==undefined);if(current.metrics[key]===null||current.metrics[key]===undefined){missing++;continue}if(!previous.length||avg(previous)===0){noHistory++;continue}assessable++;if(previous.length<4)limited++}return {key,label:fields[key]||key,assessable,limited,missing,noHistory}});
 const assessable=kpis.filter(k=>k.assessable>0),limits=[];
 const missingLatest=reps.filter(rep=>!records.some(r=>r.rep===rep&&r.period===latest)).length;if(missingLatest)limits.push(plural(missingLatest,'employee')+' missing from the latest reporting period.');
 if(skipped.size)limits.push(plural(skipped.size,'employee match')+' skipped. These employees are excluded from assessment.');
 const limited=kpis.filter(k=>k.limited>0);if(limited.length)limits.push('Some comparisons use fewer than four earlier periods.');
 for(const kpi of kpis){if(!kpi.assessable)limits.push(kpi.label+': '+(kpi.noHistory?'not enough history to assess change.':'no usable values for the latest reporting period.'));else if(kpi.missing||kpi.noHistory)limits.push(kpi.label+': only '+plural(kpi.assessable,'employee')+' can be compared.');}
 const bookingDates=state.mapping.some(m=>m.field==='booking_date'),delay=kpis.find(k=>k.key==='booking_delay_days'),show=kpis.find(k=>k.key==='show_rate');
 if(show?.assessable&&!delay?.assessable)limits.unshift('Show rate can be compared. '+(bookingDates?'A booking delay KPI is missing':'Booking dates are missing')+', so booking delay cannot be checked.');
 const status=assessable.length?(limits.length?'limited':'ready'):'empty';
 return {status,employees:reps.length,skipped:skipped.size,kpis,assessable:assessable.length,duplicates:review.duplicateCount||0,excluded:review.excludedRows.length,rows:records.length,latest,limits};
}
function importDataSummary(){
 const review=importReview();review.phase='summary';const summary=importAssessment();review.summary=summary;persist();
 const title=summary.status==='ready'?'Your data is ready':summary.status==='limited'?'Your data is usable with limits':'More data is needed to produce findings.';
 render(importHeader('Matching complete. Check your data before viewing findings.')+'<section class="data-readiness '+summary.status+'"><span class="readiness-label">'+({ready:'Ready',limited:'Usable with limits',empty:'Nothing can be assessed'})[summary.status]+'</span><h2>'+title+'</h2><p>'+(summary.status==='empty'?'Add an earlier reporting period and usable KPI values to compare performance.':plural(summary.assessable,'KPI')+' can be compared for '+esc(formatDate(summary.latest))+'.')+'</p></section><dl class="import-summary"><div><dt>Employees matched</dt><dd>'+summary.employees+'</dd></div><div><dt>KPIs identified</dt><dd>'+summary.kpis.length+'</dd></div><div><dt>Duplicate rows found</dt><dd>'+summary.duplicates+'</dd><small>'+summary.excluded+' excluded after review</small></div><div><dt>Rows ready</dt><dd>'+summary.rows+'</dd></div></dl>'+(summary.limits.length?'<section class="import-limits"><h2>What this data can assess</h2><ul>'+summary.limits.map(text=>'<li>'+esc(text)+'</li>').join('')+'</ul></section>':'')+'<section class="kpi-readiness"><h2>KPIs identified</h2>'+(!summary.kpis.length?'<p>No KPI columns were identified.</p>':'<ul>'+summary.kpis.map(k=>'<li><span>'+esc(k.label)+'</span><span class="kpi-result '+(k.assessable?'assessable':'unavailable')+'">'+(k.assessable?'Can compare'+(k.limited?' · limited history':''):k.noHistory?'Not enough history':'No usable values')+'</span></li>').join('')+'</ul>')+'</section><div class="flow-footer">'+button('Review matches','importEditColumns')+button(summary.assessable?'View findings':'Add data',summary.assessable?'importViewFindings':'upload',true)+'</div>','mapping',1);
}
patternsScreen=function(){
 if((!v4Preview||state.upload?.review?.direct)&&state.upload?.review&&state.upload.review.phase!=='findings'){
  if(state.upload.mappingStatus!=='confirmed')return mappingScreen();if(v4NeedsNameReview())return;return importDataSummary();
 }
 importPreviousPatterns();if(!v4Preview&&state.upload?.review?.summary?.assessable&&!state.patterns.length){const empty=document.querySelector('.finding-scroll>.muted');if(empty)empty.textContent='No significant performance changes were found in the assessable KPIs.'}
};
function importViewFindings(){const review=importReview();if(!importAssessment().assessable)return importDataSummary();review.phase='findings';buildPatterns();persist();patternsScreen()}
function importEditColumns(){const review=importReview();review.direct=false;review.phase='columns';review.columnIndex=0;state.mapping.forEach(m=>m.confirmed=false);mappingScreen()}
Object.assign(actions,{upload:uploadScreen,mapping:mappingScreen,patterns:patternsScreen,resume:weeklyReviewScreen,detect:importBuildRecords,importConfirmColumn:()=>importConfirmColumn(),importSkipColumn:()=>importConfirmColumn(true),importBackColumn:()=>{const review=importReview();if(review.columnIndex>0){review.columnIndex--;mappingScreen()}else uploadScreen()},importEditColumns,importKeepDuplicate,importViewFindings});
document.addEventListener('click',e=>{const target=e.target.closest('[data-action]');if(target?.dataset.action==='mapping'&&state.upload?.review?.phase==='findings')importEditColumns()});
v4Shell();
if(v4Preview){const screen=v4PreviewState();if(screen==='upload')uploadScreen();else if(screen==='match')v4PreviewMatches();else {patternsScreen();if(screen==='drawer'||screen==='context')openFindingDrawer('figma-emily')}}else {migrateSavedDemo();weeklyReviewScreen()}
