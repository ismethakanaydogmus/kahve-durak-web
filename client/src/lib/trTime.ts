// Turkish attaches case suffixes to a time according to how its last number is spoken:
// "03:00'e kadar" (üç-e), "10:00'a kadar" (on-a), "03:00'te" (üç-te), "10:00'da" (on-da).

const ones = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz']
const tens = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli']

/** Last spoken word of a number 0–59. */
function lastWord(n: number): string {
  if (n === 0) return 'sıfır'
  return n % 10 !== 0 ? ones[n % 10] : tens[Math.floor(n / 10)]
}

const backVowels = 'aıou'
const vowels = 'aeıioöuü'
const voiceless = 'çfhkpsşt'

export type TrCase = 'dative' | 'locative'

export function trTimeWithSuffix(time: string, kase: TrCase): string {
  const [h, m] = time.split(':').map(Number)
  const word = lastWord(m === 0 ? h : m)
  const lastVowel = [...word].reverse().find((c) => vowels.includes(c)) ?? 'e'
  const back = backVowels.includes(lastVowel)
  const last = word[word.length - 1]

  if (kase === 'dative') {
    const buffer = vowels.includes(last) ? 'y' : ''
    return `${time}'${buffer}${back ? 'a' : 'e'}`
  }
  const d = voiceless.includes(last) ? 't' : 'd'
  return `${time}'${d}${back ? 'a' : 'e'}`
}
