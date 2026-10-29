import { citizenPublicAlertSchema, type AlertCategory, type CitizenAlertFeed, type CitizenPublicAlert } from "@/types/public-alerts";
export const dateRanges={all:"All time","7":"Last 7 days","30":"Last 30 days","90":"Last 90 days"} as const;
export type AlertDateRange=keyof typeof dateRanges;
export function safePublicUrl(value?:string):string|undefined {
 if(!value)return undefined;
 try {const url=new URL(value);return url.protocol==="https:"&&!url.username&&!url.password?url.href:undefined;}catch{return undefined;}
}
export function publishedAlerts(feed:CitizenAlertFeed):CitizenPublicAlert[]{
 const seen=new Set<string>();const records:CitizenPublicAlert[]=[];
 for(const candidate of feed.records){const parsed=citizenPublicAlertSchema.safeParse(candidate);if(!parsed.success)continue;
 const value=parsed.data;if(seen.has(value.id)||Date.parse(value.publishedAt)>Date.parse(feed.asOf))continue;
 if(value.updatedAt&&(Date.parse(value.updatedAt)<Date.parse(value.publishedAt)||Date.parse(value.updatedAt)>Date.parse(feed.asOf)))continue;
 seen.add(value.id);records.push({...value,learnMoreUrl:safePublicUrl(value.learnMoreUrl)});}
 return records.sort((a,b)=>Date.parse(b.updatedAt??b.publishedAt)-Date.parse(a.updatedAt??a.publishedAt)||a.id.localeCompare(b.id));
}
export function filterAlerts(records:CitizenPublicAlert[],query:string,category:AlertCategory|"all",range:AlertDateRange,asOf:string){
 const day=new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Lagos",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(asOf));
 const start=range==="all"?-Infinity:Date.parse(day+"T00:00:00+01:00")-(Number(range)-1)*86400000;
 return records.filter(alert=>(category==="all"||alert.category===category)&&Date.parse(alert.updatedAt??alert.publishedAt)>=start&&[alert.title,alert.summary,alert.affectedArea.label,alert.issuedBy??"",alert.approvedBy??""].join(" ").toLowerCase().includes(query.trim().toLowerCase()));
}
export function alertDate(value:string){return new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"Africa/Lagos"}).format(new Date(value));}

