const email = `repro-${Date.now()}@example.com`;
const form = new FormData();
form.append("fullName", "Repro Officer");
form.append("email", email);
form.append("phone", "+2348012345678");
form.append("position", "Disease Surveillance Officer (DSO)");
form.append("governmentLevel", process.argv[2] ?? "state");
form.append("stateId", process.argv[3] ?? "lagos");
form.append("organization", "Lagos State Ministry of Health");
form.append("isOtherOrg", "false");
form.append("lgaId", process.argv[4] ?? "ikeja");
const pdf = Buffer.from("%PDF-1.4\nrepro evidence\n%%EOF");
form.append("evidenceFile", new Blob([pdf], { type: "application/pdf" }), "evidence.pdf");

const res = await fetch("http://localhost:3000/api/officer/access-request", {
  method: "POST",
  body: form,
});
console.log("STATUS", res.status);
console.log("BODY", await res.text());
console.log("EMAIL", email);