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
export const phone = value => String(value).replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3')

export function deadlineInput(value) {
  const parts = Object.fromEntries(inputFormat.formatToParts(new Date(value)).map(part => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export function athleteKey(player) {
  return `${normalizeName(player.name).toLocaleLowerCase('pt-BR')}/${player.year}`
}

export function validDraft(draft) {
  if (draft.team_name.trim().length < 2 || draft.representative_name.trim().length < 3) {
    return 'Preencha o nome da equipe e o nome do representante adulto.'
  }
  if (!/^[1-9]\d{9,10}$/.test(draft.representative_phone.replace(/\D/g, ''))) {
    return 'Informe um WhatsApp com DDD, com 10 ou 11 dígitos.'
  }
  if (draft.players.length < 5 || draft.players.length > 15) {
    return 'A equipe precisa ter de 5 a 15 atletas.'
  }
  const invalid = draft.players.findIndex(player => !normalizeName(player.name).includes(' ') || !years.includes(Number(player.year)))
  if (invalid !== -1) return `Informe o nome completo e o ano de nascimento do atleta ${invalid + 1}.`
  if (draft.players.filter(player => Number(player.year) === 2011).length > 2) {
    return 'O elenco pode ter até dois atletas nascidos em 2011.'
  }
  if (new Set(draft.players.map(athleteKey)).size !== draft.players.length) {
    return 'Há atletas repetidos na relação.'
  }
  return ''
}
