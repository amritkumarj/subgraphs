// map blockchain data to entities outlined in schema.graphql
import { createBorrow, createDeposit, createLiquidation, createMarket, createRepay, createWithdraw } from "./helpers";

import { Mint, Redeem, Borrow, RepayBorrow, LiquidateBorrow, Transfer } from "../types/templates/cToken/CToken";

import {
  MarketEntered,
  MarketExited,
  MarketListed,
  NewCloseFactor,
  NewCollateralFactor,
  NewLiquidationIncentive,
  NewPriceOracle,
  ClaimCompCall,
} from "../types/Comptroller/Comptroller";

import { CToken } from "../types/templates";
import { AccrueInterest, NewMarketInterestRateModel, NewReserveFactor } from "../types/Comptroller/cToken";
import { updateFinancials, updateMarketMetrics, updateUsageMetrics } from "../common/metrics";
import { getOrCreateLendingProtcol } from "../common/getters";
import { Market } from "../types/schema";
import { exponentToBigDecimal } from "../common/utils/utils";

export function handleMint(event: Mint): void {
  if (createDeposit(event, event.params.mintAmount, event.params.minter)) {
    updateUsageMetrics(event, event.params.minter);
    updateFinancials(event);
    updateMarketMetrics(event);
  }
}

export function handleRedeem(event: Redeem): void {
  if (createWithdraw(event, event.params.redeemer, event.params.redeemAmount)) {
    updateUsageMetrics(event, event.params.redeemer);
    updateFinancials(event);
    updateMarketMetrics(event);
  }
}

export function handleBorrow(event: Borrow): void {
  if (createBorrow(event, event.params.borrower, event.params.borrowAmount)) {
    updateUsageMetrics(event, event.params.borrower);
    updateFinancials(event);
    updateMarketMetrics(event);
  }
}

export function handleRepayBorrow(event: RepayBorrow): void {
  if (createRepay(event, event.params.payer, event.params.repayAmount)) {
    updateUsageMetrics(event, event.params.payer);
    updateFinancials(event);
    updateMarketMetrics(event);
  }
}

export function handleLiquidateBorrow(event: LiquidateBorrow): void {
  if (
    createLiquidation(
      event,
      event.params.cTokenCollateral,
      event.params.liquidator,
      event.params.seizeTokens,
      event.params.repayAmount,
    )
  ) {
    updateUsageMetrics(event, event.params.liquidator);
    updateFinancials(event);
    updateMarketMetrics(event);
  }
}

export function handleMarketListed(event: MarketListed): void {
  // a new market/cToken pair is added to the protocol
  // create a new CToken data source template
  CToken.create(event.params.cToken);

  // create new market now that the data source is instantiated
  let market = createMarket(
    event.params.cToken.toHexString(),
    event.address.toHexString(),
    event.block.number,
    event.block.timestamp,
  );
  market.save();
}

export function handleNewPriceOracle(event: NewPriceOracle): void {
  // create LendingProtocol - first function to be called in Comptroller
  let lendingProtocol = getOrCreateLendingProtcol();

  lendingProtocol._priceOracle = event.params.newPriceOracle;
  lendingProtocol.save();
}

export function handleTransfer(event: Transfer): void {}

export function handleAccrueInterest(event: AccrueInterest): void {}

export function handleNewReserveFactor(event: NewReserveFactor): void {}

export function handleNewMarketInterestRateModel(event: NewMarketInterestRateModel): void {}

export function handleMarketEntered(event: MarketEntered): void {}

export function handleMarketExited(event: MarketExited): void {}

export function handleNewCloseFactor(event: NewCloseFactor): void {}

export function handleNewCollateralFactor(event: NewCollateralFactor): void {
  // update LTV for a given market
  let market = Market.load(event.params.cToken.toHexString());
  if (market == null) {
    return;
  }
  let newLTV = event.params.newCollateralFactorMantissa.toBigDecimal().div(exponentToBigDecimal(18));
  market.maximumLTV = newLTV;
  market.save();
}

// export function handleNewMaxAssets(event: NewMaxAssets): void {}

export function handleNewLiquidationIncentive(event: NewLiquidationIncentive): void {}

export function handleClaimComp(call: ClaimCompCall): void {}
