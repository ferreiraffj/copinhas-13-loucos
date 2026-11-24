import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const turnstileKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim()
export const configured = Boolean(url && key)
export const supabase = configured
  ? createClient(url, key, { auth: { flowType: 'pkce' } })
  : null

const deadline = '2026-12-10T23:59:59-03:00'

export function demoSettings() {
  const upcoming = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  upcoming.setUTCSeconds(0, 0)
  return { edit_deadline: upcoming.toISOString(), revision: 1 }
}

const examplePlayers = [
  { name: 'Alex Ribeiro', year: 2012 },
  { name: 'Caio Almeida', year: 2013 },
  { name: 'Davi Santos', year: 2012 },
  { name: 'Luan Prado', year: 2011 },
  { name: 'Rafa Moraes', year: 2014 },
]

export const exampleTeams = [
  { id: 'vila', team_name: 'Vila Futsal', representative_name: 'Marcos Vieira', representative_phone: '11900000001', status: 'pending', players: examplePlayers, revision: 1 },
  { id: 'uniao', team_name: 'União da Quadra', representative_name: 'Bruna Lima', representative_phone: '11900000002', status: 'confirmed', players: examplePlayers.map(player => ({ ...player, name: player.name.replace(/ .*/, ' Nascimento') })), revision: 1 },
  { id: 'atletico', team_name: 'Atlético do Bairro', representative_name: 'João Martins', representative_phone: '11900000003', status: 'ineligible', players: examplePlayers.map(player => ({ ...player, name: player.name.replace(/ .*/, ' Alves') })), revision: 1 },
]

export const initialSettings = configured ? null : { edit_deadline: deadline, revision: 1 }

function result({ data, error }) {
  if (error) throw error
  return data
}

async function mutation(name, values) {
  const data = result(await supabase.rpc(name, values))
  return Array.isArray(data) ? data[0] : data
}

export async function settings() {
  return result(await supabase.from('tournament_settings').select('edit_deadline, contact_phone, contact_instagram, contact_email, revision').eq('id', 1).single())
}

export async function isMaster() {
  return result(await supabase.rpc('is_master'))
}

export async function ownRegistration(userId) {
  return result(await supabase.from('registrations').select('*').eq('owner_id', userId).maybeSingle())
}

export async function allRegistrations() {
  const teams = []
  const pageSize = 100
  for (let start = 0; ; start += pageSize) {
    const page = result(await supabase.from('registrations').select('*')
      .order('team_name').order('id').range(start, start + pageSize - 1))
    teams.push(...page)
    if (page.length < pageSize) return teams
  }
}

export function saveRegistration(draft, revision) {
  return mutation('save_registration_with_logo', {
    p_team_name: draft.team_name,
    p_representative: draft.representative_name,
    p_phone: draft.representative_phone,
    p_players: draft.players,
    p_logo: draft.logo,
    p_team_instagram: draft.team_instagram || null,
    p_representative_instagram: draft.representative_instagram || null,
    p_revision: revision,
  })
}

export function saveStatus(id, status, revision) {
  return mutation('set_registration_status', { p_id: id, p_status: status, p_revision: revision })
}

export function saveDeadline(deadline, revision) {
  return mutation('set_edit_deadline', { p_deadline: deadline, p_revision: revision })
}

export async function confirmedTeams() {
  return result(await supabase.rpc('confirmed_teams'))
}

export async function sponsors() {
  return result(await supabase.from('sponsors').select('id, name, logo, asset_key').order('created_at').order('id'))
}

export function addSponsor(draft) {
  return mutation('add_sponsor', { p_name: draft.name, p_logo: draft.logo })
}

export function removeSponsor(id) {
  return mutation('remove_sponsor', { p_id: id })
}

export function saveContact(phone, instagram, email, revision) {
  return mutation('save_organizer_contact', {
    p_phone: phone, p_instagram: instagram, p_email: email, p_revision: revision,
  })
}
