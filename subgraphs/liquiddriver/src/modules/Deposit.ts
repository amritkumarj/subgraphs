import {
  Token,
  Vault as VaultStore,
  Deposit as DepositTransaction,
} from "../../generated/schema";
import {
  getOrCreateYieldAggregator,
  getOrCreateUsageMetricsDailySnapshot,
  getOrCreateUsageMetricsHourlySnapshot,
} from "../common/initializers";
import {
  log,
  BigInt,
  Address,
  ethereum,
  BigDecimal,
} from "@graphprotocol/graph-ts";
import * as utils from "../common/utils";
import { getUsdPricePerToken } from "../Prices";
import * as constants from "../common/constants";
import { Vault as VaultContract } from "../../generated/Registry_v1/Vault";

export function createDepositTransaction(
  to: Address,
  vaultAddress: Address,
  transaction: ethereum.Transaction,
  block: ethereum.Block,
  assetId: string,
  amount: BigInt,
  amountUSD: BigDecimal
): DepositTransaction {
  let transactionId = "deposit-" + transaction.hash.toHexString();

  let depositTransaction = DepositTransaction.load(transactionId);

  if (!depositTransaction) {
    depositTransaction = new DepositTransaction(transactionId);

    depositTransaction.vault = vaultAddress.toHexString();
    depositTransaction.protocol = constants.ETHEREUM_PROTOCOL_ID;

    depositTransaction.to = to.toHexString();
    depositTransaction.from = transaction.from.toHexString();

    depositTransaction.hash = transaction.hash.toHexString();
    depositTransaction.logIndex = transaction.index.toI32();

    depositTransaction.asset = assetId;
    depositTransaction.amount = amount;
    depositTransaction.amountUSD = amountUSD;

    depositTransaction.timestamp = utils.getTimestampInMillis(block);
    depositTransaction.blockNumber = block.number;

    depositTransaction.save();
  }

  return depositTransaction;
}

export function calculateAmountDeposited(
  vaultAddress: Address,
  sharesMinted: BigInt
): BigInt {
  let vaultContract = VaultContract.bind(vaultAddress);
  let totalAssets = utils.readValue<BigInt>(
    vaultContract.try_totalAssets(),
    constants.BIGINT_ZERO
  );
  let totalSupply = utils.readValue<BigInt>(
    vaultContract.try_totalSupply(),
    constants.BIGINT_ZERO
  );

  let amount = totalSupply.isZero()
    ? constants.BIGINT_ZERO
    : sharesMinted.times(totalAssets).div(totalSupply);

  return amount;
}

export function _Deposit(
  to: Address,
  transaction: ethereum.Transaction,
  block: ethereum.Block,
  vault: VaultStore,
  depositAmount: BigInt,
  sharesMinted: BigInt | null
): void {
  const vaultAddress = Address.fromString(vault.id);
  const protocol = getOrCreateYieldAggregator(constants.ETHEREUM_PROTOCOL_ID);


  let inputToken = Token.load(vault.inputToken);
  let inputTokenAddress = Address.fromString(vault.inputToken);

  if(constants.ShadowTokensUnderlying[vault.inputToken.toLowerCase()]){
      inputTokenAddress = Address.fromString(constants.ShadowTokensUnderlying[vault.inputToken.toLowerCase()])
  }
  
  let inputTokenPrice = getUsdPricePerToken(inputTokenAddress);
  let inputTokenDecimals = constants.BIGINT_TEN.pow(inputToken!.decimals as u8);

  vault.totalValueLockedUSD = inputTokenPrice.usdPrice
    .times(vault.inputTokenBalance.toBigDecimal())
    .div(inputTokenDecimals.toBigDecimal())
    .div(inputTokenPrice.decimalsBaseTen);

  vault.inputTokenBalance = vault.inputTokenBalance.plus(depositAmount);
  

  protocol.totalValueLockedUSD = protocol.totalValueLockedUSD.plus(
    inputTokenPrice.usdPrice
      .times(depositAmount.toBigDecimal())
      .div(inputTokenDecimals.toBigDecimal())
      .div(inputTokenPrice.decimalsBaseTen)
  );


  vault.save();

  let depositAmountUSD = inputTokenPrice.usdPrice
    .times(depositAmount.toBigDecimal())
    .div(inputTokenDecimals.toBigDecimal())
    .div(inputTokenPrice.decimalsBaseTen);

  createDepositTransaction(
    to,
    vaultAddress,
    transaction,
    block,
    vault.inputToken,
    depositAmount,
    depositAmountUSD
  );

  // Update hourly and daily deposit transaction count
  const metricsDailySnapshot = getOrCreateUsageMetricsDailySnapshot(block);
  const metricsHourlySnapshot = getOrCreateUsageMetricsHourlySnapshot(block);

  metricsDailySnapshot.dailyDepositCount += 1;
  metricsHourlySnapshot.hourlyDepositCount += 1;

  metricsDailySnapshot.save();
  metricsHourlySnapshot.save();

  protocol.save();

}
