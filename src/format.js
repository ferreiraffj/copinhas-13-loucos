export const statusNames = {
  pending: 'Pendente de envio de autorizações',
  confirmed: 'Confirmada',
  ineligible: 'Inapta',
}

export const years = [2011, 2012, 2013, 2014]
export const blankPlayer = () => ({ name: '', year: '' })
export const normalizeName = value => value.trim().replace(/\s+/g, ' ')
const htmlEntities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export const escape = value => String(value ?? '').replace(/[&<>"']/g, character => htmlEntities[character])

const timeZone = 'America/Sao_Paulo'
const dayFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: 'long', year: 'numeric', timeZone,
})
const timeFormat = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit', minute: '2-digit', timeZone,
})
const inputFormat = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone,
})

export const deadlineDay = value => dayFormat.format(new Date(value))
export const deadlineTime = value => timeFormat.format(new Date(value))
export function phoneDigits(value) {
  return String(value ?? '').replace(/^\s*\+55\D*/, '').replace(/\D/g, '').slice(0, 11)
}

export function phone(value) {
  const digits = phoneDigits(value)
  if (digits.length < 3) return digits ? '(' + digits : ''
  const number = digits.slice(2)
  const split = digits.length === 11 ? 5 : 4
  const local = number.length > split ? number.slice(0, split) + '-' + number.slice(split) : number
  return '(' + digits.slice(0, 2) + ') ' + local
}

export const validPhone = value => /^[1-9]\d{9,10}$/.test(String(value ?? '').replace(/\D/g, ''))

export function deadlineInput(value) {
  const parts = Object.fromEntries(inputFormat.formatToParts(new Date(value)).map(part => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export function athleteKey(player) {
  return `${normalizeName(player.name).toLocaleLowerCase('pt-BR')}/${player.year}`
}


export function draftIssues(draft, allowedYears = years, unchangedRoster = false) {
  const issues = {}
  if (draft.team_name.trim().length < 2) issues.team_name = 'Informe o nome da equipe.'
  if (normalizeName(draft.representative_name).length < 3) issues.representative_name = 'Informe o nome do representante adulto.'
  if (!validPhone(draft.representative_phone)) issues.representative_phone = 'Informe um WhatsApp com DDD, com 10 ou 11 dígitos.'
  if (unchangedRoster) return issues
  if (draft.players.length < 5 || draft.players.length > 15) issues.roster = 'A equipe precisa ter de 5 a 15 atletas.'

  let oldest = 0
  const seen = new Set()
  draft.players.forEach((player, index) => {
    const name = normalizeName(player.name)
    const year = Number(player.year)
    const key = athleteKey(player)
    if (name.length < 3) issues['name-' + index] = 'Informe o nome do atleta.'
    else if (allowedYears.includes(year) && seen.has(key)) issues['name-' + index] = 'Este atleta já consta no elenco.'
    if (!allowedYears.includes(year)) issues['year-' + index] = 'Selecione um ano de nascimento válido.'
    if (year === 2011 && ++oldest > 2) issues['year-' + index] = 'O limite de 2 atletas de 2011 foi atingido.'
    if (allowedYears.includes(year)) seen.add(key)
  })
  return issues
}
