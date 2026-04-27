import { notFound } from "next/navigation";
import SetupCardClient from "./SetupCardClient";

export const dynamic = "force-dynamic";

export default async function SetupCardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 10) notFound();
  return <SetupCardClient token={token} />;
}
