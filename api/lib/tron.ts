const TRONSCAN_TRANSACTION_INFO_URL = "https://apilist.tronscanapi.com/api/transaction-info";
const USDT_TRC20_CONTRACT = "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj";
const USDT_DECIMALS = 6;

export type TronPaymentVerification =
  | {
      verified: true;
      txId: string;
      amount: number;
      toAddress: string;
      contractAddress: string;
      confirmed: boolean;
    }
  | {
      verified: false;
      reason: string;
      retryable?: boolean;
    };

type FetchLike = typeof fetch;

type TransferCandidate = {
  contractAddress?: string;
  toAddress?: string;
  amount?: number;
};

function normalizeAddress(value: unknown): string {
  return String(value || "").trim();
}

function normalizeTxId(txId: string): string {
  return txId.trim();
}

function parseUsdtAmount(rawAmount: unknown, decimals: unknown): number | null {
  if (rawAmount === null || rawAmount === undefined) return null;

  const parsed = Number(rawAmount);
  if (!Number.isFinite(parsed) || parsed < 0) return null;

  const divisor = Math.pow(10, Number(decimals ?? USDT_DECIMALS));
  return parsed / divisor;
}

function nearlyEqualAmount(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) < 0.000001;
}

function isSuccessfulTransaction(data: any): boolean {
  const contractRet = String(data?.contractRet || data?.contract_ret || "").toUpperCase();
  const receiptResult = String(data?.receipt?.result || data?.contractData?.contractRet || "").toUpperCase();
  const confirmed = data?.confirmed === true || data?.confirmed === undefined;

  if (!confirmed) return false;
  if (contractRet && contractRet !== "SUCCESS") return false;
  if (receiptResult && receiptResult !== "SUCCESS") return false;

  return true;
}

function extractTransferCandidates(data: any): TransferCandidate[] {
  const candidates: TransferCandidate[] = [];
  const lists = [
    data?.trc20TransferInfo,
    data?.trc20_transfer_info,
    data?.transfersAllList,
    data?.tokenTransferInfo ? [data.tokenTransferInfo] : undefined,
  ].filter(Array.isArray);

  for (const list of lists) {
    for (const item of list) {
      const contractAddress = normalizeAddress(
        item?.contract_address ||
          item?.contractAddress ||
          item?.tokenInfo?.tokenId ||
          item?.tokenInfo?.token_id ||
          item?.tokenInfo?.contract_address,
      );
      const toAddress = normalizeAddress(item?.to_address || item?.toAddress || item?.to);
      const amount = parseUsdtAmount(item?.amount_str ?? item?.amount ?? item?.quant, item?.tokenInfo?.tokenDecimal);

      if (contractAddress && toAddress && amount !== null) {
        candidates.push({ contractAddress, toAddress, amount });
      }
    }
  }

  return candidates;
}

export async function verifyUsdtTrc20Payment(input: {
  txId: string;
  expectedAmount: string | number;
  expectedRecipient: string;
  fetchImpl?: FetchLike;
}): Promise<TronPaymentVerification> {
  const txId = normalizeTxId(input.txId);
  const expectedRecipient = normalizeAddress(input.expectedRecipient);
  const expectedAmount = Number(input.expectedAmount);

  if (!/^[a-fA-F0-9]{64}$/.test(txId)) {
    return { verified: false, reason: "TXID format is invalid" };
  }

  if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
    return { verified: false, reason: "Expected amount is invalid" };
  }

  const fetchImpl = input.fetchImpl || fetch;
  const url = new URL(TRONSCAN_TRANSACTION_INFO_URL);
  url.searchParams.set("hash", txId);

  let response: Response;
  try {
    response = await fetchImpl(url.toString(), {
      headers: { Accept: "application/json" },
    });
  } catch {
    return { verified: false, reason: "Payment verifier is temporarily unavailable", retryable: true };
  }

  if (!response.ok) {
    return { verified: false, reason: "Payment verifier rejected the request", retryable: response.status >= 500 };
  }

  const data = await response.json() as any;
  if (!data || data?.Error || data?.error) {
    return { verified: false, reason: "Transaction was not found yet", retryable: true };
  }

  if (!isSuccessfulTransaction(data)) {
    return { verified: false, reason: "Transaction is not confirmed successfully", retryable: true };
  }

  const matchingTransfer = extractTransferCandidates(data).find((transfer): transfer is Required<TransferCandidate> => {
    return (
      transfer.contractAddress === USDT_TRC20_CONTRACT &&
      transfer.toAddress === expectedRecipient &&
      typeof transfer.amount === "number" &&
      nearlyEqualAmount(transfer.amount, expectedAmount)
    );
  });

  if (!matchingTransfer) {
    return { verified: false, reason: "No matching USDT TRC20 payment to Tradevisor wallet was found" };
  }

  return {
    verified: true,
    txId,
    amount: matchingTransfer.amount,
    toAddress: matchingTransfer.toAddress,
    contractAddress: matchingTransfer.contractAddress,
    confirmed: true,
  };
}
