import { escape, phone } from './format.js'
import { icon } from './icons.js'
import { logoSource } from './logo.js'

export const firstSponsor = {
  id: 'adega-preview', name: 'Adega 13 Alta', asset_key: 'adega-13-alta',
}

export function teamEmblem(team, placeholder = false) {
  const source = logoSource(team.logo)
  if (source) return `<img class="team-emblem" src="${source}" alt="" width="80" height="80" loading="lazy">`
  return placeholder ? `<span class="team-emblem placeholder" aria-hidden="true">${icon('shield')}</span>` : ''
}

export function confirmedSection(state) {
  const teams = state.publicTeams
  return `<section class="public-section" id="equipes-confirmadas" aria-labelledby="confirmed-title">
    <div class="section-title"><span class="section-icon">${icon('people')}</span><h2 id="confirmed-title">Equipes confirmadas</h2></div>
    ${state.publicTeamsFailed ? '<p>Não foi possível carregar as equipes confirmadas. Recarregue a página para tentar novamente.</p>'
      : teams === null ? '<p role="status">Carregando equipes…</p>'
      : teams.length ? `<ul class="confirmed-grid">${teams.map(team => `<li class="card confirmed-card">${teamEmblem(team, true)}<h3>${escape(team.team_name)}</h3></li>`).join('')}</ul>`
      : '<p>As equipes aparecem aqui assim que a organização confirma a inscrição.</p>'}
  </section>`
}

export function aboutSection(settings) {
  const contact = settings?.contact_phone
  return `<section class="public-section" id="sobre" aria-labelledby="about-title">
    <div class="section-title"><span class="section-icon">${icon('note')}</span><h2 id="about-title" tabindex="-1">Sobre a Copinha</h2></div>
    <div class="about-grid">
      <div class="card rules">
        <p>O torneio gratuito de futsal de base acontece na quadra da Praça do KM40, no Jardim América, em Itaquaquecetuba.</p>
        <details open><summary>Inscrição e elegibilidade</summary><p>Cada equipe inscreve de 5 a 15 atletas e indica um representante adulto. São aceitos atletas de 2012 a 2014 e, por equipe, até dois de 2011, com apenas um deles em quadra por vez. Cada atleta defende uma única equipe e precisa da autorização do responsável legal.</p></details>
        <details><summary>Formato e pontuação</summary><p>Oito equipes em dois grupos de quatro. Cada equipe disputa três jogos na fase de grupos. Vitória vale 3 pontos, empate vale 1 e derrota vale 0. As duas primeiras de cada grupo avançam às semifinais cruzadas. Empate no mata-mata leva a cinco cobranças alternadas por equipe, seguidas de cobranças alternadas se a igualdade persistir.</p><p>Nos grupos, os critérios de desempate são vitórias, saldo de gols, gols marcados, menor pontuação disciplinar e sorteio.</p></details>
        <details><summary>Partidas, disciplina e premiação</summary><p>A minuta prevê dois tempos de 15 minutos efetivos, intervalo de 5 minutos e até 14 atletas relacionados por jogo. São cinco em quadra e no mínimo três aptos para iniciar ou prosseguir. O regulamento também detalha equipamento, faltas, cartões, W.O. e recursos.</p><p>Campeão: troféu e R$ 50. Vice: R$ 20. Há troféus para artilharia e melhor goleiro ou goleira.</p></details>
        <a class="button secondary" href="/regulamento.pdf" download="Regulamento_Copa_13_Loucos.pdf">${icon('note')} Baixar regulamento (PDF)</a>
        <p class="rules-note">O documento é a minuta da primeira edição. Confirme as regras finais com a organização.</p>
      </div>
      <aside class="card organizer">
        <span class="section-icon">${icon('user')}</span>
        <h3>Contato da organização</h3><p><strong>Felipe Ferreira</strong><br>Organização 13 Loucos</p>
        ${contact ? `<a class="button primary" href="https://wa.me/55${escape(contact)}" target="_blank" rel="noopener noreferrer">WhatsApp ${escape(phone(contact))}</a>` : '<p>O WhatsApp oficial será divulgado pela organização.</p>'}
      </aside>
    </div>
  </section>`
}

export function sponsorEmblem(sponsor) {
  const source = sponsor.asset_key === 'adega-13-alta'
    ? '/sponsors/adega-13-alta.webp'
    : logoSource(sponsor.logo)
  return source ? `<img src="${source}" alt="" width="90" height="90" loading="lazy">` : ''
}

export function footer(state) {
  const sponsors = state.sponsors ?? []
  const carousel = sponsors.length > 1
  const activeIndex = sponsors.length ? state.sponsorIndex % sponsors.length : 0
  return `<footer class="site-footer">
    ${sponsors.length ? `<section class="sponsors-footer" aria-labelledby="sponsors-title">
      <div class="container sponsor-inner">
        <div class="sponsor-title"><h2 id="sponsors-title">Patrocinadores</h2></div>
        <div class="sponsor-slides" id="sponsor-slides">${sponsors.map((sponsor, index) => `
          <div class="sponsor-slide" ${index === activeIndex ? '' : 'hidden'}>${sponsorEmblem(sponsor)}<strong>${escape(sponsor.name)}</strong></div>`).join('')}</div>
        ${carousel ? `<div class="sponsor-controls" aria-label="Controles dos patrocinadores">
          <button type="button" class="button ghost" data-action="sponsor-prev" aria-controls="sponsor-slides">Anterior</button>
          <button type="button" class="button ghost" data-action="sponsor-next" aria-controls="sponsor-slides">Próximo</button>
          <button type="button" class="button ghost" data-action="sponsor-toggle" aria-controls="sponsor-slides">${state.sponsorPaused ? 'Reproduzir' : 'Pausar'}</button>
        </div>` : ''}
      </div>
    </section>` : ''}
    <div class="container footer-inner">
      <span><strong>Copinha 13 Loucos</strong> · Futsal de base</span>
      <span>Jardim América · Itaquaquecetuba, SP</span>
    </div>
  </footer>`
}
