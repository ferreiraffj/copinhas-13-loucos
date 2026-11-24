import './style.css'
import * as data from './data.js'
import { blankPlayer, draftIssues, normalizeName, phone, phoneDigits, validPhone, years } from './format.js'
import { readLogo } from './logo.js'
import { confirmedSection, firstSponsor, footer } from './public-content.js'
import { closed, renderApp } from './views.js'

const app = document.querySelector('#app')
const intentKey = 'copinha:auth-intent'
const registrationDraftKey = 'copinha:registration-draft'
const demoTeams = structuredClone(data.exampleTeams)
const state = {
  screen: 'home', settings: data.initialSettings, session: null, own: null,
  teams: data.configured ? [] : demoTeams, filter: '', selected: '',
  publicTeams: data.configured ? null : demoTeams.filter(team => team.status === 'confirmed'),
  publicTeamsFailed: false, sponsors: data.configured ? null : [{ ...firstSponsor }],
  sponsorDraft: { name: '', logo: null }, sponsorIndex: 0, contactDraft: null,
  contactInstagramDraft: null, contactEmailDraft: null,
  birthYearsDraft: null,
  sponsorPaused: matchMedia('(prefers-reduced-motion: reduce)').matches,
  logoErrors: { team: '', sponsor: '' }, logoRequest: null, touched: new Set(), submitted: false,
  draft: null, dirty: false, busy: false, loading: false, message: null, challenge: false,
}
let turnstileLoad
let widgetId

function emptyDraft() {
  return { team_name: '', representative_name: '', representative_phone: '', team_instagram: '', representative_instagram: '', logo: null, players: Array.from({ length: 5 }, blankPlayer) }
}

function storedDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(registrationDraftKey) ?? 'null')
    if (!saved || !Array.isArray(saved.players) || !saved.players.length) return null
    return {
      ...emptyDraft(),
      ...saved,
      players: saved.players.map(player => ({ name: String(player?.name ?? ''), year: String(player?.year ?? '') })),
    }
  } catch {
    return null
  }
}

function persistDraft() {
  if (!state.draft) return
  const value = {
    team_name: state.draft.team_name,
    representative_name: state.draft.representative_name,
    representative_phone: state.draft.representative_phone,
    team_instagram: state.draft.team_instagram,
    representative_instagram: state.draft.representative_instagram,
    logo: state.draft.logo,
    players: state.draft.players,
  }
  try {
    localStorage.setItem(registrationDraftKey, JSON.stringify(value))
  } catch {
    try {
      localStorage.setItem(registrationDraftKey, JSON.stringify({ ...value, logo: null }))
    } catch {
      // The in-memory draft still works when browser storage is unavailable.
    }
  }
}

function clearPersistedDraft() {
  try { localStorage.removeItem(registrationDraftKey) } catch { /* Storage may be disabled. */ }
}

function loadDraft() {
  const saved = storedDraft()
  const serverDraft = state.own ? {
    team_name: state.own.team_name,
    representative_name: state.own.representative_name,
    representative_phone: phone(state.own.representative_phone),
    team_instagram: state.own.team_instagram ?? '',
    representative_instagram: state.own.representative_instagram ?? '',
    players: structuredClone(state.own.players),
    logo: state.own.logo ?? null,
  } : emptyDraft()
  state.draft = saved ?? serverDraft
  state.dirty = Boolean(saved)
  state.touched.clear()
  state.submitted = false
  state.logoErrors.team = ''
}

function draw(focus, animate = false) {
  if (widgetId !== undefined) {
    window.turnstile.remove(widgetId)
    widgetId = undefined
  }
  app.innerHTML = renderApp(state)
  if (animate) {
    app.classList.remove('screen-enter')
    void app.offsetWidth
    app.classList.add('screen-enter')
  }
  showDraftIssues()
  if (focus) document.querySelector(focus)?.focus()
}

function report(text, kind = 'success') {
  state.message = { text, kind }
}

function reportError(error, fallback) {
  const details = error.code === 'P0001' || error.code === '42501' || !error.code
  report(details && error.message ? error.message : fallback, 'error')
}

function navigate(screen, animate = false) {
  state.screen = screen
  state.message = null
  state.challenge = false
  if (screen === 'home') {
    if (data.configured) void refreshPublic()
    else state.publicTeams = state.teams.filter(team => team.status === 'confirmed')
  }
  draw('#conteudo', animate)
  window.scrollTo(0, 0)
}

async function refreshPublic(updateView = true) {
  const [teams, sponsors] = await Promise.allSettled([data.confirmedTeams(), data.sponsors()])
  state.publicTeamsFailed = teams.status === 'rejected'
  if (teams.status === 'fulfilled') state.publicTeams = teams.value
  if (sponsors.status === 'fulfilled') state.sponsors = sponsors.value
  if (updateView && state.screen === 'home' && !state.challenge && !state.busy) {
    const active = document.activeElement
    const publicSection = document.querySelector('#equipes-confirmadas')
    const footerElement = document.querySelector('.site-footer')
    // Preserve focus and sign-in controls during public updates.
    if (publicSection) publicSection.outerHTML = confirmedSection(state)
    if (footerElement && !footerElement.contains(active)) footerElement.outerHTML = footer(state)
  }
}

function showDraftIssues() {
  const form = document.querySelector('#registration-form')
  if (!form) return
  const issues = draftIssues(state.draft, state.settings?.birth_years ?? years)
  for (const field of form.querySelectorAll('[data-issue]')) {
    const key = field.dataset.issue
    const value = state.submitted || state.touched.has(key) ? issues[key] : ''
    if (value) field.setAttribute('aria-invalid', 'true')
    else field.removeAttribute('aria-invalid')
    showIssue(key, value)
  }
  showIssue('roster', state.submitted || state.touched.has('roster') ? issues.roster : '')
}

function showIssue(key, message) {
  const slot = document.getElementById('issue-' + key)
  if (!slot) return
  const value = message ?? ''
  if (slot.textContent !== value) slot.textContent = value
  slot.hidden = !value
}

function markDirty() {
  state.dirty = true
  persistDraft()
  const note = document.querySelector('#draft-note')
  if (note) note.textContent = 'Alterações ainda precisam ser salvas.'
}

function maskPhone(input) {
  const digitsBeforeCaret = phoneDigits(input.value.slice(0, input.selectionStart)).length
  const formatted = phone(input.value)
  if (formatted === input.value) return
  input.value = formatted
  if (digitsBeforeCaret === 0) {
    input.setSelectionRange(0, 0)
    return
  }
  let position = 0
  let seen = 0
  while (position < formatted.length && seen < digitsBeforeCaret) {
    if (/\d/.test(formatted[position])) seen++
    position++
  }
  input.setSelectionRange(position, position)
}

async function selectLogo(input, kind) {
  const file = input.files[0]
  if (!file) return
  if (state.busy) {
    input.value = ''
    return
  }
  const target = kind === 'team' ? state.draft : state.sponsorDraft
  const request = {}
  state.logoRequest = request
  state.logoErrors[kind] = ''
  input.setAttribute('aria-busy', 'true')
  try {
    const logo = await readLogo(file)
    if (state.logoRequest !== request) return
    target.logo = logo
    if (kind === 'team' && target === state.draft) markDirty()
  } catch (error) {
    if (state.logoRequest === request) state.logoErrors[kind] = error.message
  } finally {
    if (state.logoRequest === request) {
      state.logoRequest = null
      if (input.isConnected) draw('#' + kind + '-logo')
      else if (document.getElementById(kind + '-logo')) draw()
    }
  }
}

function slideSponsor(step) {
  const length = state.sponsors?.length ?? 0
  if (length < 2) return
  state.sponsorIndex = (state.sponsorIndex % length + step + length) % length
  document.querySelectorAll('.sponsor-slide').forEach((slide, index) => {
    slide.hidden = index !== state.sponsorIndex
  })
}

function mayLeave() {
  return !state.dirty || state.screen !== 'team' || window.confirm('Você tem alterações sem salvar. Deseja sair da inscrição?')
}

async function openTeam() {
  if (state.screen === 'team') return
  if (data.configured && !state.session) {
    navigate('home')
    return
  }
  state.loading = data.configured
  loadDraft()
  navigate('team', true)
  if (!data.configured) return
  try {
    const [settings, own] = await Promise.all([data.settings(), data.ownRegistration(state.session.user.id)])
    state.settings = settings
    state.own = own
    loadDraft()
  } catch (error) {
    state.settings = null
    reportError(error, 'Não foi possível carregar a inscrição. Volte ao início e tente novamente.')
  } finally {
    state.loading = false
    draw()
  }
}

async function openAdmin() {
  if (!mayLeave()) return
  if (data.configured && (!state.session || state.session.user.is_anonymous)) {
    navigate('admin-gate', true)
    return
  }
  if (!data.configured) {
    navigate('admin', true)
    return
  }
  state.loading = true
  state.screen = 'admin-gate'
  state.message = null
  draw(undefined, true)
  try {
    if (!await data.isMaster()) {
      navigate('admin-gate', true)
      return
    }
    state.screen = 'admin'
    draw(undefined, true)
    const [settings, teams, sponsors] = await Promise.all([
      data.settings(), data.allRegistrations(), data.sponsors().catch(() => null),
    ])
    state.settings = settings
    state.teams = teams
    state.sponsors = sponsors
    state.contactDraft = null
    state.contactInstagramDraft = null
    state.contactEmailDraft = null
    state.birthYearsDraft = null
    window.scrollTo(0, 0)
  } catch (error) {
    state.teams = []
    state.selected = ''
    reportError(error, 'Não foi possível carregar o painel da organização.')
  } finally {
    state.loading = false
    draw('#conteudo')
  }
}

async function google(intent, linking = false) {
  state.busy = true
  state.message = null
  state.challenge = false
  draw()
  sessionStorage.setItem(intentKey, intent)
  const options = { redirectTo: location.origin + location.pathname }
  try {
    const provider = { provider: 'google', options }
    const result = linking ? await data.supabase.auth.linkIdentity(provider) : await data.supabase.auth.signInWithOAuth(provider)
    if (result.error) throw result.error
  } catch (error) {
    sessionStorage.removeItem(intentKey)
    state.busy = false
    report(error.code === 'identity_already_exists'
      ? 'Essa conta Google já tem um cadastro. Use outra conta para vincular esta inscrição.'
      : 'Não foi possível abrir o acesso com Google. Tente novamente.', 'error')
    draw('#feedback')
  }
}

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve()
  if (!turnstileLoad) {
    turnstileLoad = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.onload = resolve
      script.onerror = () => {
        script.remove()
        turnstileLoad = null
        reject(new Error('Não foi possível carregar a verificação. Tente de novo.'))
      }
      document.head.append(script)
    })
  }
  return turnstileLoad
}

async function visitor(captchaToken) {
  state.challenge = false
  state.busy = true
  state.message = null
  draw()
  try {
    const result = await data.supabase.auth.signInAnonymously({ options: { captchaToken } })
    if (result.error) throw result.error
    state.session = result.data.session
    await openTeam()
  } catch (error) {
    const visitorErrors = {
      anonymous_provider_disabled: 'A entrada como visitante está desativada. Entre com Google ou fale com a organização.',
      signup_disabled: 'O cadastro de novos acessos está desativado. Fale com a organização.',
      captcha_failed: 'Não foi possível verificar o CAPTCHA. Tente novamente ou entre com Google.',
    }
    report(visitorErrors[error.code] ?? 'Não foi possível entrar como visitante. Tente novamente ou entre com Google.', 'error')
  } finally {
    state.busy = false
    draw()
  }
}

async function startVisitor() {
  if (!data.turnstileKey) {
    await visitor()
    return
  }
  state.challenge = true
  draw()
  try {
    await loadTurnstile()
    if (!state.challenge || widgetId !== undefined) return
    widgetId = window.turnstile.render('#turnstile', {
      sitekey: data.turnstileKey,
      language: 'pt-br',
      callback: token => visitor(token),
    })
  } catch {
    state.challenge = false
    report('Não foi possível carregar a verificação. Tente de novo.', 'error')
    draw()
  }
}

async function logout() {
  if (!mayLeave()) return
  if (state.session?.user.is_anonymous && !window.confirm('Sair encerra o acesso de visitante a esta inscrição. Deseja sair mesmo assim?')) return
  state.busy = true
  draw()
  try {
    const { error } = await data.supabase.auth.signOut({ scope: 'local' })
    if (error) throw error
    clearSession()
  } catch {
    report('Não foi possível sair. Tente novamente.', 'error')
  } finally {
    state.busy = false
    draw()
  }
}

function clearSession() {
  state.session = null
  state.own = null
  state.teams = []
  state.selected = ''
  loadDraft()
  navigate('home')
}

function updateDemoTeam(team) {
  const existing = state.teams.findIndex(item => item.id === team.id)
  if (existing === -1) state.teams.push(team)
  else state.teams[existing] = team
  if (state.own?.id === team.id) state.own = team
}

async function submitRegistration() {
  if (!state.settings || closed(state.settings)) {
    report('O prazo de inscrição e edição já encerrou.', 'error')
    draw()
    return
  }
  const draft = {
    team_name: state.draft.team_name.trim(),
    representative_name: state.draft.representative_name.trim(),
    representative_phone: state.draft.representative_phone.replace(/\D/g, ''),
    team_instagram: state.draft.team_instagram.trim().replace(/^@+/, ''),
    representative_instagram: state.draft.representative_instagram.trim().replace(/^@+/, ''),
    logo: state.draft.logo,
    players: state.draft.players.map(player => ({ name: normalizeName(player.name), year: Number(player.year) })),
  }
  for (const instagram of [draft.team_instagram, draft.representative_instagram]) {
    if (instagram && !/^[a-z0-9._]{1,30}$/i.test(instagram)) {
      throw new Error('Informe um Instagram válido ou deixe o campo em branco.')
    }
  }
  const existing = state.own
  if (data.configured) {
    state.own = await data.saveRegistration(draft, existing?.revision ?? 0)
  } else {
    const needsReview = JSON.stringify(draft.players) !== JSON.stringify(existing?.players)
      || draft.team_name !== existing?.team_name || draft.logo !== existing?.logo
      || draft.team_instagram !== existing?.team_instagram || draft.representative_instagram !== existing?.representative_instagram
    state.own = {
      ...draft, id: 'preview-own', revision: (existing?.revision ?? 0) + 1,
      status: existing?.status === 'confirmed' && needsReview ? 'pending' : existing?.status ?? 'pending',
    }
    updateDemoTeam(state.own)
  }
  clearPersistedDraft()
  loadDraft()
  report(existing?.status === 'confirmed' && state.own.status === 'pending'
    ? 'Alterações salvas. A organização precisa conferir a inscrição atualizada.'
    : existing ? 'Alterações salvas.' : 'Inscrição enviada. Agora entregue as autorizações à organização.')
}

async function submitStatus(form) {
  const team = state.teams.find(item => item.id === form.dataset.id)
  if (!team) return
  const status = form.elements.status.value
  const updated = data.configured
    ? await data.saveStatus(team.id, status, team.revision)
    : { ...team, status, revision: team.revision + 1 }
  updateDemoTeam(updated)
  if (state.filter && state.filter !== status) state.filter = ''
  report('Status atualizado.')
}

async function submitDeadline(form) {
  const current = state.settings.edit_deadline
  const datetime = form.elements.deadline
  if (datetime.value === datetime.defaultValue) {
    report('O prazo continua o mesmo.')
    return
  }
  const cutOff = new Date(datetime.value + ':00-03:00').toISOString()
  if (cutOff === current) return
  state.settings = data.configured
    ? await data.saveDeadline(cutOff, state.settings.revision)
    : { ...state.settings, edit_deadline: cutOff, revision: state.settings.revision + 1 }
  report('Prazo atualizado no horário de Brasília.')
}

async function submitBirthYears(form) {
  const values = [...new Set(form.elements.birth_years.value
    .split(',')
    .map(value => Number(value.trim()))
    .filter(Number.isInteger))]
  if (!values.length || values.some(year => year < 1900 || year > 2100)) {
    throw new Error('Informe pelo menos um ano válido entre 1900 e 2100.')
  }
  values.sort((a, b) => a - b)
  const revision = state.settings.revision
  state.settings = data.configured
    ? await data.saveBirthYears(values, revision)
    : { ...state.settings, birth_years: values, revision: revision + 1 }
  state.birthYearsDraft = null
  report('Anos de nascimento atualizados.')
}

async function submitContact(form) {
  const entered = form.elements.contact_phone.value
  const instagram = form.elements.contact_instagram.value.trim().replace(/^@+/, '') || null
  const email = form.elements.contact_email.value.trim() || null
  if (instagram && !/^[a-z0-9._]{1,30}$/i.test(instagram)) throw new Error('Informe um Instagram válido.')
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Informe um e-mail válido.')
  if (entered && !validPhone(entered)) throw new Error('Informe um WhatsApp válido com DDD.')
  const contact = phoneDigits(entered) || null
  const revision = state.settings.revision
  state.settings = data.configured
    ? await data.saveContact(contact, instagram, email, revision)
    : { ...state.settings, contact_phone: contact, contact_instagram: instagram, contact_email: email, revision: revision + 1 }
  state.contactDraft = null
  state.contactInstagramDraft = null
  state.contactEmailDraft = null
  report('Contatos da organização atualizados.')
}

async function submitSponsor() {
  if (!state.sponsorDraft.logo) throw new Error('Escolha a logo do patrocinador.')
  if (state.sponsors.length >= 20) throw new Error('O rodapé comporta até 20 patrocinadores.')
  const sponsor = data.configured
    ? await data.addSponsor(state.sponsorDraft)
    : { ...state.sponsorDraft, id: crypto.randomUUID() }
  state.sponsors.push(sponsor)
  state.sponsorDraft = { name: '', logo: null }
  state.logoErrors.sponsor = ''
  report('Patrocinador publicado no rodapé.')
}

async function deleteSponsor(button) {
  if (!window.confirm('Remover este patrocinador do rodapé?')) return
  state.busy = true
  try {
    const id = button.dataset.id
    if (data.configured) await data.removeSponsor(id)
    state.sponsors = state.sponsors.filter(sponsor => sponsor.id !== id)
    state.sponsorIndex = 0
    report('Patrocinador removido.')
  } catch (error) {
    reportError(error, 'Não foi possível remover o patrocinador.')
  } finally {
    state.busy = false
    draw('#feedback .notice')
  }
}

const actions = {
  home() {
    if (mayLeave()) navigate('home')
  },
  about() {
    if (!mayLeave()) return
    if (state.screen !== 'home') navigate('home', true)
    document.querySelector('#about-title').focus({ preventScroll: true })
    document.querySelector('#sobre').scrollIntoView({ behavior: 'smooth', block: 'start' })
  },
  team: openTeam,
  'sponsor-prev': () => slideSponsor(-1),
  'sponsor-next': () => slideSponsor(1),
  'sponsor-toggle'(button) {
    state.sponsorPaused = !state.sponsorPaused
    button.textContent = state.sponsorPaused ? 'Reproduzir' : 'Pausar'
  },
  'remove-sponsor': deleteSponsor,
  'clear-sponsor-logo'() {
    state.sponsorDraft.logo = null
    state.logoErrors.sponsor = ''
    draw('#sponsor-logo')
  },
  'clear-team-logo'() {
    state.draft.logo = null
    state.logoErrors.team = ''
    markDirty()
    draw('#team-logo')
  },
  admin: openAdmin,
  google: () => google('team'),
  'google-admin': () => google('admin'),
  link: () => google(state.screen === 'admin-gate' ? 'admin' : 'team', true),
  guest: startVisitor,
  logout,
  'add-player'() {
    if (state.draft.players.length >= 15) return
    state.draft.players.push(blankPlayer())
    state.dirty = true
    draw(`[data-player="${state.draft.players.length - 1}"][data-field="name"]`)
  },
  'remove-player'(button) {
    const index = Number(button.dataset.index)
    if (state.draft.players.length <= 1) return
    state.draft.players.splice(index, 1)
    state.touched = new Set([...state.touched].flatMap(key => {
      const field = /^(name|year)-(\d+)$/.exec(key)
      if (!field) return [key]
      const row = Number(field[2])
      if (row === index) return []
      return [field[1] + '-' + (row > index ? row - 1 : row)]
    }))
    state.touched.add('roster')
    state.dirty = true
    const nextIndex = Math.min(index, state.draft.players.length - 1)
    draw(`[data-player="${nextIndex}"][data-field="name"]`)
  },
  'select-team'(button) {
    state.selected = button.dataset.id
    draw('[aria-pressed="true"]')
  },
}

app.addEventListener('click', event => {
  const button = event.target.closest('[data-action]')
  if (!button || state.busy || state.loading || state.logoRequest) return
  const action = actions[button.dataset.action]
  if (action) void action(button)
})

app.addEventListener('beforeinput', event => {
  const field = event.target
  if (!field.matches('[data-phone]') || field.selectionStart !== field.selectionEnd) return
  const start = field.selectionStart
  const backward = event.inputType === 'deleteContentBackward'
  const forward = event.inputType === 'deleteContentForward'
  if (!backward && !forward) return
  let index = backward ? start - 1 : start
  if (!/[() -]/.test(field.value[index] ?? '')) return
  while (index >= 0 && index < field.value.length && !/\d/.test(field.value[index])) index += backward ? -1 : 1
  if (index < 0 || index >= field.value.length) return
  event.preventDefault()
  field.setRangeText('', index, index + 1, 'start')
  field.dispatchEvent(new Event('input', { bubbles: true }))
})

app.addEventListener('input', event => {
  const field = event.target
  if (field.type === 'file') return
  if (field.matches('[data-phone]')) maskPhone(field)
  if (field.name === 'contact_phone') {
    state.contactDraft = field.value
    showIssue('contact_phone', field.value && !validPhone(field.value) ? 'Informe um WhatsApp válido com DDD.' : '')
    return
  }
  if (field.name === 'contact_instagram') {
    state.contactInstagramDraft = field.value
    return
  }
  if (field.name === 'contact_email') {
    state.contactEmailDraft = field.value
    return
  }
  if (field.name === 'birth_years') {
    state.birthYearsDraft = field.value
    return
  }
  if (field.name === 'sponsor_name') state.sponsorDraft.name = field.value
  if (field.form?.id !== 'registration-form') return
  if (field.dataset.player !== undefined) {
    state.draft.players[Number(field.dataset.player)][field.dataset.field] = field.value
  } else if (field.name in state.draft) {
    state.draft[field.name] = field.value
  }
  if (field.dataset.issue) state.touched.add(field.dataset.issue)
  markDirty()
  showDraftIssues()
})

app.addEventListener('focusout', event => {
  const field = event.target
  if (field.form?.id !== 'registration-form' || !field.dataset.issue) return
  state.touched.add(field.dataset.issue)
  showDraftIssues()
})

app.addEventListener('change', event => {
  const id = event.target.id
  if (id === 'team-logo' || id === 'sponsor-logo') void selectLogo(event.target, id.split('-')[0])
  if (id === 'filter-status') {
    state.filter = event.target.value
    draw('#filter-status')
  }
})

app.addEventListener('submit', async event => {
  event.preventDefault()
  if (state.busy || state.loading || state.logoRequest) return
  const form = event.target
  if (form.id === 'registration-form') {
    state.submitted = true
    showDraftIssues()
    if (Object.keys(draftIssues(state.draft, state.settings?.birth_years ?? years)).length) {
      const invalid = form.querySelector('[aria-invalid="true"]:not([type="file"])') ?? form.querySelector('#issue-roster')
      invalid?.focus()
      return
    }
  }
  const handler = { 'registration-form': submitRegistration, 'status-form': submitStatus, 'deadline-form': submitDeadline, 'birth-years-form': submitBirthYears, 'contact-form': submitContact, 'sponsor-form': submitSponsor }[form.id]
  if (!handler) return
  state.busy = true
  state.message = null
  const submitButton = event.submitter
  if (submitButton) submitButton.disabled = true
  const fields = form.querySelectorAll('input, select, button')
  const enabled = Array.from(fields).filter(field => !field.disabled)
  enabled.forEach(field => { field.disabled = true })
  try {
    await handler(form)
  } catch (error) {
    reportError(error, 'Não foi possível salvar. Tente novamente.')
    if (form.id === 'registration-form' && error.message?.includes('encerrou')) {
      try { state.settings = await data.settings() } catch { state.settings = null }
    }
  } finally {
    state.busy = false
    draw('#feedback .notice')
    document.querySelector('#feedback .notice')?.scrollIntoView({ block: 'nearest' })
  }
})

window.addEventListener('beforeunload', event => {
  if (state.dirty && state.screen === 'team') {
    event.preventDefault()
    event.returnValue = ''
  }
})

async function initialize() {
  loadDraft()
  draw()
  if (!data.configured) {
    if (closed(state.settings)) state.settings = data.demoSettings()
    draw()
    return
  }
  try {
    state.busy = true
    draw()
    const callback = new URLSearchParams(location.search)
    const callbackError = callback.get('error_code') || new URLSearchParams(location.hash.slice(1)).get('error_code')
    const intent = sessionStorage.getItem(intentKey)
    sessionStorage.removeItem(intentKey)
    const [sessionResult, settingsResult] = await Promise.allSettled([
      data.supabase.auth.getSession(), data.settings(), refreshPublic(false),
    ])
    if (sessionResult.status === 'fulfilled') state.session = sessionResult.value.data.session
    if (settingsResult.status === 'fulfilled') state.settings = settingsResult.value
    else report('Não foi possível carregar o prazo. Recarregue a página para tentar novamente.', 'error')
    if (intent && state.session) {
      if (intent === 'admin') await openAdmin()
      else await openTeam()
    }
    if (callbackError) {
      report(callbackError === 'identity_already_exists'
        ? 'Essa conta Google já pertence a outro cadastro. Escolha outra conta para vincular a inscrição.'
        : 'O acesso com Google não foi concluído. Tente novamente.', 'error')
      history.replaceState(history.state, '', location.pathname)
    }
    data.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' && state.session && !state.busy) clearSession()
      else if (session?.user.id === state.session?.user.id && session) state.session = session
    })
  } catch {
    report('Não foi possível conectar à plataforma de inscrições.', 'error')
  } finally {
    state.busy = false
    draw()
  }
}

let previouslyClosed
setInterval(() => {
  const isClosed = closed(state.settings)
  if (isClosed && !previouslyClosed && !state.busy && (state.screen === 'team' || state.screen === 'home')) draw()
  if (!state.busy) previouslyClosed = isClosed
}, 15000)

setInterval(() => {
  const carousel = document.querySelector('.sponsors-footer')
  if (!document.hidden && !state.sponsorPaused && !carousel?.matches(':hover, :focus-within')) slideSponsor(1)
}, 4500)

void initialize()
