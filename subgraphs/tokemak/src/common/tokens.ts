import { BigInt, Address, BigDecimal, log } from "@graphprotocol/graph-ts";
import { ERC20 as ERC20Contract } from "../../generated/Manager/ERC20";
import { RewardToken, Token } from "../../generated/schema";

import { DEFAULT_DECIMALS, RewardTokenType, TOKE_ADDRESS, TOKE_NAME, TOKE_SYMBOL } from "../common/constants";

export function getOrCreateToken(address: Address): Token {
  let id = address.toHexString();
  let token = Token.load(id);
  if (!token) {
    token = new Token(id);
    let erc20Contract = ERC20Contract.bind(address);
    let decimals = erc20Contract.try_decimals();
    // Using try_cause some values might be missing
    let name = erc20Contract.try_name();
    let symbol = erc20Contract.try_symbol();
    // TODO: add overrides for name and symbol
    token.decimals = decimals.reverted ? DEFAULT_DECIMALS : decimals.value;
    token.name = name.reverted ? "" : name.value;
    token.symbol = symbol.reverted ? "" : symbol.value;
    token.save();
  }
  return token as Token;
}

export function getOrCreateRewardToken(address: Address): RewardToken {
  let id = address.toHexString();
  let rewardToken = RewardToken.load(id);

  if (!rewardToken) {
    let token = getOrCreateToken(address);
    rewardToken = new RewardToken(id);

    rewardToken.token = token.id
    rewardToken.type = RewardTokenType.DEPOSIT;

    token.save();
  }
  return rewardToken as RewardToken;
}

export function createRewardTokens(): RewardToken {
  const address = Address.fromString(TOKE_ADDRESS);
  const rewardToken = getOrCreateRewardToken(address);

  // Values if TOKE token is not deployed yet
  const token = getOrCreateToken(Address.fromString(rewardToken.token))
  if (token.name === "") {
    token.name = TOKE_NAME;
    token.symbol = TOKE_SYMBOL;
    token.save();
  }
  return rewardToken;
}