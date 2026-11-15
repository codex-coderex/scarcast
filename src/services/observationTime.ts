/** NISAR metadata timestamps are UTC even when the export omits the suffix. */
export function asUTC(value:string){
  if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value+'T00:00:00Z'
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)?value:value+'Z'
}
export function philippineAcquisition(value:string){return new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'Asia/Manila'}).format(new Date(asUTC(value)))+' PHT'}
