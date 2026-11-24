import { aboutSection, confirmedSection, footer, sponsorEmblem, teamEmblem } from './public-content.js'
import { logoHelp, logoTypes } from './logo.js'
import { configured } from './data.js'
import { google, icon } from './icons.js'
import { athleteKey, deadlineDay, deadlineInput, deadlineTime, escape, phone, statusNames, years } from './format.js'

const logo = '<img class="brand-logo" src="/logotipo.png" alt="Copinha 13 Loucos" width="2172" height="724">'
const crestLogo = '<img class="brand-crest" src="/brasao.png" alt="Brasão Copinha 13 Loucos" width="908" height="908">'

export const badge = status => `<span class="badge ${escape(status)}"><i></i>${escape(statusNames[status])}</span>`
export const deadlineLabel = settings => settings ? `${deadlineDay(settings.edit_deadline)}, às ${deadlineTime(settings.edit_deadline)}` : 'Prazo indisponível'
export const closed = settings => settings && Date.now() >= Date.parse(settings.edit_deadline)

function button(label, action, { kind = 'primary', symbol = '', busy = false } = {}) {
  return `<button class="button ${kind}" type="button" data-action="${action}" ${busy ? 'disabled' : ''}>${symbol}${label}</button>`
}

function header(state) {
  return `<header class="site-header"><div class="container nav">
    <button type="button" class="brand-home" data-action="home" aria-label="Copinha 13 Loucos, início">${crestLogo}</button>
    <nav aria-label="Navegação principal">
      ${button('Sobre', 'about', {kind: 'nav-link'})}
      ${state.session || state.screen === 'team' || state.screen === 'admin' ? button('Minha equipe', 'team', {kind: 'nav-link'}) : ''}
      ${button('<span class="org-label">Área da organização</span><span class="org-short">Organização</span>', 'admin', {kind: 'nav-link', symbol: icon('shield')})}
    </nav>
  </div></header>`
}

function hero(settings) {
  return `<section class="hero">
    <div class="court-art" aria-hidden="true"><div class="court-lines"><i></i><b></b></div></div>
    <div class="container hero-inner">
      <div class="hero-kicker"><span></span> TORNEIO DE FUTSAL <span></span></div>
      <div class="hero-logo">${logo}</div>
      <h1>Formulário de inscrição</h1>
      <p>Inscrição 100% gratuita. Premiação para 1º e 2º lugar, artilheiro(a) e melhor goleiro(a).</p>
      <div class="hero-meta">
        <span>${icon('calendar')}${settings && closed(settings) ? 'Inscrições encerradas' : settings ? `Até ${deadlineDay(settings.edit_deadline)}` : 'Consulte o prazo de inscrição'}</span>
        <span>${icon('pin')}Quadra da Praça - Jardim América, KM40 - Itaquá</span>
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
    <p>${ended && configured ? 'Entre para consultar uma inscrição existente.' : 'Cadastre o representante e monte a relação de atletas da sua equipe.'}</p>
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
          <h3>De 5 a 15 atletas por equipe</h3><p>Nascidos de 2012 a 2015. Até dois atletas de 2011 por equipe.</p>
        </div></div>
        <div class="info-row"><span class="section-icon">${icon('shield')}</span><div>
          <h3>Autorizações com a organização</h3><p>Entregue as autorizações assinadas conforme as orientações da organização e acompanhe o status aqui.</p>
        </div></div>
      </aside>
      ${confirmedSection(state)}
      ${aboutSection(state.settings)}
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

function fieldError(key) {
  return `<small class="field-error" id="issue-${key}" tabindex="-1" aria-live="polite" hidden></small>`
}

function input(label, name, value, attributes = '', issue = name) {
  return `<div class="field"><label for="${issue}">${label}</label><input id="${issue}" name="${name}" value="${escape(value)}" data-issue="${issue}" aria-describedby="issue-${issue}" ${attributes}>${fieldError(issue)}</div>`
}

function imagePicker(kind, item, error, busy) {
  const image = kind === 'team' ? teamEmblem(item, true) : item.logo ? teamEmblem(item) : ''
  const description = kind === 'team' ? 'Logo da equipe (opcional)' : 'Logo do patrocinador'
  return `<div class="logo-picker">
    ${image}
    <div class="field"><label for="${kind}-logo">${description}</label>
      <input id="${kind}-logo" type="file" accept="${logoTypes}" aria-describedby="${kind}-logo-help ${kind}-logo-error" aria-invalid="${Boolean(error)}" ${busy ? 'disabled' : ''}>
      <small class="field-help" id="${kind}-logo-help">${item.logo ? 'Logo pronta para salvar. ' : ''}${logoHelp}${kind === 'team' ? ' A organização pode publicar a logo após a confirmação.' : ''}</small>
      <small class="field-error" id="${kind}-logo-error" aria-live="polite" ${error ? '' : 'hidden'}>${escape(error)}</small>
    </div>
    ${item.logo ? button('Remover logo', 'clear-' + kind + '-logo', {kind: 'secondary', busy}) : ''}
  </div>`
}

function playerRow(player, index, length, availableYears) {
  return `<div class="player-row"><span class="player-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
    <div class="field">
      <label class="sr-only" for="name-${index}">Nome completo do atleta ${index + 1}</label>
      <input id="name-${index}" placeholder="Nome completo" autocomplete="off" data-player="${index}" data-field="name" data-issue="name-${index}" aria-describedby="issue-name-${index}" maxlength="90" required value="${escape(player.name)}">
      ${fieldError('name-' + index)}
    </div>
    <div class="field select-field">
      <label class="sr-only" for="year-${index}">Ano de nascimento do atleta ${index + 1}</label>
      <div class="select-control"><select id="year-${index}" data-player="${index}" data-field="year" data-issue="year-${index}" aria-describedby="issue-year-${index}" required><option value="">Ano de nascimento</option>${availableYears.map(year => `<option value="${year}" ${Number(player.year) === year ? 'selected' : ''}>${year}</option>`).join('')}</select>${icon('down')}</div>
      ${fieldError('year-' + index)}
    </div>
    <button type="button" class="icon-button" aria-label="Remover atleta ${index + 1}" title="Remover atleta" data-action="remove-player" data-index="${index}" ${length === 1 ? 'disabled' : ''}>${icon('trash')}</button>
  </div>`
}

function team(state) {
  const { own, draft, settings, session, busy, loading, dirty } = state
  const ended = closed(settings)
  const locked = !settings || ended
  const availableYears = settings?.birth_years ?? years
  return `${dashboardTitle('Área da equipe', own ? escape(own.team_name) : 'Inscrição da equipe', 'Monte o elenco e acompanhe a confirmação da organização.', authActions(state))}
  <main id="conteudo" class="container dashboard" tabindex="-1">
    ${loading ? '<p class="card loading" role="status">Carregando inscrição…</p>' : `
      ${own ? `<div class="card status-strip"><div><span class="section-icon">${icon('note')}</span><div><strong>Status da inscrição</strong><p>${ended ? 'Prazo de edição encerrado' : `Edição até ${deadlineLabel(settings)}`}</p></div></div>${badge(own.status)}</div>` : ''}
      ${session?.user.is_anonymous ? notice('Para editar em outro aparelho ou recuperar o acesso, vincule o Google enquanto esta sessão estiver ativa.', 'Você está como visitante') : ''}
      ${ended ? notice('A organização controla a data limite de inscrição e edição.', 'Prazo encerrado') : ''}
      ${locked ? own ? roster(own) : '' : `
      <form id="registration-form" class="team-form" novalidate>
        <section class="card form-card">
          <div class="form-heading"><span class="section-icon">${icon('user')}</span><div><h2>Dados da equipe</h2><p>Informe o contato do representante adulto.</p></div></div>
          <fieldset ${busy ? 'disabled' : ''}>
            ${input('Nome da equipe', 'team_name', draft.team_name, 'required maxlength="80" autocomplete="organization"')}
            ${input('Instagram da equipe (opcional)', 'team_instagram', draft.team_instagram, 'maxlength="40" placeholder="@equipe"')}
            <div class="field-grid">
              ${input('Nome do representante', 'representative_name', draft.representative_name, 'required maxlength="90" autocomplete="name"')}
              ${input('WhatsApp com DDD', 'representative_phone', draft.representative_phone, 'required type="tel" data-phone inputmode="tel" autocomplete="tel-national" placeholder="(11) 99999-9999"')}
              ${input('Instagram do responsável (opcional)', 'representative_instagram', draft.representative_instagram, 'maxlength="40" placeholder="@responsavel"')}
            </div>
            ${imagePicker('team', draft, state.logoErrors.team, busy)}
          </fieldset>
        </section>
        <section class="card form-card">
          <div class="form-heading spread"><div class="form-heading"><span class="section-icon">${icon('people')}</span><div><h2>Elenco</h2><p>Preencha de 5 a 15 vagas. Até 2 atletas nascidos em 2011.</p></div></div><span class="count">${draft.players.length}/15 vagas</span></div>
          <fieldset ${busy ? 'disabled' : ''}>
            ${fieldError('roster')}
            <div class="player-list">${draft.players.map((player, index) => playerRow(player, index, draft.players.length, availableYears)).join('')}</div>
            ${button('Adicionar atleta', 'add-player', {kind: 'secondary', symbol: icon('plus'), busy: draft.players.length === 15})}
          </fieldset>
        </section>
        <div class="form-end"><div><span class="form-note">${icon('shield')} As autorizações são entregues por fora do site.</span><p id="draft-note" aria-live="polite">${dirty ? 'Alterações ainda precisam ser salvas.' : ''}</p></div>
        <button class="button primary" type="submit" ${busy ? 'disabled' : ''}>${own ? 'Salvar alterações' : 'Enviar inscrição'}</button></div>
      </form>`}`}
  </main>`
}

function roster(team, duplicateKeys = new Set()) {
  return `<section class="card roster"><div class="roster-contact">${teamEmblem(team)}<div><h3>Representante</h3><p>${escape(team.representative_name)} · ${escape(phone(team.representative_phone))}</p></div><span class="count">${team.players.length} atletas</span></div>
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
      ${state.settings ? `<section class="card form-card settings-card">
        <div class="form-heading"><span class="section-icon">${icon('people')}</span><div><h2>Anos de nascimento</h2><p>Defina quais anos podem ser inscritos no campeonato.</p></div></div>
        <form id="birth-years-form" class="inline-form">
          ${input('Anos aceitos', 'birth_years', state.birthYearsDraft ?? (state.settings.birth_years ?? years).join(', '), 'required inputmode="numeric" placeholder="2011, 2012, 2013, 2014"')}
          <button type="submit" class="button primary" ${state.busy ? 'disabled' : ''}>Salvar anos</button>
        </form>
        <p class="field-help settings-help">Separe os anos por vírgulas. Exemplo: 2012, 2013, 2014.</p>
      </section>` : ''}
      ${adminList(state)}
      ${adminExtras(state)}`}
    </main>`
}

function adminExtras(state) {
  return `<div class="admin-settings">
    ${state.settings ? `<section class="card form-card">
      <div class="form-heading"><span class="section-icon">${icon('user')}</span><div><h2>Contato público</h2><p>Os canais de contato aparecerão na seção Sobre.</p></div></div>
      <form id="contact-form" class="inline-form">
        ${input('Instagram', 'contact_instagram', state.contactInstagramDraft ?? state.settings.contact_instagram ?? '', 'type="text" maxlength="40" placeholder="@13_loucos"')}
        ${input('E-mail', 'contact_email', state.contactEmailDraft ?? state.settings.contact_email ?? '', 'type="email" maxlength="254" autocomplete="email" placeholder="contato@exemplo.com"')}
        ${input('WhatsApp da organização', 'contact_phone', state.contactDraft ?? phone(state.settings.contact_phone), 'type="tel" data-phone inputmode="tel" autocomplete="tel-national" placeholder="(11) 99999-9999"')}
        <button class="button primary" type="submit" ${state.busy ? 'disabled' : ''}>Salvar contato</button>
      </form>
    </section>` : ''}
    <section class="card form-card">
      <div class="form-heading"><span class="section-icon">${icon('shield')}</span><div><h2>Patrocinadores</h2><p>Gerencie as logos que aparecem no carrossel do rodapé.</p></div></div>
      ${state.sponsors === null ? '<p>Não foi possível carregar os patrocinadores. Recarregue o painel.</p>' : `
        ${state.sponsors.length ? `<ul class="sponsor-list">${state.sponsors.map(sponsor => `<li>
          ${sponsorEmblem(sponsor)}<strong>${escape(sponsor.name)}</strong>
          <button class="icon-button" type="button" data-action="remove-sponsor" data-id="${escape(sponsor.id)}" aria-label="Remover patrocinador ${escape(sponsor.name)}">${icon('trash')}</button>
        </li>`).join('')}</ul>` : '<p>Nenhum patrocinador cadastrado.</p>'}
        <form id="sponsor-form">
          ${input('Nome do patrocinador', 'sponsor_name', state.sponsorDraft.name, 'required minlength="2" maxlength="80"')}
          ${imagePicker('sponsor', state.sponsorDraft, state.logoErrors.sponsor, state.busy)}
          <button class="button primary" type="submit" ${state.busy ? 'disabled' : ''}>Adicionar patrocinador</button>
        </form>`}
    </section>
  </div>`
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
    ${view(state)}${footer(state)}`
}
