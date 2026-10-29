import { ArrowLeft,ArrowRight } from "lucide-react";
import type { CitizenPublicAlert } from "@/types/public-alerts";
import { HealthAlertCard } from "./HealthAlertCard";
export function HealthAlertList({alerts,selected,onSelect,page,pages,onPage}:{alerts:CitizenPublicAlert[];selected?:string;onSelect:(id:string)=>void;page:number;pages:number;onPage:(page:number)=>void}){
 return <><ul className="al-list">{alerts.map(alert=><HealthAlertCard key={alert.id} alert={alert} selected={alert.id===selected} onSelect={()=>onSelect(alert.id)}/>)}</ul><nav className="al-pagination" aria-label="Alert pages"><button disabled={page===0} onClick={()=>onPage(page-1)}><ArrowLeft size={16} aria-hidden="true"/>Previous</button><span role="status">Page {page+1} of {pages}</span><button disabled={page+1>=pages} onClick={()=>onPage(page+1)}>Next<ArrowRight size={16} aria-hidden="true"/></button></nav></>;
}

