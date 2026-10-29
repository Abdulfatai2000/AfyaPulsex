import { MapPin,CalendarDays,ChevronRight } from "lucide-react";
import type { CitizenPublicAlert } from "@/types/public-alerts";
import { AlertCategoryBadge,alertCategories } from "./AlertCategoryBadge";
import { alertDate } from "./data";
export function HealthAlertCard({alert,selected,onSelect}:{alert:CitizenPublicAlert;selected:boolean;onSelect:()=>void}){
 const Icon=alertCategories[alert.category].Icon;
 return <li><button id={"al-row-"+alert.id} className={"al-row"+(selected?" al-selected":"")} onClick={onSelect} aria-pressed={selected} aria-controls="al-details"><span className={"al-icon al-"+alert.category}><Icon aria-hidden="true" size={25}/></span><span className="al-row-copy"><span className="al-row-heading"><strong>{alert.title}</strong><AlertCategoryBadge category={alert.category}/></span><span className="al-summary">{alert.summary}</span><span className="al-row-meta"><span><MapPin aria-hidden="true" size={14}/>{alert.affectedArea.label}</span><span><CalendarDays aria-hidden="true" size={14}/>{alert.updatedAt?"Updated ":"Published "}<time dateTime={alert.updatedAt??alert.publishedAt}>{alertDate(alert.updatedAt??alert.publishedAt)}</time></span></span></span><ChevronRight className="al-chevron" aria-hidden="true" size={18}/></button></li>;
}

