// Real HTTP/Auth.js lifecycle against an isolated database and a local SMTP receiver.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID, randomInt, createHash } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { registerHooks } from "node:module";
import { createServer } from "node:net";
import { config } from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
config({ path: ".env.local", quiet: true });
if (process.env.OFFICER_LIFECYCLE_TEST !== "1") throw new Error("Set OFFICER_LIFECYCLE_TEST=1 to run.");
const dbName = `ap_officer_test_${randomUUID().replaceAll("-", "").slice(0,16)}`;
let uri; try { uri = new URL(process.env.MONGODB_URI); } catch { throw new Error("Database configuration unavailable."); }
uri.pathname = `/${dbName}`; process.env.MONGODB_URI=uri.toString();
const port=3189, base=`http://localhost:${port}`;
process.env.AUTH_URL=base;process.env.NEXTAUTH_URL=base;process.env.NEXT_PUBLIC_APP_URL=base;
process.env.AUTH_SECRET ||= randomUUID()+randomUUID();
const emails=[]; let rejectMail=false;
const smtp=createServer(socket=>{
 socket.write("220 localhost ESMTP test\r\n");let buffer="", data=false, message="";
 socket.on("data",chunk=>{buffer+=chunk.toString();let index;while((index=buffer.indexOf("\r\n"))>=0){const line=buffer.slice(0,index);buffer=buffer.slice(index+2);
 if(data){if(line==="."&&rejectMail){message="";data=false;socket.write("451 temporary test delivery failure\r\n");continue;}if(line==="."){emails.push(message.replace(/=\r?\n/g,"").replace(/=3D/g,"="));message="";data=false;socket.write("250 queued\r\n");}else message+=line+"\r\n";continue;}
 if(/^EHLO|^HELO/.test(line))socket.write("250-localhost\r\n250 AUTH PLAIN\r\n");
 else if(/^AUTH/.test(line))socket.write("235 authenticated\r\n");
 else if(line==="DATA"){data=true;socket.write("354 send\r\n");}
 else if(line==="QUIT"){socket.end("221 bye\r\n");}
 else socket.write("250 ok\r\n");
 }});
});
await new Promise(resolve=>smtp.listen(0,"127.0.0.1",resolve));
Object.assign(process.env,{SMTP_HOST:"127.0.0.1",SMTP_PORT:String(smtp.address().port),SMTP_USER:"test@example.invalid",SMTP_PASS:randomUUID(),SMTP_FROM_EMAIL:"test@example.invalid",EMAIL_SIMULATE_FAILURE:"false"});
globalThis.AsyncLocalStorage = AsyncLocalStorage;
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "server-only") return { url: new URL("../node_modules/server-only/empty.js", import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
} });
const { connectDB, closeDB } = await import("../server/db/connection.ts");
const { User, PendingRegistration, Jurisdiction, OfficerProfile, AccessRequest, ApprovalDecision } = await import("../server/models/index.ts");
const { NextRequest } = await import("next/server.js");
const { createRequestStoreForAPI } = await import("next/dist/server/async-storage/request-store.js");
const { workUnitAsyncStorage } = await import("next/dist/server/app-render/work-unit-async-storage.external.js");
const { workAsyncStorage } = await import("next/dist/server/app-render/work-async-storage.external.js");
function requestContext(cookie, fn) {
  const req = new NextRequest(`${base}/onboarding`, { headers: { cookie, host: `localhost:${port}`, "x-forwarded-proto": "http" } });
  const store = createRequestStoreForAPI(req, { pathname: "/onboarding" }, { tags: [], expirationsByCacheKind: new Map() }, undefined, undefined, undefined);
  return workAsyncStorage.run({ route: "/onboarding", isStaticGeneration: false }, () => workUnitAsyncStorage.run(store, fn));
}
const cookieOf = response => response.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
const post = (path, data, cookie = "") => fetch(`${base}${path}`, { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(data), redirect: "manual" });
async function login(email, password) {
  const csrf = await fetch(`${base}/api/auth/csrf`);
  const { csrfToken } = await csrf.json();
  const response = await fetch(`${base}/api/auth/callback/credentials`, { method: "POST", redirect: "manual",
    headers: { cookie: cookieOf(csrf), "content-type": "application/x-www-form-urlencoded", "X-Auth-Return-Redirect": "1" },
    body: new URLSearchParams({ csrfToken, email, password, callbackUrl: `${base}/dashboard` }),
  });
  const cookie = cookieOf(response); assert(cookie.includes("authjs.session-token")); return cookie;
}
async function expectRedirect(path, cookie, target) {
  const response = await fetch(`${base}${path}`, { headers: { cookie }, redirect: "manual" });
  if ([303, 307, 308].includes(response.status)) assert.equal(new URL(response.headers.get("location"), base).pathname, target);
  else {
    // Next may stream a redirect if the shell has already rendered.
    const html = await response.text();
    assert(html.includes("NEXT_REDIRECT") && html.includes(target), `${path} must redirect to ${target}`);
  }
}
let server;
let stage="database/index initialization";
const api=(body,cookie="")=>fetch(`${base}/api/officer/account-setup`,{method:"POST",headers:{Origin:base,"Content-Type":"application/json",cookie},body:JSON.stringify(body)});
const status=async cookie=>(await fetch(`${base}/api/officer/account-setup`,{headers:{cookie}})).json();
const proof=async(fullName,email)=>{
 const before=emails.length;const response=await api({action:"check",fullName,email});assert.equal(response.status,200);assert(emails.length>before);
 const token=emails.at(-1).match(/#([a-f0-9]{64})/)?.[1];assert(token,"Status link issued through shared SMTP");
 const exchange=await api({action:"exchange",token});assert.equal(exchange.status,200);assert.equal((await api({action:"exchange",token})).status,400);
 return cookieOf(exchange);
};
try {
 await connectDB();assert.equal(mongoose.connection.name,dbName);
 await Promise.all([User.init(),OfficerProfile.init(),AccessRequest.init(),ApprovalDecision.init(),Jurisdiction.init()]);
 stage="provision approver";
 const { provisionOfficer }=await import("./provision-officer.ts");
 const approverEmail=`approver-${randomUUID()}@example.invalid`, password=randomUUID();
 const bootstrap={name:"General Officer",email:approverEmail,password,title:"General Officer",organization:"National surveillance",level:"federal",state:"",lga:"",approvalScope:"federal"};
 await provisionOfficer(bootstrap);
 await assert.rejects(()=>provisionOfficer(bootstrap));
 console.log("PASS L: bootstrap creates scoped explicit approver; duplicate credentials never overwritten");
 stage="production server startup";
 server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--port",String(port)],{env:process.env,windowsHide:true,stdio:["ignore","pipe","pipe"]});server.stdout.resume();server.stderr.resume();
 let ready=false;for(let i=0;i<60;i++){if(server.exitCode!==null)throw new Error("Server exited");try{if((await fetch(`${base}/admin/login`)).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,500));}assert(ready);
 const html=await(await fetch(`${base}/officer/access-request`)).text();assert(!html.includes('id="password"'));assert(!html.includes('id="confirmPassword"'));
 const fullName="Officer Applicant", email=`applicant-${randomUUID()}@example.invalid`;
 function formFor(mail=email){const form=new FormData();for(const [key,value] of Object.entries({fullName,email:mail,phone:"08012345678",position:"Disease Surveillance and Notification Officer (DSNO)",stateId:"osun",lgaId:"ife-central",governmentLevel:"local",organization:"Ife Central surveillance",isOtherOrg:"false"}))form.set(key,value);form.set("evidenceFile",new Blob(["%PDF-1.4 test evidence"],{type:"application/pdf"}),"evidence.pdf");return form;}
 stage="request submission";
 const intake=await fetch(`${base}/api/officer/access-request`,{method:"POST",body:formFor()});assert.equal(intake.status,201);assert(!("requestId" in await intake.json()));
 assert(emails.some(m=>m.includes("Officer Access Request Received")));
 const user=await User.findOne({email}).select("+passwordHash").lean();assert(!user.passwordHash);
 const profile=await OfficerProfile.findOne({user:user._id}).lean();const request=await AccessRequest.findOne({officer:profile._id}).lean();assert.equal(request.status,"pending");assert.equal(request.applicant.governmentLevel,"local");assert(request.evidence.data);
 assert.equal(user.isDemo,false);assert.equal(user.simulation,false);assert.equal(profile.simulation,false);assert.equal(request.simulation,false);
 assert.equal((await fetch(`${base}/api/officer/access-request`,{method:"POST",body:formFor()})).status,202);
 console.log("PASS A: password-free public intake, authoritative pending records and shared-SMTP receipt");
 // Bad evidence and geography reject before account creation.
 const noEvidence=formFor(`missing-${randomUUID()}@example.invalid`);noEvidence.delete("evidenceFile");
 assert.equal((await fetch(`${base}/api/officer/access-request`,{method:"POST",body:noEvidence})).status,400);
 const badArea=formFor(`scope-${randomUUID()}@example.invalid`);badArea.set("lgaId","ikeja");
 assert.equal((await fetch(`${base}/api/officer/access-request`,{method:"POST",body:badArea})).status,400);
 for(const level of ["state","federal"]){
   const mail=`${level}-${randomUUID()}@example.invalid`;const data=formFor(mail);data.set("governmentLevel",level);
   assert.equal((await fetch(`${base}/api/officer/access-request`,{method:"POST",body:data})).status,201);
   const u=await User.findOne({email:mail});const p=await OfficerProfile.findOne({user:u._id});const r=await AccessRequest.findOne({officer:p._id});
   assert.equal((await Jurisdiction.findById(r.jurisdiction)).level,level==="state"?"state":"country");
 }
 rejectMail=true;
 const failureEmail=`mail-failure-${randomUUID()}@example.invalid`;
 const mailFailure=await fetch(`${base}/api/officer/access-request`,{method:"POST",body:formFor(failureEmail)});
 assert.equal(mailFailure.status,201);assert.equal((await mailFailure.json()).emailSent,false);
 rejectMail=false;
 const retained=await User.findOne({email:failureEmail});const retainedProfile=await OfficerProfile.findOne({user:retained._id});
 assert.equal(await AccessRequest.countDocuments({officer:retainedProfile._id,status:"pending"}),1);
 console.log("PASS: all jurisdiction levels, invalid evidence/geography, duplicate handling, atomic records survive SMTP failure");
 const pendingCookie=await proof(fullName,email);assert.equal((await status(pendingCookie)).status,"pending");
 assert.equal((await api({action:"activate",password,confirmPassword:password},pendingCookie)).status,400);
 await assert.rejects(()=>login(email,password));
 console.log("PASS B: verified pending status; setup before approval denied");
 const approverCookie=await login(approverEmail,password);
 const { approveAccessRequestAction,rejectAccessRequestAction,getAccessRequestsAction }=await import("../server/actions/officer/access-requests/index.ts");
 const { requireCapability,requireJurisdictionAccess }=await import("../server/auth/rbac.ts");
 const queue=await requestContext(approverCookie,()=>getAccessRequestsAction({status:"pending"})); assert(queue.items.some(item=>item.id===String(request._id)));
 assert.equal((await fetch(`${base}/officer/approvals`,{headers:{cookie:approverCookie},redirect:"manual"})).status,200);
 console.log("PASS: General Officer national approver sees request in approvals");
 const approver=await User.findOne({email:approverEmail}).lean();
 await OfficerProfile.updateOne({user:approver._id},{$set:{"approvalAuthority.canApproveOfficerAccess":false}});
 await assert.rejects(()=>requestContext(approverCookie,()=>approveAccessRequestAction(String(request._id))));
 await OfficerProfile.updateOne({user:approver._id},{$set:{"approvalAuthority.canApproveOfficerAccess":true}});
 console.log("PASS C: capability alone cannot approve without explicit authority");
 await requestContext(approverCookie,()=>approveAccessRequestAction(String(request._id)));
 assert.equal((await AccessRequest.findById(request._id).lean()).status,"approved");assert.equal(await ApprovalDecision.countDocuments({accessRequest:request._id}),1);
 await assert.rejects(()=>requestContext(approverCookie,()=>approveAccessRequestAction(String(request._id))));
 assert(emails.some(m=>m.includes("Officer Access Has Been Approved")));
 console.log("PASS D: authorised atomic approval, one audit decision, shared-SMTP approval email");
 const before=emails.length;const wrong=await api({action:"check",fullName:"Wrong Person",email});const missing=await api({action:"check",fullName,email:`missing-${randomUUID()}@example.invalid`});assert.deepEqual(await wrong.json(),await missing.json());assert.equal(emails.length,before);assert.equal((await status("")).status,"unverified");
 console.log("PASS E: wrong/unrelated identity returns identical safe response with no status or IDs");
 // The original proven session reads live approved state, not a browser status flag.
 assert.equal((await status(pendingCookie)).status,"approved");
 console.log("PASS F: live approved status exposes approved identity and setup only after email proof");
 const activated=await api({action:"activate",password,confirmPassword:password},pendingCookie);assert.equal(activated.status,200);
 const account=await User.findById(user._id).select("+passwordHash").lean();assert(await bcrypt.compare(password,account.passwordHash));assert(account.emailVerified);
 assert((await OfficerProfile.findById(profile._id).lean()).setupCompletedAt);
 assert.equal((await api({action:"activate",password,confirmPassword:password},pendingCookie)).status,400);
 const activatedCookie=await proof(fullName,email);assert.equal((await status(activatedCookie)).status,"activated");
 console.log("PASS G/H: one-time transactional credential activation and repeat setup rejection");
 const officerCookie=await login(email,password);
 await requestContext(officerCookie,()=>requireCapability("signals:read"));
 await assert.rejects(()=>requestContext(officerCookie,()=>requireCapability("access:approve")));
 const approverProfile=await OfficerProfile.findOne({user:approver._id}).lean();
 await assert.rejects(()=>requestContext(officerCookie,()=>requireJurisdictionAccess(String(approverProfile.jurisdiction))));
 assert.equal((await fetch(`${base}/officer/overview`,{headers:{cookie:officerCookie},redirect:"manual"})).status,200);
 console.log("PASS I/J: normal Officer login/portal works; approval capability and outside jurisdiction denied");
 // Rejection stays safe and uses the same sender.
 const rejectedEmail=`rejected-${randomUUID()}@example.invalid`;assert.equal((await fetch(`${base}/api/officer/access-request`,{method:"POST",body:formFor(rejectedEmail)})).status,201);
 const rejectedUser=await User.findOne({email:rejectedEmail}).lean();const rejectedProfile=await OfficerProfile.findOne({user:rejectedUser._id}).lean();const rejectedRequest=await AccessRequest.findOne({officer:rejectedProfile._id}).lean();
 await requestContext(approverCookie,()=>rejectAccessRequestAction(String(rejectedRequest._id),"Confidential review note"));
 assert(!emails.at(-1).includes("Confidential review note"));assert.equal((await status(await proof(fullName,rejectedEmail))).status,"rejected");
 console.log("PASS: rejection hides internal reason, email/status remain safe");
 const {officerRateLimit}=await import("../server/services/officer-rate-limit.ts");assert(await officerRateLimit("test-limit",1));assert.equal(await officerRateLimit("test-limit",1),false);
 console.log("PASS: persistent rate limiting fails closed");
} catch(error){console.error("FAIL:",{stage,name:error?.name,code:error?.code,codeName:error?.codeName,fields:Object.keys(error?.errors??{}),assertion:error instanceof assert.AssertionError ? error.operator : undefined}); if(error?.name==="MongoServerError") console.error("Database detail:", String(error.message).replace(/mongodb(?:\+srv)?:\/\/\S+/g,"[redacted]").replace(/[\w.+-]+@[\w.-]+/g,"[email]").replace(/\b[a-f0-9]{24,}\b/gi,"[identifier]").slice(0,350));process.exitCode=1;}
finally {
 if(server&&server.exitCode===null){server.kill();await new Promise(r=>server.once("exit",r));}
 try{if(mongoose.connection.readyState===1&&mongoose.connection.name===dbName&&dbName.startsWith("ap_officer_test_"))await mongoose.connection.dropDatabase();}catch{console.error("Cleanup failed:",dbName);process.exitCode=1;}
 await closeDB();smtp.close();console.log("Isolated database removed. No real accounts or external emails changed.");
}
