/* Current drawer: Figma 4250:5642, 4258:10256, 4258:11856, 4258:12001. */
'use strict';
const reviewViews = new Map();
const reviewDS = window.ZevianInteractions;
const reviewAmount=(e,value)=>Number.isFinite(value)?v4MetricAmount(e,value):null;
function reviewView(id) {
  if (!reviewViews.has(id)) reviewViews.set(id,{cause:false,context:false,records:false,expanded:false,scroll:0,draft:null,focus:null});
  return reviewViews.get(id);
}
function reviewObservation(p,m,o) {
  const metric=o.metric||Object.keys(fields).find(key=>o.text.toLowerCase().startsWith(fields[key].toLowerCase()))||(o.evidence==='volume'?(p.evidence.some(e=>e.metric==='emails')?'emails':'calls'):null);
  const e=p.evidence.find(e=>e.metric===metric);
  let text=o.text;
  if(o.kind==='Observed'&&e&&Number.isFinite(e.baseline)&&Number.isFinite(e.value)&&Number.isFinite(e.change)){
    const label=fields[e.metric]||e.metric, values=reviewAmount(e,e.baseline)+' to '+reviewAmount(e,e.value);
    if(e.value===e.baseline)text=label+' stayed stable ('+values+').';
    else if(e.metric.endsWith('_rate'))text=label+' '+(e.change<0?'declined':'increased')+' by '+fmt(Math.abs(e.value-e.baseline))+' percentage points ('+values+').';
    else text=label+' '+(e.change<0?'declined':'increased')+' '+fmt(Math.abs(e.change))+'% ('+values+').';
  }
  const categories={calls:'Activity',emails:'Activity',connects:'Activity',connect_rate:'Lead quality',reply_rate:'Messaging',meetings_booked:'Conversion',meetings_held:'Attendance',opportunities:'Qualification',pipeline:'Pipeline',revenue:'Deal timing'};
  const category=o.category||(o.evidence==='leads'?'Lead quality':o.evidence==='messages'?'Messaging':o.evidence==='territory'?'Territory':o.evidence==='peer'?'Peer comparison':categories[metric])||(o.kind==='Possible link'?'Possible link':'Evidence');
  return {category,scope:o.scope||m.population||p.rep,text};
}
function reviewModel(p) {
  const m=investigationModel(p), explicit=p.review;
  if(explicit)return explicit;
  const observations=(m.observations||[]).map(o=>({...o,...reviewObservation(p,m,o)}));
  return {
    title:m.title, risk:p.type==='pipeline'||p.type==='meeting'?'Pipeline risk':'Performance risk',
    changed:observations.filter(o=>o.kind==='Observed').map(o=>o.text).join(' ')||'No supporting change was found in the available records.',
    cause:m.missing?.length?'The available evidence does not show why performance changed.':(observations.find(o=>o.kind==='Possible link')?.text||'The contribution of these changes is not yet clear. Cause unconfirmed.'),
    causes:observations.map(o=>({kind:o.category,scope:o.scope,text:o.text})),
    messages:[],next:v4ManagerInvestigation(p)?.next||m.next,
    records:p.evidence.map(e=>({name:fields[e.metric]||e.metric,baseline:reviewAmount(e,e.baseline),previous:reviewAmount(e,e.previous),current:reviewAmount(e,e.value)})),
    missing:m.missing||[],source:m.source,limits:m.limitations||[]
  };
}
function reviewMessages(messages, label = false) {
  return messages.length?'<div class="review-message-evidence">'+(label?'<span class="cause-tag messaging">Messaging</span>':'')+'<div class="review-message-list">'+messages.map(message=>'<article class="message-card"><p>'+esc(message.text)+'</p><small>'+esc([message.author,message.date,message.channel].filter(Boolean).join(' · '))+'</small></article>').join('')+'</div></div>':'';
}
function reviewCause(p,m) {
  const items=m.causes.map(c=>'<div class="cause-item"><div class="cause-heading"><span class="cause-tag '+esc(c.kind.toLowerCase().replace(/\s+/g,'-'))+'">'+esc(c.kind)+'</span>'+(c.scope?'<span class="cause-scope">'+esc(c.scope)+'</span>':'')+'</div><p>'+esc(c.text)+'</p></div>').join('');
  return '<section class="review-section"><h3>'+(m.causes.length+(m.messages.length?1:0)>1?'Possible causes':'Cause')+'</h3><p>'+esc(m.cause)+'</p>'+reviewDS.disclosure('cause','See details','<div class="cause-items">'+items+reviewMessages(m.messages,m.causes.length>0)+(items||m.messages.length?'':'<p class="review-empty">No related cause evidence is available.</p>')+'</div>'+(m.missing.length?'<ul class="comparison-limits">'+m.missing.map(s=>'<li>'+esc(s)+'</li>').join(''):'')+'<button class="review-feedback" data-action="reviewFeedback:'+p.id+'">'+(m.messages.length>1?'Not relevant?':'Not relevant? Send us a report →')+'</button>',reviewView(p.id).cause)+'</section>';
}
function reviewContext(p) {
  const manager=p.contexts.some(c=>(c.source||'manager')==='manager'&&c.relevance!=='ignored');
  const notes=p.contexts.map(c=>v4Notes({...p,contexts:[c]}).replace('Added by you',esc(c.designAuthor||'Added by you'))).join(''), sent=p.contextRequest?.status==='sent';
  return reviewDS.disclosure('context','Anything changed outside the data?',notes+'<div class="actions">'+reviewDS.button(manager?'Edit context':'Add context','v4Edit:'+p.id)+reviewDS.button(sent?'Request sent':'Request Employee Context','v4Request:'+p.id,{disabled:sent})+'</div><div id="drawerContextEditor" class="hidden"></div><div id="drawerRequest" class="hidden"></div>',reviewView(p.id).context);
}
function reviewRecords(m) {
  const value=v=>v==null||v===''?'—':esc(v);
  return (m.records.length?'<div class="evidence-table-scroll"><table class="review-source-table"><thead><tr><th>Metric</th><th>Baseline</th><th>Previous</th><th>Current</th></tr></thead><tbody>'+m.records.map(r=>'<tr><td>'+esc(r.name)+'</td><td>'+value(r.baseline)+'</td><td>'+value(r.previous)+'</td><td>'+value(r.current)+'</td></tr>').join('')+'</tbody></table></div>':'<p class="review-empty">Source records unavailable.</p>')+(m.source?'<p class="review-source-note">'+esc(m.source)+'</p>':'')+(m.limits.length?'<ul class="comparison-limits review-source-note">'+m.limits.map(s=>'<li>'+esc(s)+'</li>').join(''):'');
}
function reviewRemember() {
  if(!selected||!$('findingDrawer'))return;
  const view=reviewView(selected.id), drawer=document.querySelector('.review-drawer');if(!drawer)return;
  view.scroll=drawer.querySelector('.drawer-body').scrollTop;
  view.expanded=drawer.classList.contains('expanded');
  drawer.querySelectorAll('[data-disclosure]').forEach(el=>view[el.dataset.disclosure]=el.open);
  if(!view.saving&&$('drawerNote')&&$('drawerContextEditor').getClientRects().length)view.draft=$('drawerNote').value;
}
openFindingDrawer=function(id) {
  if(!new URLSearchParams(location.search).has('drawer-variant'))return findingDesignOpen(id);
  const p=state.patterns.find(p=>p.id===id);if(!p)return;
  const existing=$('findingDrawer');reviewRemember();
  if(!existing)v4DrawerOrigin=document.activeElement;
  const focused=existing?.contains(document.activeElement)?document.activeElement.closest('[data-action]')?.dataset.action:null;
  existing?.remove();selected=p;
  const m=reviewModel(p),v=reviewView(id),priority=p.designPriority||findingPriority(p),change=Number.isFinite(p.signal.change)?pct(p.signal.change):'Change unavailable';
  v.saving=false;
  document.body.insertAdjacentHTML('beforeend','<div class="drawer-layer" id="findingDrawer"><button class="drawer-backdrop" data-action="closeDrawer" aria-label="Close finding overlay" tabindex="-1"></button><aside class="finding-drawer compact-drawer review-drawer '+(v.expanded?'expanded ':'')+(existing?'is-updating':'')+'" role="dialog" aria-modal="true" aria-labelledby="drawerTitle"><div class="drawer-tools"><button class="drawer-close" data-action="closeDrawer" aria-label="Close finding details"><img src="assets/figma/review-collapse.svg" alt=""></button><button data-action="reviewExpand:'+id+'" aria-label="'+(v.expanded?'Collapse':'Expand')+' finding details" aria-expanded="'+v.expanded+'"><img src="assets/figma/review-expand.svg" alt=""></button></div><div class="drawer-body"><div class="review-intro"><div class="review-badges"><span class="priority '+esc(priority.toLowerCase())+'">'+esc(priority)+' Priority</span><span class="review-risk">'+esc(m.risk)+'</span></div><h2 id="drawerTitle">'+esc(m.title)+'</h2><p class="review-change">'+esc(change)+' compared with '+p.signal.periods+' prior weeks · '+(p.signal.change<0?'Declined':'Changed')+' from '+esc(v4FindingValue(p.signal,p.signal.baseline))+' → '+esc(v4FindingValue(p.signal,p.signal.value))+'</p><p class="review-date">'+esc(p.designPeriod||formatDate(p.period))+'</p></div><section class="review-section"><h3>What changed</h3><p>'+esc(m.changed)+'</p></section>'+reviewCause(p,m)+'<section class="review-section review-context"><h3>Compare next</h3><p>'+esc(m.next||'Add more evidence before comparing results.')+'</p>'+reviewContext(p)+'</section><section class="review-section review-decisions"><h3>Decision <span>Optional</span></h3><div class="actions">'+reviewDS.button('Mark reviewed','reviewMark:'+id,{icon:'review-check',pressed:p.investigationDecision?.type==='reviewed'})+reviewDS.button('Dismiss','reviewDismiss:'+id,{icon:'review-dismiss'})+'</div>'+(p.investigationDecision?'<p class="saved-investigation-decision" role="status">'+esc(p.investigationDecision.label)+'</p>':'')+'</section><div class="review-records">'+reviewDS.disclosure('records','Source records',reviewRecords(m),v.records)+'</div></div></aside></div>');
  document.body.classList.add('drawer-open');
  document.querySelectorAll('.finding-row').forEach(row=>row.setAttribute('aria-selected',String(row.id==='finding-'+id)));
  const body=document.querySelector('.review-drawer .drawer-body');body.scrollTop=v.scroll;
  document.querySelectorAll('[data-disclosure]').forEach(el=>el.addEventListener('toggle',()=>v[el.dataset.disclosure]=el.open));
  if(v.draft!==null){v4EditContext(id);$('drawerNote').value=v.draft;body.scrollTop=v.scroll;}
  if(v.focus||focused)reviewDS.focusAction(v.focus||focused);else document.querySelector('.drawer-close').focus({preventScroll:true});
  v.focus=null;
};
const reviewClosePrevious=closeFindingDrawer;
closeFindingDrawer=function(restore=true){reviewRemember();reviewClosePrevious(restore);document.querySelectorAll('.finding-row').forEach(row=>row.removeAttribute('aria-selected'));};
const reviewEditPrevious=v4EditContext;
v4EditContext=function(id,source='manager'){
  reviewView(id).context=true;
  const details=document.querySelector('[data-disclosure="context"]');if(details)details.open=true;
  reviewEditPrevious(id,source);
  const textarea=$('drawerNote'),view=reviewView(id);
  if(view.draft!==null)textarea.value=view.draft;
  textarea.addEventListener('input',()=>view.draft=textarea.value);
  $('drawerContextForm').addEventListener('submit',()=>{if(textarea.value.trim()){view.saving=true;view.draft=null;view.focus='v4Edit:'+id;}},true);
};
function reviewFeedback(id) {
  const p=state.patterns.find(p=>p.id===id);if(!p||$('reviewFeedbackDialog'))return;
  const origin=document.activeElement,dialog=document.createElement('dialog');dialog.id='reviewFeedbackDialog';dialog.className='review-feedback-dialog';dialog.setAttribute('aria-labelledby','reviewFeedbackTitle');
  dialog.innerHTML='<form><h2 id="reviewFeedbackTitle">Report unrelated evidence</h2><p>Describe what does not fit this finding. This prototype saves the report in this browser.</p><label for="reviewFeedbackText">What is not relevant?</label><textarea id="reviewFeedbackText" required></textarea><div class="actions"><button type="button" class="btn" id="reviewFeedbackCancel">Cancel</button><button type="submit" class="btn primary">Save report</button></div></form>';
  document.body.append(dialog);dialog.addEventListener('keydown',e=>e.stopPropagation());
  dialog.addEventListener('close',()=>{dialog.remove();if(origin.isConnected)origin.focus();});
  $('reviewFeedbackCancel').onclick=()=>dialog.close();
  dialog.querySelector('form').onsubmit=e=>{e.preventDefault();const text=$('reviewFeedbackText').value.trim();if(!text)return;(p.evidenceReports||=[]).push({id:crypto.randomUUID(),text,date:new Date().toISOString()});record(p,'Unrelated evidence reported',text);persist();dialog.close();notify('Report saved in this browser.');};
  dialog.showModal();
}
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-action]');if(!el)return;
  const [action,id]=el.dataset.action.split(':');
  if(action==='v4CancelContext'&&selected){reviewView(selected.id).draft=null;reviewDS.focusAction('v4Edit:'+selected.id);}
  if(action==='v4Request')reviewRemember();
  if(!action.startsWith('review'))return;
  const p=state.patterns.find(p=>p.id===id);if(!p)return;
  if(action==='reviewExpand'){
    const view=reviewView(id);view.expanded=!view.expanded;document.querySelector('.review-drawer').classList.toggle('expanded',view.expanded);el.setAttribute('aria-expanded',view.expanded);el.setAttribute('aria-label',(view.expanded?'Collapse':'Expand')+' finding details');
  }else if(action==='reviewFeedback')reviewFeedback(id);
  else if(action==='reviewMark'||action==='reviewDismiss'){
    if(action==='reviewMark'&&p.investigationDecision?.type==='reviewed')return;
    reviewRemember();const type=action==='reviewMark'?'reviewed':'dismissed';
    p.status=type==='reviewed'?'explained':'dismissed';p.decisionDate=new Date().toISOString();p.investigationDecision={type,label:type==='reviewed'?'Reviewed':'Dismissed',text:'',date:p.decisionDate};p.diagnosis=buildDiagnosis(p);record(p,type==='reviewed'?'Finding reviewed':'Finding dismissed');persist();
    if(type==='dismissed')closeFindingDrawer(false);
    const originAction=v4DrawerOrigin?.dataset.action,originTag=v4DrawerOrigin?.tagName,originRow=v4DrawerOrigin?.closest('.finding-row')?.id;
    patternsScreen();v4DrawerOrigin=[...document.querySelectorAll('[data-action]')].find(x=>x.dataset.action===originAction&&x.tagName===originTag)||(originRow?$(originRow):null);
    v4DrawerOrigin?.focus({preventScroll:true});
    if(type==='reviewed'){reviewView(id).focus=action+':'+id;openFindingDrawer(id);}
    notify(p.investigationDecision.label+'.');
  }
},true);
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape'||!$('findingDrawer')||document.querySelector('dialog[open]'))return;
  if($('drawerContextEditor')?.getClientRects().length){e.preventDefault();e.stopImmediatePropagation();$('drawerContextEditor').classList.add('hidden');reviewView(selected.id).draft=null;reviewDS.focusAction('v4Edit:'+selected.id);}
},true);

// Findings and evidence tabs: Figma 4321:6757 through 4332:5809.
// The sample review and design preview share these three complete findings.
// Real uploads continue to use their own records.
function findingDesignExamples() {
  const make=(id,title,category,metrics,tabs,discovery,suggestion)=>({id,rep:'Team',period:'2026-10-07',signal:investigationMetric('meetings_booked',40,24),evidence:[],type:'meeting',severity:'Needs review',status:'needs_context',contexts:[],diagnosis:null,findingDesign:{title,category,metrics,tabs,discovery,suggestion,period:'Last 14 days'}});
  const examples = [
    make('design-campaign','Positive replies are no longer converting into meetings','Campaign performance', [['Positive Replies','200','Unchanged'],['Meetings','-40%','40→29','risk'],['Reply → Meeting','12%','Was 20%']], ['Funnel Stage','Audience','Responses'], 'Enterprise reply-to-meeting conversion declined sharply. Several prospect responses mention additional stakeholder approvals, but whether these explain the decline remains uncertain.', 'Review stalled enterprise prospects and determine whether approval-related delays have increased.'),
    make('design-individual','Two SDRs are falling behind, work allocation can explain','Individual', [['Two members','12','Meets / member'],['Average','33','Meets / member','risk'],['Activity','1,000','Contacts / member']], ['Work allocation','Conversion by account'], 'The performance difference is consistent with unequal account allocation. The available figures do not indicate lower conversion effectiveness within comparable account groups.', 'Review whether performance targets account for differences in assigned work before considering individual interventions.'),
    make('design-pipeline','Meetings increased 25%, but fewer became opportunities','Pipeline performance', [['Meetings held','+25%','80 → 100'],['Opportunities','−25%','40 → 30','risk'],['Conversion','30%','Was 50%']], ['Funnel stage','Campaign'], 'The new campaign has lower qualification conversion, but the available data does not establish whether account quality, qualification criteria, or handoff practices explain the difference.', 'Review meetings that did not progress, grouped by qualification reason and the person responsible for accepting the handoff.')
  ];
  examples[2].readAt='2026-10-06T10:00:00Z';
  return examples;
}
function findingDesignEnsureSample() {
  if(!state.upload?.sample||state.patterns.length===3&&state.patterns.every(p=>p.findingDesign))return;
  state.patterns=findingDesignExamples();
  persist();
}
function findingDesignModel(p) {
  if(p.findingDesign)return p.findingDesign;
  const m=reviewModel(p),e=p.signal;
  return {title:m.title,category:p.type==='pipeline'?'Pipeline performance':p.rep==='Team'?'Campaign performance':'Individual',period:v4ComparisonPeriod(p),metrics:[[fields[e.metric]||e.metric,reviewAmount(e,e.value)??'—','Was '+(reviewAmount(e,e.baseline)??'—'),e.change<0?'risk':''],...p.evidence.filter(x=>x.metric!==e.metric).slice(0,2).map(x=>[fields[x.metric]||x.metric,reviewAmount(x,x.value)??'—','Was '+(reviewAmount(x,x.baseline)??'—'),x.change<0?'risk':''])],tabs:['Source records'],discovery:m.cause,suggestion:m.next};
}
function findingDesignBar(label,value,previous,current,stacked=false) {
  const track=(width,kind)=>'<div class="finding-bar-track"><span class="'+kind+'" style="width:'+width+'%"></span></div>';
  return '<div class="finding-bar-row"><div class="finding-chart-label"><span>'+esc(label)+'</span><span>'+esc(value)+'</span></div>'+(stacked?'<div class="finding-bar-track stacked"><span class="previous" style="width:'+previous+'%"></span></div>':track(previous,'previous')+track(current,'current'))+'</div>';
}
function findingDesignTable(headers,rows) {
  return '<table class="finding-evidence-table"><thead><tr>'+headers.map(s=>'<th>'+esc(s)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(s=>'<td>'+esc(s)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
}
function findingDesignEvidence(p,tab) {
  if(!p.findingDesign)return reviewRecords(reviewModel(p));
  const caption=s=>'<p class="finding-chart-caption">'+esc(s)+'</p>';
  if(p.id==='design-campaign'){
    if(tab===2)return reviewMessages([{text:'“Interesting feature, but we need to involve our security team before setting up a discussion.”',author:'Emily Johnson',date:'2 hours ago'},{text:"We’d need buy-in from operations before evaluating this",author:'Emily Johnson',date:'2 hours ago'}])+caption('These examples suggest stakeholder approvals are worth investigating, but two replies cannot establish the cause of the overall decline.');
    return (tab===1?findingDesignBar('Enterprise','25% → 10%',71.55,52.14)+findingDesignBar('SMB','15% → 14%',40.79,24.18):findingDesignBar('Positive Replies','200 → 200',71.55,52.14)+findingDesignBar('Meetings booked','40 → 24',40.79,24.18))+caption('39 SMB and 48 Enterprise replies')+caption(tab===1?'Enterprise shows the largest conversion decline. SMB and mid-market are relatively stable.':'Positive reply volume remained stable, but enterprise reply-to-meeting conversion fell sharply. SMB conversion remained relatively stable.');
  }
  if(p.id==='design-individual')return tab===0?findingDesignBar('Two team members','80% cold · 20% warm',71.55,0,true)+findingDesignBar('Comparable members','20% cold · 80% warm',29.28,0,true)+caption('The two members received a larger share of cold accounts, which historically convert at a lower rate.'):findingDesignTable(['Account Type','Two Members','Comparison group'],[['Cold Accounts','0.5%','0.5%'],['Warm Accounts','4.5%','4.2%']])+caption('Expected meetings per 1,000 contacts: 12 vs. 33.');
  return tab===0?findingDesignBar('Previous Period','40 / 80 · 50%',51.3,0,true).replace('stacked','single previous-period')+findingDesignBar('Current period','30 / 100 · 30%',33.4,0,true).replace('stacked','single current-period')+caption('Meeting volume increased, but a smaller proportion progressed into qualified opportunities.'):findingDesignTable(['Account Type','Meetings','Opportunities','Opportunities'],[['New Campaign','40','6','15%'],['Other campaigns','60','24','40%']])+caption('The new campaign shows substantially lower meeting-to-opportunity conversion than other campaigns.');
}
function findingDesignOpen(id) {
  const p=state.patterns.find(p=>p.id===id);if(!p)return;
  if(!p.readAt){
    p.readAt=new Date().toISOString();persist();
    const row=$('finding-'+id);if(row){row.dataset.read='true';row.setAttribute('aria-label','Read finding: '+findingDesignModel(p).title);row.classList.remove('design-attention');row.querySelector('.finding-badge')?.classList.add('neutral');}
  }
  const existing=$('findingDrawer');reviewRemember();if(!existing)v4DrawerOrigin=document.activeElement;
  const focused=existing?.contains(document.activeElement)?document.activeElement.closest('[data-action]')?.dataset.action:null;
  existing?.remove();selected=p;
  const m=findingDesignModel(p),v=reviewView(id),tab=v.tab||0;v.saving=false;
  const actions='<div class="actions finding-primary-actions">'+button('Investigate','findingInvestigate:'+id)+button('Record decision','findingDecision:'+id)+'</div>';
  document.body.insertAdjacentHTML('beforeend','<div class="drawer-layer" id="findingDrawer"><button class="drawer-backdrop" data-action="closeDrawer" aria-label="Close finding overlay" tabindex="-1"></button><aside class="finding-drawer compact-drawer review-drawer finding-design-drawer '+(v.expanded?'expanded ':'')+(existing?'is-updating':'')+'" role="dialog" aria-modal="true" aria-labelledby="drawerTitle"><div class="drawer-tools"><button class="drawer-close" data-action="closeDrawer" aria-label="Close finding details"><img src="assets/figma/finding-collapse.svg" alt=""></button><button data-action="reviewExpand:'+id+'" aria-label="'+(v.expanded?'Collapse':'Expand')+' finding details" aria-expanded="'+v.expanded+'"><img src="assets/figma/finding-expand.svg" alt=""></button></div><div class="drawer-body"><div class="review-intro"><h2 id="drawerTitle">'+esc(m.title)+'</h2><div class="finding-meta"><span class="finding-badge">'+esc(m.category)+'</span>'+(p.id==='design-campaign'?'<span class="finding-badge impact">High Impact</span>':'')+'<span class="finding-period">'+esc(m.period)+'</span></div></div><div class="finding-metrics">'+m.metrics.map(([label,value,note,tone])=>'<div><span>'+esc(label)+'</span><strong class="'+(tone||'')+'">'+esc(value)+'</strong><span>'+esc(note)+'</span></div>').join('')+'</div><div class="finding-tabs" role="tablist" aria-label="Finding evidence">'+m.tabs.map((label,i)=>'<button role="tab" id="finding-tab-'+i+'" aria-selected="'+(i===tab)+'" aria-controls="findingEvidence" tabindex="'+(i===tab?0:-1)+'" data-action="findingTab:'+id+':'+i+'">'+esc(label)+'</button>').join('')+'</div><section id="findingEvidence" class="finding-evidence" role="tabpanel" aria-labelledby="finding-tab-'+tab+'">'+findingDesignEvidence(p,tab)+'</section><div class="finding-divider"><img src="assets/figma/finding-divider.svg" alt=""></div><section class="review-section"><h3>Discovery</h3><p>'+esc(m.discovery)+'</p></section><section class="review-section"><h3>Suggestion</h3><p>'+esc(m.suggestion)+'</p>'+actions+'</section><section class="finding-investigate" '+(v.investigate?'':'hidden')+'><h3>Investigate</h3>'+reviewContext(p)+reviewDS.disclosure('records','Source records',reviewRecords(reviewModel(p)),v.records)+'</section><section class="finding-decision" '+(v.decision?'':'hidden')+'><h3>Decision <span>Optional</span></h3><div class="actions">'+reviewDS.button('Mark reviewed','reviewMark:'+id,{pressed:p.investigationDecision?.type==='reviewed'})+reviewDS.button('Dismiss','reviewDismiss:'+id)+'</div>'+(p.investigationDecision?'<p role="status">'+esc(p.investigationDecision.label)+'</p>':'')+'</section></div></aside></div>');
  document.body.classList.add('drawer-open');document.querySelectorAll('.finding-row').forEach(row=>row.setAttribute('aria-selected',String(row.id==='finding-'+id)));
  const body=document.querySelector('.review-drawer .drawer-body');body.scrollTop=v.scroll;
  document.querySelectorAll('[data-disclosure]').forEach(el=>el.addEventListener('toggle',()=>v[el.dataset.disclosure]=el.open));
  if(v.draft!==null){v4EditContext(id);$('drawerNote').value=v.draft;body.scrollTop=v.scroll;}
  if(v.focus||focused)reviewDS.focusAction(v.focus||focused);else document.querySelector('.drawer-close').focus({preventScroll:true});v.focus=null;
}
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-action]');if(!el)return;
  const [action,id,index]=el.dataset.action.split(':');if(!['findingTab','findingInvestigate','findingDecision'].includes(action))return;
  const v=reviewView(id);
  if(action==='findingTab'){v.tab=Number(index);findingDesignOpen(id);document.querySelector('[role="tab"][aria-selected="true"]').focus();}
  else {const key=action==='findingInvestigate'?'investigate':'decision';v[key]=!v[key];findingDesignOpen(id);const section=document.querySelector('.finding-'+key);if(v[key]){section.querySelector('summary,button')?.focus();section.scrollIntoView({block:'nearest'});}}
});
document.addEventListener('keydown',e=>{
  const tab=e.target.closest('.finding-tabs [role="tab"]');if(!tab||!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;
  e.preventDefault();const tabs=[...tab.parentElement.children],i=tabs.indexOf(tab),next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].click();
});

// Explicit Figma fixture data stays in isolated design-preview mode.
function reviewFigmaExample(variant) {
  const messages=[{text:'Hi John, I noticed you put a lot of emphasis on meeting quality, conversion rates, and pipeline contribution. If a rep is halfway through the quarter and still behind target, but their activity looks healthy, how do you usually figure out whether the issue is their messaging, lead quality, or something else?',author:'Emily Johnson',date:'21 Dec 2025',channel:'Email'},{text:'Hi Macky, I noticed you put a lot of emphasis on coaching SDRs through call reviews and performance frameworks. If a rep is halfway through the quarter and still behind target, but their activity looks healthy, how do you usually figure out whether the issue is their messaging, lead quality, or something else?',author:'Emily Johnson',date:'21 Jan 2026',channel:'Email'}];
  const p={id:'figma-meetings',rep:'Emily Johnson',period:'2026-09-15',designPeriod:'15 Sept 2026',signal:investigationMetric('meetings_booked',25,19),evidence:[investigationMetric('meetings_booked',25,19)],type:'meeting',severity:'High priority',designPriority:'High',status:'needs_context',contexts:[],diagnosis:null};
  p.review={title:'Meetings booked declined',risk:'Pipeline risk',changed:'Call volume also dropped, while connect rate stayed stable ·',cause:variant==='messages'?'Messaging changed around the same time, but its impact on meetings booked is unconfirmed.':'Call volume declined, while lead quality and territory performance also changed. Their contribution to the decline is not yet clear.',causes:variant==='messages'?[]:[{kind:'Activity',scope:'Team-wide',text:'Calls declined 18%'}],messages:variant==='messages'?messages:variant==='details'?[{...messages[0],text:'Hi John, I noticed you put a lot of emphasis on meeting quality, conversion rates, and....'}]:[],next:'Results from before and after the change',records:[{name:'Meetings Booked',baseline:30,previous:25,current:19},{name:'Connect Rate',baseline:'8%',previous:'10%',current:19},{name:'Call volume',baseline:150,previous:250,current:200}],missing:[],limits:[],source:''};
  if(variant==='details')p.review.causes.push({kind:'Lead quality',scope:'Enterprise segment',text:'Reply rate reduced by 26%'},{kind:'Territory',scope:'APAC',text:'Meetings booked declined 24% (25 to 19)'});
  if(variant==='context'){p.review.causes.push({kind:'Lead quality',scope:'Enterprise segment',text:'Reply rate reduced by 26%'},{kind:'Territory',scope:'APAC',text:'Meetings booked declined 24% (25 to 19)'});p.contexts.push({id:'figma-manager',source:'manager',content:'“I had fewer available lead blocks this week because I spent time on onboarding calls and admin cleanup.”',relevance:'accepted',signals:[],date:'2026-09-15',designTimestamp:'2 hours ago'});}
  if(variant==='messages'){p.contexts.push({id:'figma-employee',source:'employee',content:'“I had fewer available lead blocks this week because I spent time on onboarding calls and admin cleanup.”',relevance:'accepted',signals:[],date:'2026-09-15',designTimestamp:'2 hours ago'},{id:'figma-manager',source:'manager',content:'The rep is spending time on coaching this week.',relevance:'accepted',signals:[],date:'2026-09-15',designTimestamp:'2 hours ago'});p.contextRequest={id:'figma-request',status:'sent',date:'2026-09-15'};}
  return p;
}
if(v4Preview&&new URLSearchParams(location.search).has('drawer-variant')){
  closeFindingDrawer(false);const variant=new URLSearchParams(location.search).get('drawer-variant');const p=reviewFigmaExample(variant);
  state.patterns=[p];patternsScreen();const view=reviewView(p.id);view.cause=view.context=view.records=variant!=='collapsed';openFindingDrawer(p.id);
}else {
  patternsScreen=function(){
    if(v4NeedsNameReview())return;
    findingDesignEnsureSample();
    render(v4Header('Review Findings','Review changes Zevian flagged, add what needs follow-up.','')+'<div class="finding-scroll"><table class="findings-table design-findings-table"><thead><tr><th>Finding</th><th>Next step</th><th>Updated</th></tr></thead><tbody>'+state.patterns.map(p=>{
      const reviewed=isReviewed(p),m=findingDesignModel(p),label=p.findingDesign?({'design-campaign':'Positive replies, fewer meetings','design-individual':'SDR performance and unequal allocation','design-pipeline':'More meetings, fewer opportunities'}[p.id]):m.title;
      const sub=p.findingDesign?(p.id==='design-individual'?'Lead allocation records are also missing':'Employee replied: meetings are being booked further ahead'):p.contexts.length?'Context added':v4FindingValue(p.signal,p.signal.baseline)+' → '+v4FindingValue(p.signal,p.signal.value);
      return '<tr class="finding-row '+(!p.readAt?'design-attention':'')+'" id="finding-'+p.id+'" data-read="'+!!p.readAt+'" data-action="drawer:'+p.id+'" tabindex="0" aria-label="'+(p.readAt?'Read':'Unread')+' finding: '+esc(m.title)+'"><td><span class="finding-label">'+esc(label)+'</span><span class="finding-sub">'+esc(sub)+'</span></td><td><button class="finding-badge '+(reviewed||p.readAt?'neutral':'')+'" data-action="drawer:'+p.id+'">'+(reviewed?'Reviewed':'Review finding')+'</button></td><td>'+esc(p.findingDesign?(p.id==='design-campaign'?'10:54':'Yesterday'):formatDate(p.decisionDate||p.period))+'</td></tr>';
    }).join('')+'</tbody></table>'+(!state.patterns.length?'<p class="muted">No findings available. Add earlier periods to compare performance.</p>':'')+'</div><div class="flow-footer">'+button('Go back','mapping')+button('Continue →','decisions',true)+'</div>','patterns',2);
  };
  actions.patterns=patternsScreen;
  if(v4Preview&&!['upload','match'].includes(new URLSearchParams(location.search).get('screen'))){
    const screen=new URLSearchParams(location.search).get('screen');closeFindingDrawer(false);state.patterns=findingDesignExamples();patternsScreen();
    if(['drawer','context'].includes(screen)){const params=new URLSearchParams(location.search),p=state.patterns.find(p=>p.id==='design-'+params.get('finding'))||state.patterns[0];reviewView(p.id).tab=Math.min(p.findingDesign.tabs.length-1,Math.max(0,Number(params.get('tab'))||0));openFindingDrawer(p.id);}
  }else if($('findingDrawer'))openFindingDrawer(selected.id);
  else if(mode==='patterns')patternsScreen();
}
