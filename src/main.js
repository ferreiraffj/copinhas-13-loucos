import './style.css'
import * as data from './data.js'
import { blankPlayer, normalizeName, phone, validDraft } from './format.js'
import { closed, renderApp } from './views.js'

const app = document.querySelector('#app')
const intentKey = 'copinha:auth-intent'
const state = {
  screen: 'home', settings: data.initialSettings, session: null, own: null,
  teams: data.configured ? [] : structuredClone(data.exampleTeams), filter: '', selected: '',
  draft: null, dirty: false, busy: false, loading: false, message: null, challenge: false,
}
let turnstileLoad
let widgetId

function emptyDraft() {
  return { team_name: '', representative_name: '', representative_phone: '', players: Array.from({ length: 5 }, blankPlayer) }
}

function loadDraft() {
  state.draft = state.own ? {
    team_name: state.own.team_name,
    representative_name: state.own.representative_name,
    representative_phone: phone(state.own.representative_phone),
    players: structuredClone(state.own.players),
  } : emptyDraft()
  state.dirty = false
}

function draw(focus) {
  if (widgetId !== undefined) {
    window.turnstile.remove(widgetId)
    widgetId = undefined
  }
  app.innerHTML = renderApp(state)
  if (focus) document.querySelector(focus)?.focus()
}

function report(text, kind = 'success') {
  state.message = { text, kind }
}

function reportError(error, fallback) {
  const details = error.code === 'P0001' || error.code === '42501' || !error.code
  report(details && error.message ? error.message : fallback, 'error')
}

function navigate(screen) {
  state.screen = screen
  state.message = null
  state.challenge = false
  draw('#conteudo')
  window.scrollTo(0, 0)
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
  navigate('team')
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
    navigate('admin-gate')
    return
  }
  if (!data.configured) {
    navigate('admin')
    return
  }
  state.loading = true
  state.screen = 'admin-gate'
  state.message = null
  draw()
  try {
    if (!await data.isMaster()) {
      navigate('admin-gate')
      return
    }
    state.screen = 'admin'
    draw()
    const [settings, teams] = await Promise.all([data.settings(), data.allRegistrations()])
    state.settings = settings
    state.teams = teams
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
  } catch {
    report('Não foi possível entrar como visitante. Tente novamente ou entre com Google.', 'error')
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
  const invalid = validDraft(state.draft)
  if (invalid) {
    report(invalid, 'error')
    draw()
    return
  }
  const draft = {
    team_name: state.draft.team_name.trim(),
    representative_name: state.draft.representative_name.trim(),
    representative_phone: state.draft.representative_phone.replace(/\D/g, ''),
    players: state.draft.players.map(player => ({ name: normalizeName(player.name), year: Number(player.year) })),
  }
  const existing = state.own
  if (data.configured) {
    state.own = await data.saveRegistration(draft, existing?.revision ?? 0)
  } else {
    const changedRoster = JSON.stringify(draft.players) !== JSON.stringify(existing?.players) || draft.team_name !== existing?.team_name
    state.own = {
      ...draft, id: 'preview-own', revision: (existing?.revision ?? 0) + 1,
      status: existing?.status === 'confirmed' && changedRoster ? 'pending' : existing?.status ?? 'pending',
    }
    updateDemoTeam(state.own)
  }
  loadDraft()
  report(existing?.status === 'confirmed' && state.own.status === 'pending'
    ? 'Alterações salvas. A organização precisa conferir o elenco atualizado.'
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
    : { edit_deadline: cutOff, revision: state.settings.revision + 1 }
  report('Prazo atualizado no horário de Brasília.')
}

const actions = {
  home() {
    if (mayLeave()) navigate('home')
  },
  team: openTeam,
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
  if (!button || state.busy || state.loading) return
  const action = actions[button.dataset.action]
  if (action) void action(button)
})

app.addEventListener('input', event => {
  const field = event.target
  if (field.form?.id !== 'registration-form') return
  if (field.dataset.player !== undefined) {
    state.draft.players[Number(field.dataset.player)][field.dataset.field] = field.value
  } else if (field.name in state.draft) {
    state.draft[field.name] = field.value
  }
  if (!state.dirty) {
    state.dirty = true
    document.querySelector('#draft-note').textContent = 'Alterações ainda precisam ser salvas.'
  }
})

app.addEventListener('change', event => {
  if (event.target.id !== 'filter-status') return
  state.filter = event.target.value
  draw('#filter-status')
})

app.addEventListener('submit', async event => {
  event.preventDefault()
  if (state.busy || state.loading) return
  const form = event.target
  const handler = { 'registration-form': submitRegistration, 'status-form': submitStatus, 'deadline-form': submitDeadline }[form.id]
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
    const [sessionResult, settingsResult] = await Promise.allSettled([data.supabase.auth.getSession(), data.settings()])
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

void initialize()
