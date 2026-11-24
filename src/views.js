import { configured } from './data.js'
import { google, icon } from './icons.js'
import { athleteKey, deadlineDay, deadlineInput, deadlineTime, escape, phone, statusNames, years } from './format.js'

const logo = '<img class="brand-logo" src="/logotipo.png" alt="Copinha 13 Loucos" width="2172" height="724">'

export const badge = status => `<span class="badge ${escape(status)}"><i></i>${escape(statusNames[status])}</span>`
export const deadlineLabel = settings => settings ? `${deadlineDay(settings.edit_deadline)}, às ${deadlineTime(settings.edit_deadline)}` : 'Prazo indisponível'
export const closed = settings => settings && Date.now() >= Date.parse(settings.edit_deadline)

function button(label, action, { kind = 'primary', symbol = '', busy = false } = {}) {
  return `<button class="button ${kind}" type="button" data-action="${action}" ${busy ? 'disabled' : ''}>${symbol}${label}</button>`
}

function header(state) {
  return `<header class="site-header"><div class="container nav">
    <button type="button" class="brand-home" data-action="home" aria-label="Copinha 13 Loucos, início">${logo}</button>
    <nav aria-label="Navegação principal">
      ${state.session || state.screen === 'team' || state.screen === 'admin' ? button('Minha equipe', 'team', {kind: 'nav-link'}) : ''}
      ${button('<span class="org-label">Área da organização</span><span class="org-short">Organização</span>', 'admin', {kind: 'nav-link', symbol: icon('shield')})}
    </nav>
  </div></header>`
}

const footer = `<footer class="site-footer"><div class="container footer-inner">
  <span><strong>Copinha 13 Loucos</strong> · Futsal de base</span>
  <span>Jardim América · Itaquaquecetuba, SP</span>
</div></footer>`

function hero(settings) {
  return `<section class="hero">
    <div class="court-art" aria-hidden="true"><div class="court-lines"><i></i><b></b></div></div>
    <div class="container hero-inner">
      <div class="hero-kicker"><span></span> FUTSAL DE BASE <span></span></div>
      <div class="hero-logo">${logo}</div>
      <h1>Inscrições de equipes</h1>
      <p>Inscrição gratuita para equipes do futsal de base.</p>
      <div class="hero-meta">
        <span>${icon('calendar')}${settings && closed(settings) ? 'Inscrições encerradas' : settings ? `Até ${deadlineDay(settings.edit_deadline)}` : 'Consulte o prazo de inscrição'}</span>
        <span>${icon('pin')}Quadra da Praça do KM40</span>
      </div>
    </div>
  </section>`
}

function notice(text, label = '', kind = 'quiet') {
  return `<div class="notice ${kind}" tabindex="-1">${icon(kind === 'success' ? 'check' : 'info')}<div>${label ? `<strong>${label}</strong>` : ''}<span>${escape(text)}</span></div></div>`
}

function demoBar(state) {
  if (configured) return ''
  return `<div class="demo-bar"><div class="container"><span>${icon('info')} Prévia interativa · use dados fictícios.</span>${state.screen !== 'home' ? button('Voltar à prévia', 'home', {kind: 'plain'}) : ''}</div></div>`
}

function accessCard(state) {
  const ended = closed(state.settings)
  return `<section class="card access-card">
    <div class="section-icon">${icon('note')}</div>
    <h2>${state.session ? 'Acompanhe sua inscrição' : 'Inscreva sua equipe'}</h2>
    <p>${ended && configured ? 'Entre para consultar uma inscrição existente.' : 'Cadastre o representante adulto e monte a relação de atletas da sua equipe.'}</p>
    <div class="access-actions">
      ${state.session ? button('Abrir minha equipe', 'team', { busy: state.busy }) : configured
        ? `${button('Continuar com Google', 'google', {symbol: google, busy: state.busy})}
           ${button('Prosseguir como visitante', 'guest', {kind: 'secondary', symbol: icon('user'), busy: state.busy})}`
        : `${button('Testar inscrição', 'team', {symbol: icon('people')})}
           ${button('Testar painel da organização', 'admin', {kind: 'secondary', symbol: icon('shield')})}`}
    </div>
    <p class="access-foot">${icon('lock')} O elenco fica visível apenas ao representante e à organização.</p>
    ${state.challenge ? '<div id="turnstile" class="turnstile"></div>' : ''}
  </section>`
}

function landing(state) {
  return `${hero(state.settings)}
    <main id="conteudo" class="container landing" tabindex="-1">
      ${accessCard(state)}
      <aside class="registration-info" aria-labelledby="info-heading">
        <h2 id="info-heading">Antes de inscrever</h2>
        <div class="info-row"><span class="section-icon">${icon('calendar')}</span><div>
          <h3>Prazo de inscrição e edição</h3><p>${deadlineLabel(state.settings)}${state.settings ? ' · horário de Brasília' : ''}</p>
        </div></div>
        <div class="info-row"><span class="section-icon">${icon('people')}</span><div>
          <h3>De 5 a 15 atletas por equipe</h3><p>Nascidos de 2012 a 2014. Até dois atletas de 2011 por equipe.</p>
        </div></div>
        <div class="info-row"><span class="section-icon">${icon('shield')}</span><div>
          <h3>Autorizações com a organização</h3><p>Entregue as autorizações assinadas conforme as orientações da organização e acompanhe o status aqui.</p>
        </div></div>
      </aside>
    </main>`
}

function dashboardTitle(kicker, title, content, actions = '') {
  return `<section class="dashboard-title"><div class="container title-inner">
      <div><span class="eyebrow">${kicker}</span><h1>${title}</h1><p>${content}</p></div>
      ${actions ? `<div class="title-actions">${actions}</div>` : ''}
    </div></section>`
}

function authActions(state) {
  if (!configured || !state.session) return ''
  return `${state.session.user.is_anonymous ? button('Vincular Google', 'link', {kind: 'light', symbol: google, busy: state.busy}) : ''}
    ${button('Sair', 'logout', {kind: 'ghost', busy: state.busy})}`
}

function input(label, name, value, attributes = '') {
  return `<label class="field"><span>${label}</span><input name="${name}" value="${escape(value)}" required ${attributes}></label>`
}

function playerRow(player, index, length) {
  return `<div class="player-row"><span class="player-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
    <label class="field"><span class="sr-only">Nome completo do atleta ${index + 1}</span>
      <input placeholder="Nome completo" autocomplete="off" data-player="${index}" data-field="name" maxlength="90" required value="${escape(player.name)}">
    </label>
    <label class="field select-field"><span class="sr-only">Ano de nascimento do atleta ${index + 1}</span>
      <select data-player="${index}" data-field="year" required><option value="">Ano de nascimento</option>${years.map(year => `<option value="${year}" ${Number(player.year) === year ? 'selected' : ''}>${year}</option>`).join('')}</select>${icon('down')}
    </label>
    <button type="button" class="icon-button" aria-label="Remover atleta ${index + 1}" title="Remover atleta" data-action="remove-player" data-index="${index}" ${length === 1 ? 'disabled' : ''}>${icon('trash')}</button>
  </div>`
}

function team(state) {
  const { own, draft, settings, session, busy, loading, dirty } = state
  const ended = closed(settings)
  const locked = !settings || ended
  return `${dashboardTitle('Área da equipe', own ? escape(own.team_name) : 'Inscrição da equipe', 'Monte o elenco e acompanhe a confirmação da organização.', authActions(state))}
  <main id="conteudo" class="container dashboard" tabindex="-1">
    ${loading ? '<p class="card loading" role="status">Carregando inscrição…</p>' : `
      ${own ? `<div class="card status-strip"><div><span class="section-icon">${icon('note')}</span><div><strong>Status da inscrição</strong><p>${ended ? 'Prazo de edição encerrado' : `Edição até ${deadlineLabel(settings)}`}</p></div></div>${badge(own.status)}</div>` : ''}
      ${session?.user.is_anonymous ? notice('Para editar em outro aparelho ou recuperar o acesso, vincule o Google enquanto esta sessão estiver ativa.', 'Você está como visitante') : ''}
      ${ended ? notice('A organização controla a data limite de inscrição e edição.', 'Prazo encerrado') : ''}
      ${locked ? own ? roster(own) : '' : `
      <form id="registration-form" class="team-form">
        <section class="card form-card">
          <div class="form-heading"><span class="section-icon">${icon('user')}</span><div><h2>Dados da equipe</h2><p>Informe o contato do representante adulto.</p></div></div>
          <fieldset ${busy ? 'disabled' : ''}>
            ${input('Nome da equipe', 'team_name', draft.team_name, 'maxlength="80" autocomplete="organization"')}
            <div class="field-grid">
              ${input('Nome do representante', 'representative_name', draft.representative_name, 'maxlength="90" autocomplete="name"')}
              ${input('WhatsApp com DDD', 'representative_phone', draft.representative_phone, 'maxlength="16" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="(11) 99999-9999"')}
            </div>
          </fieldset>
        </section>
        <section class="card form-card">
          <div class="form-heading spread"><div class="form-heading"><span class="section-icon">${icon('people')}</span><div><h2>Elenco</h2><p>Preencha de 5 a 15 vagas. Até 2 atletas nascidos em 2011.</p></div></div><span class="count">${draft.players.length}/15 vagas</span></div>
          <fieldset ${busy ? 'disabled' : ''}>
            <div class="player-list">${draft.players.map((player, index) => playerRow(player, index, draft.players.length)).join('')}</div>
            ${button('Adicionar atleta', 'add-player', {kind: 'secondary', symbol: icon('plus'), busy: draft.players.length === 15})}
          </fieldset>
        </section>
        <div class="form-end"><div><span class="form-note">${icon('shield')} As autorizações são entregues por fora do site.</span><p id="draft-note" aria-live="polite">${dirty ? 'Alterações ainda precisam ser salvas.' : ''}</p></div>
        <button class="button primary" type="submit" ${busy ? 'disabled' : ''}>${own ? 'Salvar alterações' : 'Enviar inscrição'}</button></div>
      </form>`}`}
  </main>`
}

function roster(team, duplicateKeys = new Set()) {
  return `<section class="card roster"><div class="roster-contact"><div><h3>Representante</h3><p>${escape(team.representative_name)} · ${escape(phone(team.representative_phone))}</p></div><span class="count">${team.players.length} atletas</span></div>
  <ol>${team.players.map(player => `<li><span>${escape(player.name)}${duplicateKeys.has(athleteKey(player)) ? '<small>Também consta em outra equipe</small>' : ''}</span><strong>${player.year}</strong></li>`).join('')}</ol></section>`
}

function adminList(state) {
  const teams = state.teams
  const filtered = state.filter ? teams.filter(team => team.status === state.filter) : teams
  const selected = filtered.find(team => team.id === state.selected)
  const seen = new Set()
  const duplicates = new Set()
  for (const team of teams) {
    for (const key of new Set(team.players.map(athleteKey))) {
      if (seen.has(key)) duplicates.add(key)
      seen.add(key)
    }
  }
  return `<div class="admin-list">
    <section class="card form-card admin-teams">
      <div class="form-heading spread"><div class="form-heading"><span class="section-icon">${icon('people')}</span><div><h2>Equipes inscritas</h2><p>${teams.length} ${teams.length === 1 ? 'inscrição recebida' : 'inscrições recebidas'}</p></div></div></div>
      <label class="field select-field"><span class="sr-only">Filtrar equipes por status</span><select id="filter-status">
        <option value="">Todos os status</option>
        ${Object.entries(statusNames).map(([key, value]) => `<option value="${key}" ${key === state.filter ? 'selected' : ''}>${value}</option>`).join('')}
      </select>${icon('down')}</label>
      <div class="teams-list">${filtered.length ? filtered.map(team => `<button type="button" class="team-item ${selected?.id === team.id ? 'selected' : ''}" aria-pressed="${selected?.id === team.id}" data-action="select-team" data-id="${escape(team.id)}">
        <strong>${escape(team.team_name)}</strong>${badge(team.status)}
      </button>`).join('') : '<p>Nenhuma equipe neste filtro.</p>'}</div>
    </section>
    ${selected ? `<section aria-label="Detalhes da equipe">
      <div class="card form-card team-review"><h2>${escape(selected.team_name)}</h2><p>Confira o elenco atual antes de alterar o status.</p>
      <form id="status-form" class="inline-form" data-id="${escape(selected.id)}">
        <label class="field select-field"><span>Status da equipe</span><select name="status" required>${Object.entries(statusNames).map(([key, value]) => `<option value="${key}" ${key === selected.status ? 'selected' : ''}>${value}</option>`).join('')}</select>${icon('down')}</label>
        <button class="button primary" type="submit" ${state.busy ? 'disabled' : ''}>Salvar status</button>
      </form></div>
      ${roster(selected, duplicates)}
    </section>` : '<div class="card admin-empty"><span class="section-icon">' + icon('note') + '</span><p>Selecione uma equipe para conferir o elenco.</p></div>'}
  </div>`
}

function admin(state) {
  return `${dashboardTitle('Área da organização', 'Painel da Copinha', 'Gerencie o prazo e acompanhe a situação das equipes.',
    `${button('Recarregar', 'admin', {kind: 'ghost', symbol: icon('refresh'), busy: state.busy || state.loading})}${authActions(state)}`)}
    <main id="conteudo" class="container dashboard" tabindex="-1">
      ${state.loading ? '<p class="card loading" role="status">Carregando painel…</p>' : `
      ${state.settings ? `<section class="card form-card settings-card">
        <div class="form-heading"><span class="section-icon">${icon('clock')}</span><div><h2>Prazo da competição</h2><p>Data limite para enviar ou editar elencos · horário de Brasília.</p></div></div>
        <form id="deadline-form" class="inline-form"><label class="field"><span>Encerramento</span><input type="datetime-local" name="deadline" value="${deadlineInput(state.settings.edit_deadline)}" required></label><button type="submit" class="button primary" ${state.busy ? 'disabled' : ''}>Salvar prazo</button></form>
      </section>` : ''}
      ${adminList(state)}`}
    </main>`
}

function adminGate(state) {
  return `${dashboardTitle('Área da organização', 'Acesso ao painel', 'O painel é reservado à administração do campeonato.', authActions(state))}
    <main id="conteudo" class="container dashboard" tabindex="-1"><section class="card access-card gate">
      <span class="section-icon">${icon('shield')}</span><h2>Entre com a conta da organização</h2>
      ${state.session && !state.session.user.is_anonymous
        ? '<p>Esta conta ainda não tem acesso de administrador master.</p>'
        : button('Continuar com Google', 'google-admin', {symbol: google, busy: state.busy})}
    </section></main>`
}

export function renderApp(state) {
  const view = { home: landing, team, admin, 'admin-gate': adminGate }[state.screen]
  return `${header(state)}${demoBar(state)}
    <div id="feedback" class="feedback" aria-live="polite">${state.message ? notice(state.message.text, '', state.message.kind) : ''}</div>
    ${view(state)}${footer}`
}
