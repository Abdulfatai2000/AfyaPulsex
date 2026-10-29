import { CitizenAuthOptions } from "@/components/public/auth/CitizenAuthOptions";
import { OfficerAuthOptions } from "@/components/public/auth/OfficerAuthOptions";
export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; entry?: string }>;
}) {
  const query = await searchParams;
  const officerEntry = query.entry === "officer";
  const initialMode =
    !officerEntry && query.mode === "signup" ? "signup" : "signin";
  return (
    <>
      <CitizenAuthOptions
        key={officerEntry ? "officer" : initialMode}
        initialMode={initialMode}
        officerEntry={officerEntry}
      />
      <OfficerAuthOptions />
    </>
  );
}
