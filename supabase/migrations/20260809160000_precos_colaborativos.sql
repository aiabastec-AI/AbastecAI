-- Preços colaborativos por posto (só combustível, PRD original não previa preço de recarga
-- elétrica) — usuários reportam o que pagaram, a ficha mostra o relato mais recente por tipo.
-- Sem upsert/constraint única de propósito: preço muda com frequência (é comum um mesmo posto
-- ter vários relatos ao longo dos dias), então cada envio é uma linha nova — histórico de fato,
-- não "a opinião atual de cada usuário" como em avaliacoes_usuario.

create table precos_combustivel (
  id uuid primary key default gen_random_uuid(),
  posto_id uuid references postos(id) on delete cascade not null,
  usuario_id uuid references usuarios(id) on delete cascade not null,
  tipo_combustivel text not null check (tipo_combustivel in ('gasolina', 'etanol', 'diesel', 'gnv')),
  preco numeric(6,3) not null check (preco > 0),
  created_at timestamptz default now()
);

create index precos_combustivel_posto_idx on precos_combustivel (posto_id, tipo_combustivel, created_at desc);

alter table precos_combustivel enable row level security;
create policy "Leitura pública de preços" on precos_combustivel for select using (true);
create policy "Usuário reporta o próprio preço" on precos_combustivel
  for insert
  with check (
    exists (select 1 from usuarios u where u.id = precos_combustivel.usuario_id and u.auth_id = auth.uid())
  );
