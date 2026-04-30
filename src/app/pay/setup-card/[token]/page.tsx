import SetupCardClient from "./SetupCardClient";

export const dynamic = "force-dynamic";

export default async function SetupCardPage({
 params,
}: {
 params: Promise<{ token: string }>;
}) {
 const { token } = await params;
 return <SetupCardClient token={token} />;
}
