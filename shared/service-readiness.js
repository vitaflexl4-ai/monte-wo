// Shared client-side contract checks. Readiness is never proof of a signed-in user.
export const servicePaths = Object.freeze({mobile:'/api/mobile/config',strength:'/api/strength/config',waitlist:'/api/waitlist/config'});
export function mobileConfigSupported(data) {
  return !!data && typeof data === 'object' && !Array.isArray(data)
    && data.apiVersion === 1 && typeof data.available === 'boolean'
    && typeof data.workoutSync === 'boolean'
    && typeof data.authentication === 'string' && typeof data.registration === 'string';
}
export function serviceReadiness(service, result) {
  if (result.unreachable) return {state:'unknown',label:'Could not check',detail:'Network, timeout or browser policy prevented this check. No connection is assumed.'};
  const data=result.data;
  if (result.status===404 || data?.error==='Not implemented in this build') return {state:'missing',label:'Route missing from deployment',detail:'This deployed version does not expose the expected API. Verify the production deployment before changing database settings.'};
  if (!result.ok) return {state:'blocked',label:'Service unavailable',detail:'The public readiness endpoint did not return a successful response. No sign-in or sync is assumed.'};
  if (service==='mobile') {
    if (!mobileConfigSupported(data)) return {state:'incompatible',label:'Unsupported mobile API response',detail:'Expected mobile API version 1 with explicit availability and workout-sync flags. Verify that website and native app use the same supported deployment.'};
    if (!data.available || !data.workoutSync) return {state:'disabled',label:'Account sync not enabled',detail:'Library and local tools remain usable. Application database, pilot identity settings and schema must be verified before enabling account sync.'};
    return {state:'ready',label:'Backend ready · sign-in required',detail:'Readiness only—not a connected account or verified cross-device sync. The current sign-in flow is an enrolled pilot, not public signup.'};
  }
  if (!data || typeof data.available!=='boolean') return {state:'incompatible',label:'Unrecognized service response',detail:'Availability could not be verified. No connection is assumed.'};
  if (service==='waitlist' && data.localTest===true) return {state:'local',label:'Local test only',detail:'This is not the production waitlist. No account or workout sync is created.'};
  if (!data.available) return {state:'disabled',label:service==='waitlist'?'Waitlist signup not active':'Strength pilot not enabled',detail:service==='waitlist'?'The support-email fallback remains available. Waitlist enrollment never creates an athlete account.':'Draft methodology remains readable. No authenticated rank service or official award is assumed.'};
  if (service==='waitlist' && !(typeof data.siteKey==='string' && data.siteKey)) return {state:'incompatible',label:'Waitlist verification not ready',detail:'A production verification configuration was not supplied. Nothing has been submitted.'};
  return {state:'ready',label:service==='waitlist'?'Signup service ready':'Pilot service ready · sign-in required',detail:service==='waitlist'?'Submit only through the waitlist form. This does not create an athlete account.':'This does not mean you are signed in, approved for a rank, or connected to the native app.'};
}
