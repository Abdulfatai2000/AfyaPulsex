// Local SMTP regression: never connects to the real provider or sends external mail.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:net";
const emails=[];
const smtp=createServer(socket=>{
 socket.write("220 localhost ESMTP test\r\n");let buffer="", data=false, message="";
 socket.on("data",chunk=>{buffer+=chunk.toString();let index;while((index=buffer.indexOf("\r\n"))>=0){const line=buffer.slice(0,index);buffer=buffer.slice(index+2);
 if(data){if(line==="."){emails.push(message.replace(/=\r?\n/g,"").replace(/=3D/g,"="));message="";data=false;socket.write("250 queued\r\n");}else message+=line+"\r\n";continue;}
 if(/^EHLO|^HELO/.test(line))socket.write("250-localhost\r\n250 AUTH PLAIN\r\n");
 else if(/^AUTH/.test(line))socket.write("235 authenticated\r\n");
 else if(line==="DATA"){data=true;socket.write("354 send\r\n");}
 else if(line==="QUIT"){socket.end("221 bye\r\n");}
 else socket.write("250 ok\r\n");
 }});
});
await new Promise(resolve=>smtp.listen(0,"127.0.0.1",resolve));
Object.assign(process.env,{SMTP_HOST:"127.0.0.1",SMTP_PORT:String(smtp.address().port),SMTP_USER:"test@example.invalid",SMTP_PASS:randomUUID(),SMTP_FROM_EMAIL:"test@example.invalid",EMAIL_SIMULATE_FAILURE:"false"});

try {
 const { sendEmail, sendSubmissionConfirmationEmail, sendApprovalEmail }=await import("../server/services/email/index.ts");
 assert((await sendSubmissionConfirmationEmail("recipient@example.invalid","Officer Test")).success);
 assert((await sendApprovalEmail("recipient@example.invalid","Officer Test",true)).success);
 assert((await sendApprovalEmail("recipient@example.invalid","Officer Test",false,"INTERNAL SECRET REVIEW")).success);
 assert((await sendEmail({to:"recipient@example.invalid",subject:"OTP service transport regression",html:"<p>Test-only transport message</p>",eventType:"verification"})).success);
 assert.equal(emails.length,4);
 const senders=emails.map(m=>m.match(/^From: (.+)$/m)?.[1]);assert(senders.every(sender=>sender===senders[0]));
 assert(emails[0].includes("Check Approval Status"));assert(emails[1].includes("create your password"));assert(!emails[2].includes("INTERNAL SECRET REVIEW"));
 assert(!emails.some(m=>m.includes("password you created during your access request")));
 process.env.SMTP_FROM_EMAIL="AfyaPulse <test@example.invalid>";
 assert((await sendSubmissionConfirmationEmail("recipient@example.invalid","Officer Test")).success);
 assert.equal(emails[4].match(/^From: (.+)$/m)?.[1]?.trim(), "AfyaPulse <test@example.invalid>");
 console.log("PASS: preformatted sender produces one valid From address, without nested brackets");
 console.log("PASS: receipt, approval, rejection and verification use the same SMTP service/sender; rejection keeps review details private");
} finally { smtp.close(); }
