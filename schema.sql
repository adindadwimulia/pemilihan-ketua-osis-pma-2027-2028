-- Jalankan seluruhnya di Supabase > SQL Editor
create extension if not exists pgcrypto with schema extensions;
create table candidates(id int primary key,number int,name text not null,description text default '',photo_url text);
insert into candidates values
(1,1,'TANIA AULIA SALSABILA','Deskripsi singkat kandidat (edit lewat halaman admin).',null),
(2,2,'FIRZAA HALWA IZZATII','Deskripsi singkat kandidat (edit lewat halaman admin).',null),
(3,3,'RINDU PUTRI YASMIN','Deskripsi singkat kandidat (edit lewat halaman admin).',null);
create table settings(id int primary key default 1 check(id=1),voting_open bool default false,show_results bool default true,start_at timestamptz,end_at timestamptz);
insert into settings(id) values(1);
create table voters(code_hash text primary key,used bool default false,used_at timestamptz);
create table votes(id bigserial primary key,candidate_id int references candidates(id)); -- sengaja TANPA identitas pemilih & waktu
create table tally(candidate_id int primary key references candidates(id),total int not null default 0);
insert into tally select id,0 from candidates;
create table audit_log(id bigserial primary key,at timestamptz default now(),event text,detail text);
create table admins(user_id uuid primary key);

create function is_admin() returns bool language sql security definer stable set search_path=public as $$select exists(select 1 from admins where user_id=auth.uid())$$;

create function bump() returns trigger language plpgsql security definer set search_path=public as $$
begin update tally set total=total+1 where candidate_id=new.candidate_id; return new; end$$;
create trigger t_bump after insert on votes for each row execute function bump();

create function cast_vote(p_code text,p_candidate int) returns text language plpgsql security definer set search_path=public,extensions as $$
declare s settings; h text; v voters;
begin
 select * into s from settings where id=1;
 if not s.voting_open or (s.start_at is not null and now()<s.start_at) or (s.end_at is not null and now()>s.end_at) then return 'CLOSED'; end if;
 h:=encode(digest(upper(trim(p_code)),'sha256'),'hex');
 select * into v from voters where code_hash=h for update;      -- kunci baris: anti suara ganda
 if not found then insert into audit_log(event) values('KODE_TIDAK_VALID'); return 'INVALID'; end if;
 if v.used then insert into audit_log(event,detail) values('PERCOBAAN_GANDA',left(h,8)); return 'USED'; end if;
 if not exists(select 1 from candidates where id=p_candidate) then return 'INVALID'; end if;
 update voters set used=true,used_at=now() where code_hash=h;
 insert into votes(candidate_id) values(p_candidate);
 return 'OK';
end$$;

create function generate_codes(n int) returns setof text language plpgsql security definer set search_path=public,extensions as $$
declare c text;
begin
 if not is_admin() then raise exception 'forbidden'; end if;
 for i in 1..least(n,2000) loop
  c:=upper(substr(encode(gen_random_bytes(6),'hex'),1,10));
  insert into voters(code_hash) values(encode(digest(c,'sha256'),'hex'));
  return next c;
 end loop;
 insert into audit_log(event,detail) values('GENERATE_KODE',n::text);
end$$;
revoke execute on function generate_codes(int) from public,anon;
grant execute on function generate_codes(int) to authenticated;
grant execute on function cast_vote(text,int) to anon,authenticated;

alter table candidates enable row level security; alter table settings enable row level security;
alter table voters enable row level security; alter table votes enable row level security;
alter table tally enable row level security; alter table audit_log enable row level security; alter table admins enable row level security;
create policy c_r on candidates for select using(true);
create policy c_u on candidates for update using(is_admin()) with check(is_admin());
create policy s_r on settings for select using(true);
create policy s_u on settings for update using(is_admin()) with check(is_admin());
create policy t_r on tally for select using(is_admin() or (select show_results from settings where id=1));
create policy v_r on voters for select using(is_admin());
create policy a_r on audit_log for select using(is_admin());
-- votes & admins: tanpa policy = tertutup total untuk klien

insert into storage.buckets(id,name,public) values('candidates','candidates',true) on conflict do nothing;
create policy p_r on storage.objects for select using(bucket_id='candidates');
create policy p_i on storage.objects for insert with check(bucket_id='candidates' and public.is_admin());
create policy p_u on storage.objects for update using(bucket_id='candidates' and public.is_admin());
alter publication supabase_realtime add table tally,settings;
-- Setelah membuat akun admin di Authentication > Users, jalankan:
-- insert into admins values('UUID_USER_ADMIN');
