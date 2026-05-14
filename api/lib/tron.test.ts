import { describe, expect, it, vi } from "vitest";
import { verifyUsdtTrc20Payment } from "./tron";

const WALLET = "TYLqLhbtJSAaPZbibEZ1JtHfAD2ZJ71qHA";
const TXID = "a".repeat(64);

function jsonResponse(body: unknown, ok = true) {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  } as Response;
}

describe("verifyUsdtTrc20Payment", () => {
  it("accepts a confirmed USDT TRC20 payment to the Tradevisor wallet", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        confirmed: true,
        contractRet: "SUCCESS",
        trc20TransferInfo: [
          {
            contract_address: "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj",
            to_address: WALLET,
            amount_str: "69000000",
            tokenInfo: { tokenDecimal: 6 },
          },
        ],
      }),
    );

    await expect(
      verifyUsdtTrc20Payment({
        txId: TXID,
        expectedAmount: "69",
        expectedRecipient: WALLET,
        fetchImpl,
      }),
    ).resolves.toMatchObject({
      verified: true,
      amount: 69,
      toAddress: WALLET,
    });
  });

  it("rejects a valid transaction that paid the wrong amount", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        confirmed: true,
        contractRet: "SUCCESS",
        trc20TransferInfo: [
          {
            contract_address: "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj",
            to_address: WALLET,
            amount_str: "68000000",
            tokenInfo: { tokenDecimal: 6 },
          },
        ],
      }),
    );

    await expect(
      verifyUsdtTrc20Payment({
        txId: TXID,
        expectedAmount: "69",
        expectedRecipient: WALLET,
        fetchImpl,
      }),
    ).resolves.toMatchObject({
      verified: false,
      reason: "No matching USDT TRC20 payment to Tradevisor wallet was found",
    });
  });

  it("rejects txids that are not blockchain transaction hashes", async () => {
    await expect(
      verifyUsdtTrc20Payment({
        txId: "fake-demo-payment",
        expectedAmount: "69",
        expectedRecipient: WALLET,
        fetchImpl: vi.fn(),
      }),
    ).resolves.toMatchObject({
      verified: false,
      reason: "TXID format is invalid",
    });
  });
});
