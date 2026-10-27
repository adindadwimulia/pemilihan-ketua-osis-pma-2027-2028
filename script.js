const $=s=>document.querySelector(s),C=window.CONFIG||{},ok=C.SUPABASE_URL&&!C.SUPABASE_URL.startsWith('ISI');
const sb=ok?supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY):null;
const AV='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100"><rect width="80" height="100" fill="#f3e3cc"/><path d="M40 12c-17 0-24 14-24 28 0 12 6 22 6 30l-14 30h64l-14-30c0-8 6-18 6-30 0-14-7-28-24-28z" fill="#800020"/><ellipse cx="40" cy="42" rx="15" ry="18" fill="#f6d9bd"/></svg>');
let cands=[],tally={},st={voting_open:false,show_results:true},pick=null;
const toast=m=>{const t=$('#toast');t.textContent=m;t.hidden=false;setTimeout(()=>t.hidden=true,3500)};
async function load(){
 if(!ok){$('#warn').hidden=false;cands=[[1,'TANIA AULIA SALSABILA'],[2,'FIRZAA HALWA IZZATII'],[3,'RINDU PUTRI YASMIN']].map(([n,name])=>({id:n,number:n,name,description:'',photo_url:null}));return render()}
 const [a,b,c]=await Promise.all([sb.from('candidates').select('*').order('number'),sb.from('settings').select('*').single(),sb.from('tally').select('*')]);
 if(a.data)cands=a.data;if(b.data)st=b.data;tally={};(c.data||[]).forEach(r=>tally[r.candidate_id]=r.total);render()}
function render(){
 const open=ok&&st.voting_open&&(!st.start_at||new Date()>=new Date(st.start_at))&&(!st.end_at||new Date()<=new Date(st.end_at));
 $('#status').textContent=!ok?'Backend belum dikonfigurasi':open?'Voting DIBUKA':'Voting DITUTUP';
 const cards=$('#cards');cards.replaceChildren();
 cands.forEach(k=>{const d=document.createElement('div');d.className='card';
  const i=new Image();i.src=k.photo_url||AV;i.alt='Foto '+k.name;i.loading='lazy';
  const bd=document.createElement('div');bd.className='badge';bd.textContent='KANDIDAT '+String(k.number).padStart(2,'0');
  const h=document.createElement('h3');h.textContent=k.name;
  const c=document.createElement('div');c.className='cnt';c.textContent='Jumlah Suara: '+(ok&&!st.show_results?'disembunyikan':(tally[k.id]||0));
  const p=document.createElement('p');p.textContent=k.description||'';
  const b=document.createElement('button');b.className='btn';b.textContent='VOTE SEKARANG';b.disabled=!open;b.onclick=()=>ask(k);
  d.append(i,bd,h,c,p,b);cards.append(d)});
 const r=$('#res');r.replaceChildren();
 if(ok&&!st.show_results){r.textContent='Hasil sementara disembunyikan oleh panitia.';return}
 const tot=cands.reduce((s,k)=>s+(tally[k.id]||0),0),t=document.createElement('p');t.innerHTML='<b>Total suara sah: '+tot+'</b>';r.append(t);
 [...cands].sort((a,b)=>(tally[b.id]||0)-(tally[a.id]||0)).forEach((k,i)=>{const n=tally[k.id]||0,pc=tot?(n/tot*100):0,row=document.createElement('div');row.className='bar';
  const l=document.createElement('span');l.textContent='#'+(i+1)+' '+k.name;const tr=document.createElement('div');tr.className='trk';const f=document.createElement('div');f.className='fill';f.style.width=pc+'%';tr.append(f);
  const v=document.createElement('span');v.textContent=n+' ('+pc.toFixed(1)+'%)';row.append(l,tr,v);r.append(row)})}
function ask(k){pick=k;$('#mq').textContent='Apakah kamu yakin ingin memilih '+k.name+'?';$('#msg').textContent='';$('#code').value='';$('#modal').hidden=false;$('#code').focus()}
$('#no').onclick=()=>{$('#modal').hidden=true;pick=null};
$('#yes').onclick=async()=>{const code=$('#code').value.trim(),y=$('#yes');
 if(!code){$('#msg').textContent='Masukkan kode pemilih.';return}
 y.disabled=true;const {data,error}=await sb.rpc('cast_vote',{p_code:code,p_candidate:pick.id});y.disabled=false;
 const M={CLOSED:'Voting sedang ditutup.',INVALID:'Kode pemilih tidak valid.',USED:'Kode ini sudah digunakan untuk memilih.'};
 if(error){$('#msg').textContent='Terjadi kesalahan. Coba lagi.';return}
 if(data!=='OK'){$('#msg').textContent=M[data]||'Gagal.';return}
 $('#modal').hidden=true;toast('Terima kasih! Suaramu berhasil dicatat.');load()};
load();
if(ok){sb.channel('live').on('postgres_changes',{event:'*',schema:'public',table:'tally'},load).on('postgres_changes',{event:'*',schema:'public',table:'settings'},load).subscribe();setInterval(load,15000)}
