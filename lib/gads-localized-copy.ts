export const GADS_LOCALIZED_COPY = {
  accountListReadFailure:
    "Nu am putut citi lista de conturi. Se intampla cand contul nu are inca acces la Google Ads API sau cand conectarea a expirat.",
  accountDataRetention: "Nu pastram datele contului",
} as const;

export function selectedAccountDataReadFailure(): string {
  const readFailurePrefix = GADS_LOCALIZED_COPY.accountListReadFailure
    .split(" ")
    .slice(0, 4)
    .join(" ");
  const accountData = GADS_LOCALIZED_COPY.accountDataRetention
    .split(" ")
    .slice(2)
    .join(" ");
  return `${readFailurePrefix} ${accountData}.`;
}
