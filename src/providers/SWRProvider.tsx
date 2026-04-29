"use client";

import { SWRConfig } from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
};

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus:     false,
        revalidateOnReconnect: false,
        revalidateIfStale:     false,
        dedupingInterval:      60_000,
        keepPreviousData:      true,
        errorRetryCount:       2,
      }}
    >
      {children}
    </SWRConfig>
  );
}
