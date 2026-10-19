/* Gerenciamento local da demonstração Gold. Não sincroniza entre dispositivos. */
(function(){
'use strict';
const svcKey='bg_services_demo_v1',proKey='bg_professionals_demo_v1';
const initialPros=[{id:'p1',name:'Magdiel',specialty:'Barbeiro',active:true}];
function load(key,fallback){try{const v=JSON.parse(localStorage.getItem(key));return Array.isArray(v)?v:fallback}catch{return fallback}}
let pros=load(proKey,initialPros);
const savedServices=load(svcKey,null);
if(savedServices!==null){services.splice(0,services.length,...savedServices.filter(x=>Array.isArray(x)&&typeof x[0]==='string'&&Number.isFinite(+x[1])&&Number.isFinite(+x[2])).map(x=>[String(x[0]),Number(x[1]),Number(x[2])]))}
function allowed(){return currentUser&&currentUser.role==='admin'}
function persist(){localStorage.setItem(svcKey,JSON.stringify(services));localStorage.setItem(proKey,JSON.stringify(pros));refresh();notice('Alterações salvas neste dispositivo')}
function refresh(){
 const oldService=$('service').value,oldPro=$('professional').value;
 $('catalog').innerHTML=services.map((s,i)=>'<article class="service"><div><h3>'+esc(s[0])+'</h3><p class="muted">⏱ '+s[1]+' minutos</p></div><div class="row"><span class="price">'+money(s[2])+'</span><button class="btn" onclick="choose('+i+')">Escolher</button></div></article>').join('')||'<p class="muted">Nenhum serviço disponível.</p>';
 const images=[
 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=450&q=75',
 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=450&q=75',
 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=450&q=75',
 'https://images.unsplash.com/photo-1622296089863-eb7fc530daa8?auto=format&fit=crop&w=450&q=75'
 ];
 const imageFor=(name,i)=>/barba/i.test(name)?images[1]:/sobrancelha/i.test(name)?images[3]:images[i%images.length];
 const card=(svc,i)=>'<article class="gold-service-card"><img src="'+imageFor(svc[0],i)+'" alt="" loading="lazy"><div class="gold-service-copy"><h3>'+esc(svc[0])+'</h3><p>'+svc[1]+' minutos</p><div class="gold-service-bottom"><strong>'+money(svc[2])+'</strong><button onclick="choose('+i+')">Agendar</button></div></div></article>';
 $('catalog').innerHTML=services.map(card).join('')||'<p class="muted">Nenhum serviço disponível.</p>';
 $('homeCatalog').innerHTML=services.slice(0,4).map(card).join('');
 $('quickServices').innerHTML=services.slice(0,4).map((svc,i)=>'<button class="quick-tile" onclick="choose('+i+')"><img src="'+imageFor(svc[0],i)+'" alt="" loading="lazy"><span>'+esc(svc[0])+'</span></button>').join('');
 $('service').innerHTML=services.map((s,i)=>'<option value="'+i+'">'+esc(s[0])+' · '+money(s[2])+'</option>').join('');
 if([...$('service').options].some(o=>o.value===oldService))$('service').value=oldService;
 $('professional').innerHTML=pros.filter(p=>p.active).map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('');
 if([...$('professional').options].some(o=>o.value===oldPro))$('professional').value=oldPro;
 slots();renderServices();renderPros();
}
function renderServices(){
 if(!$('adminServices'))return;
 $('adminServices').innerHTML=services.map((s,i)=>'<div class="manage-item"><div class="manage-fields"><label>Serviço<input id="svcName'+i+'" maxlength="70" value="'+esc(s[0])+'"></label><label>Preço (R$)<input id="svcPrice'+i+'" type="number" min="0" max="99999" step="0.01" value="'+s[2]+'"></label><label>Minutos<input id="svcDuration'+i+'" type="number" min="5" max="480" step="5" value="'+s[1]+'"></label></div><div class="manage-actions"><button class="btn" onclick="saveService('+i+')">Salvar</button><button class="btn" onclick="removeService('+i+')">Excluir</button></div></div>').join('')||'<p class="muted">Nenhum serviço cadastrado.</p>';
}
function renderPros(){
 if(!$('adminProfessionals'))return;
 $('adminProfessionals').innerHTML=pros.map((p,i)=>'<div class="manage-item"><div class="manage-fields"><label>Nome<input id="proName'+i+'" maxlength="70" value="'+esc(p.name)+'"></label><label>Especialidade<input id="proSpecialty'+i+'" maxlength="90" value="'+esc(p.specialty||'')+'"></label><label>Situação<select id="proActive'+i+'"><option value="true" '+(p.active?'selected':'')+'>Ativo</option><option value="false" '+(!p.active?'selected':'')+'>Inativo</option></select></label></div><div class="manage-actions"><button class="btn" onclick="saveProfessional('+i+')">Salvar</button><button class="btn" onclick="removeProfessional('+i+')">Excluir</button></div></div>').join('')||'<p class="muted">Nenhum profissional cadastrado.</p>';
}
window.saveService=function(i){if(!allowed()||!services[i])return;const name=$('svcName'+i).value.trim(),price=Number($('svcPrice'+i).value),duration=Number($('svcDuration'+i).value);if(!name||!Number.isFinite(price)||price<0||price>99999||!Number.isInteger(duration)||duration<5||duration>480){notice('Verifique nome, preço e duração.');return}services[i]=[name,duration,price];persist()};
window.removeService=function(i){if(!allowed()||!services[i])return;if(confirm('Excluir este serviço do catálogo?')){services.splice(i,1);persist()}};
window.saveProfessional=function(i){if(!allowed()||!pros[i])return;const name=$('proName'+i).value.trim();if(!name){notice('Informe o nome do profissional.');return}pros[i].name=name;pros[i].specialty=$('proSpecialty'+i).value.trim();pros[i].active=$('proActive'+i).value==='true';persist()};
window.removeProfessional=function(i){if(!allowed()||!pros[i])return;if(confirm('Excluir este profissional?')){pros.splice(i,1);persist()}};
$('addServiceForm').addEventListener('submit',e=>{e.preventDefault();if(!allowed())return;const name=$('newServiceName').value.trim(),price=Number($('newServicePrice').value),duration=Number($('newServiceDuration').value);if(!name||!Number.isFinite(price)||price<0||price>99999||!Number.isInteger(duration)||duration<5||duration>480){notice('Preencha os dados corretamente.');return}services.push([name,duration,price]);e.target.reset();persist()});
$('addProfessionalForm').addEventListener('submit',e=>{e.preventDefault();if(!allowed())return;const name=$('newProfessionalName').value.trim();if(!name){notice('Informe o nome do profissional.');return}pros.push({id:'p'+Date.now()+'_'+Math.random().toString(36).slice(2,7),name,specialty:$('newProfessionalSpecialty').value.trim(),active:true});e.target.reset();persist()});
refresh();
})();
