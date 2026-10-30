export type MobileConfig = {available:boolean; workoutSync:boolean; apiVersion:1; authentication:string; registration:string};
export const servicePaths: Readonly<{mobile:string;strength:string;waitlist:string}>;
export function mobileConfigSupported(data:unknown): data is MobileConfig;
export function serviceReadiness(service:'mobile'|'strength'|'waitlist', result:{ok?:boolean;status?:number;data?:unknown;unreachable?:boolean}): {state:string;label:string;detail:string};
