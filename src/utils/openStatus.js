// Status aberto/fechado calculado no fuso de Natal/RN (America/Fortaleza, UTC-3).
// Reaproveita a mesma lógica usada no Mapa para os cards de participante e a
// página do combo. `hours` = objeto { 0..6: [["08:00","18:00"], ...] } (0=domingo).

const DAY_ABBR = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

function formatHourLabel(hhmm) {
  const [h, m] = hhmm.split(':')
  return m === '00' ? `${parseInt(h, 10)}h` : `${parseInt(h, 10)}h${m}`
}

export function getOpenStatus(hours, now = new Date()) {
  if (!hours || typeof hours !== 'object') return { state: 'unknown', label: '', detail: '' }

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Fortaleza',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now)
  const get = t => parts.find(p => p.type === t)?.value
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const today = weekdayMap[get('weekday')]
  let hh = parseInt(get('hour'), 10)
  if (hh === 24) hh = 0
  const nowMin = hh * 60 + parseInt(get('minute'), 10)

  const toMin = hhmm => {
    const [h, m] = hhmm.split(':').map(Number)
    return h * 60 + m
  }
  const slotsFor = d => (Array.isArray(hours[d]) ? hours[d] : [])

  // aberto agora? (slots de hoje; close <= open = cruza a meia-noite)
  for (const [open, close] of slotsFor(today)) {
    const o = toMin(open), c = toMin(close)
    const openNow = c <= o ? nowMin >= o : nowMin >= o && nowMin < c
    if (openNow) return { state: 'open', label: 'Aberto', detail: `Fecha às ${formatHourLabel(close)}` }
  }

  // madrugada: slot de ontem que cruzou a meia-noite
  const yesterday = (today + 6) % 7
  for (const [open, close] of slotsFor(yesterday)) {
    const o = toMin(open), c = toMin(close)
    if (c <= o && nowMin < c) return { state: 'open', label: 'Aberto', detail: `Fecha às ${formatHourLabel(close)}` }
  }

  // abre ainda hoje?
  const laterToday = slotsFor(today)
    .map(([open]) => open)
    .filter(open => toMin(open) > nowMin)
    .sort((a, b) => toMin(a) - toMin(b))
  if (laterToday.length > 0) {
    return { state: 'closed', label: 'Fechado', detail: `Abre às ${formatHourLabel(laterToday[0])}` }
  }

  // próximo dia com horário (até 7 dias à frente)
  for (let i = 1; i <= 7; i++) {
    const d = (today + i) % 7
    const slots = slotsFor(d)
    if (slots.length > 0) {
      const open = slots.map(s => s[0]).sort((a, b) => toMin(a) - toMin(b))[0]
      const when = i === 1 ? 'amanhã' : DAY_ABBR[d]
      return { state: 'closed', label: 'Fechado', detail: `Abre ${when} às ${formatHourLabel(open)}` }
    }
  }

  return { state: 'closed', label: 'Fechado', detail: '' }
}

// Encontra o objeto `hours` de um participante (top-level ou 1ª unidade que tiver).
export function participantHours(participant) {
  if (!participant) return null
  if (participant.hours && typeof participant.hours === 'object') return participant.hours
  const loc = (participant.locations || []).find(l => l.hours && typeof l.hours === 'object')
  return loc ? loc.hours : null
}
