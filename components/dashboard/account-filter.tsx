"use client";

import { useRouter, useSearchParams } from "next/navigation";
import AccountSelect, { type AccountOption } from "@/components/account-select";

interface Props {
  accounts: AccountOption[];
}

export default function AccountFilter({ accounts }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const value = searchParams.get("accountId") ?? "all";

  function handleChange(accountId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (accountId === "all") {
      params.delete("accountId");
    } else {
      params.set("accountId", accountId);
    }
    router.push(`?${params.toString()}`);
  }

  return <AccountSelect accounts={accounts} value={value} onChange={handleChange} />;
}
