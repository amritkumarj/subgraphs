// map blockchain data to entities outlined in schema.graphql

import { 
  COMPOUND_DECIMALS 
} from "../common/constants"

import { 
  createLendingProtocol,
  getTokenPrice,
  createMarket
} from "./helpers"

import {
  Mint,
  Redeem,
  Borrow as BorrowEvent,
  RepayBorrow,
  LiquidateBorrow,
} from "../types/cCOMP/cToken"

import {
  NewPriceOracle
} from "../types/Comptroller/Comptroller"

import { 
  LendingProtocol,
  Market,
  Deposit,
  Withdraw,
  Borrow as BorrowEntity,
  Repay,
  Liquidation,
  } from "../types/schema"

  import {
    COMPTROLLER_ADDRESS,
    MARKETS
  } from "../common/addresses"


  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.


export function handleMint(event: Mint): void {
  // get reused vars
  let marketAddress = event.transaction.to!
  let blockNumber = event.block.number
  let transactionHash = event.transaction.hash.toHexString()
  let logIndex = event.logIndex
  let id = transactionHash + '-' + logIndex.toString()
  let market = Market.load(marketAddress.toHexString())

  // create Market if not already (also creates market Tokens)
  if (market == null) {
    market = createMarket(marketAddress.toHexString())
  }

  // create new Deposit
  let deposit = new Deposit(id)

  // fill in deposit vars
  deposit.hash = transactionHash
  deposit.logIndex = logIndex.toI32()
  deposit.protocol = COMPTROLLER_ADDRESS.toHexString()
  deposit.to = marketAddress.toHexString()
  deposit.from = event.params.minter.toHexString()
  deposit.blockNumber = blockNumber
  deposit.timestamp = event.block.timestamp
  deposit.market = marketAddress.toHexString()
  deposit.asset = MARKETS[marketAddress.toHexString()].underlyingAddress.toHexString()
  deposit.amount = event.params.mintAmount // TODO: change to actual amount not 8000000...00

  // get usdPrice
  let usdPrice = getTokenPrice(
    blockNumber.toI32(), 
    event.address, 
    marketAddress, 
    COMPOUND_DECIMALS
  )
  deposit.amountUSD = usdPrice

  deposit.save()

  market.save()
}

export function handleRedeem(event: Redeem): void {
  // reused vars
  let marketAddress = event.transaction.from
  let blockNumber = event.block.number
  let transactionHash = event.transaction.hash.toHexString()
  let logIndex = event.logIndex
  let id = transactionHash + '-' + logIndex.toString()
  let market = Market.load(marketAddress.toHexString())

  // create Market if not already (also creates market Tokens)
  
  if (market == null) {
    market = createMarket(marketAddress.toHexString())
  }
  

  // creates Withdraw entity
  let withdraw = new Withdraw(id)

  // fill in withdraw vars
  withdraw.hash = transactionHash
  withdraw.logIndex = logIndex.toI32()
  withdraw.protocol = COMPTROLLER_ADDRESS.toHexString()
  withdraw.to = event.transaction.to!.toHexString()
  withdraw.from = marketAddress.toHexString()
  withdraw.blockNumber = blockNumber
  withdraw.timestamp = event.block.timestamp
  withdraw.market = marketAddress.toHexString()
  withdraw.asset = MARKETS[marketAddress.toHexString()].underlyingAddress.toHexString()
  withdraw.amount = event.params.redeemAmount

  // get usd amount
  let usdPrice = getTokenPrice(
    blockNumber.toI32(),
    event.address,
    marketAddress,
    COMPOUND_DECIMALS
  )
  withdraw.amountUSD = usdPrice

  withdraw.save()

  market.save()
}

export function handleBorrow(event: BorrowEvent): void {
  // reused vars
  let marketAddress = event.transaction.from
  let blockNumber = event.block.number
  let transactionHash = event.transaction.hash.toHexString()
  let logIndex = event.logIndex
  let id = transactionHash + '-' + logIndex.toString()
  let market = Market.load(marketAddress.toHexString())

  // create Market if not already (also creates market Tokens)
  if (market == null) {
    market = createMarket(marketAddress.toHexString())
  }

  // creates Borrow entity
  let borrow = new BorrowEntity(id)

  // fill in borrow vars
  borrow.hash = transactionHash
  borrow.logIndex = logIndex.toI32()
  borrow.protocol = COMPTROLLER_ADDRESS.toHexString()
  borrow.to = event.params.borrower.toHexString()
  borrow.from = marketAddress.toHexString()
  borrow.blockNumber = blockNumber
  borrow.timestamp = event.block.timestamp
  borrow.market = marketAddress.toHexString()
  borrow.asset = MARKETS[marketAddress.toHexString()].underlyingAddress.toHexString()
  borrow.amount = event.params.borrowAmount

  // get usdPrice
  let usdPrice = getTokenPrice(
    blockNumber.toI32(),
    event.address,
    marketAddress,
    COMPOUND_DECIMALS
  )
  borrow.amountUSD = usdPrice

  borrow.save()

  // update Market canBorrowFrom marketAddress
  market.canBorrowFrom = true

  market.save()
}

export function handleRepayBorrow(event: RepayBorrow): void {
  // reused vars
  let marketAddress = event.transaction.to!
  let blockNumber = event.block.number
  let transactionHash = event.transaction.hash.toHexString()
  let logIndex = event.logIndex
  let id = transactionHash + '-' + logIndex.toString()
  let market = Market.load(marketAddress.toHexString())

  // create Market if not already (also creates market Tokens)
  if (market == null) {
    market = createMarket(marketAddress.toHexString())
  }

  // create Repay entity
  let repay = new Repay(id)

  // populate repay vars
  repay.hash = transactionHash
  repay.logIndex = logIndex.toI32()
  repay.protocol = COMPTROLLER_ADDRESS.toHexString()
  repay.to = marketAddress.toHexString()
  repay.from = event.params.payer.toHexString()
  repay.blockNumber = blockNumber
  repay.timestamp = event.block.timestamp
  repay.market = marketAddress.toHexString()
  repay.asset = MARKETS[marketAddress.toHexString()].underlyingAddress.toHexString()
  repay.amount = event.params.repayAmount

  // get usdPrice
  let usdPrice = getTokenPrice(
    blockNumber.toI32(),
    event.address,
    marketAddress,
    COMPOUND_DECIMALS
  )
  repay.amountUSD = usdPrice

  repay.save()

  market.save()
}

export function handleLiquidateBorrow(event: LiquidateBorrow): void {
  // reused vars
  let marketAddress = event.transaction.to!
  let blockNumber = event.block.number
  let transactionHash = event.transaction.hash.toHexString()
  let logIndex = event.logIndex
  let id = transactionHash + '-' + logIndex.toString()
  let market = Market.load(marketAddress.toHexString())

  // create Market if not already (also creates market Tokens)
  if (market == null) {
    market = createMarket(marketAddress.toHexString())
  }
  
  // create liquidation entity
  let liquidation = new Liquidation(id)

  // populate liquidations vars
  liquidation.hash = transactionHash
  liquidation.logIndex = logIndex.toI32()
  liquidation.protocol = COMPTROLLER_ADDRESS.toHexString()
  liquidation.to = marketAddress.toHexString()
  liquidation.from = event.params.liquidator.toHexString()
  liquidation.blockNumber = blockNumber
  liquidation.timestamp = event.block.timestamp
  liquidation.market = marketAddress.toHexString()
  liquidation.asset = MARKETS[marketAddress.toHexString()].underlyingAddress.toHexString()
  liquidation.amount = event.params.repayAmount

  // get usdPrice
  let usdPrice = getTokenPrice(
    blockNumber.toI32(),
    event.address,
    marketAddress,
    COMPOUND_DECIMALS
  )
  liquidation.amountUSD = usdPrice

  liquidation.save()

  market.save()

  // update canUseAsCollateral in Market
  let collateralToken = event.params.cTokenCollateral.toHexString()
  let collateralMarket = new Market(collateralToken)

  if (collateralMarket == null) {
    collateralMarket = createMarket(collateralToken)
  }

  collateralMarket.canUseAsCollateral = true
  collateralMarket.save()
}

export function handleNewPriceOracle(event: NewPriceOracle): void {
  // create LendingProtocol - first function to be called in Comptroller
  let lendingProtocol = LendingProtocol.load(COMPTROLLER_ADDRESS.toHexString())
  if (lendingProtocol == null) {
    lendingProtocol = createLendingProtocol()
  }
  lendingProtocol._priceOracle = event.params.newPriceOracle
  lendingProtocol.save()
}
