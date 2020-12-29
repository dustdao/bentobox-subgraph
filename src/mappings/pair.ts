import {
  Approval,
  LendingPair as LendingPairContract,
  LogAddAsset,
  LogAccrue,
  LogAddBorrow,
  LogAddCollateral,
  LogExchangeRate,
  LogRemoveAsset,
  LogRemoveBorrow,
  LogRemoveCollateral,
  OwnershipTransferred,
  Transfer,
  LogFeeTo,
  LogDev,
  LogWithdrawFees
} from '../../generated/templates/LendingPair/LendingPair'

import { LendingPair, Token, PairTx } from '../../generated/schema'
import { getUser } from './helpers/getUser'
import { getUniqueId } from './helpers/utils'
import {BIG_INT_MINUS_ONE} from './helpers/constants'
import { getUserLendingPairData, getUserLendingPairDataId } from './helpers/getUserLendingPairData'
import { Address, log } from '@graphprotocol/graph-ts'
import { getToken } from './helpers/getToken'

export function handleApproval(event: Approval): void {
  log.info('[BentoBox:LendingPair] Approval {} {} {}', [
    event.params._owner.toHex(),
    event.params._spender.toHex(),
    event.params._value.toString(),
  ])
}

export function handleLogAddAsset(event: LogAddAsset): void {
  log.info('[BentoBox:LendingPair] Log Add Asset {} {} {}', [
    event.params.fraction.toString(),
    event.params.amount.toString(),
    event.params.user.toHex(),
  ])
  const amount = event.params.amount
  const fraction = event.params.fraction
  const lid = event.address.toHex()

  const lendingPair = LendingPair.load(lid)
  lendingPair.totalAssetAmount = lendingPair.totalAssetAmount.plus(amount)
  lendingPair.totalAssetFraction = lendingPair.totalAssetFraction.plus(fraction)
  lendingPair.save()

  const user = getUser(event.params.user, event.block)
  const userData = getUserLendingPairData(event.params.user, event.address)
  userData.balanceOf = userData.balanceOf.plus(fraction)
  userData.save()

  //const tid = lendingPair.asset.toHex()
  const asset = getToken(Address.fromString(lendingPair.asset), event.block)
  const assetTx = new PairTx(getUniqueId(event))
  assetTx.root = getUserLendingPairDataId(event.params.user, event.address)
  assetTx.amount = amount
  assetTx.type = "assetTx"
  assetTx.lendingPair = lid
  assetTx.token = asset.id
  assetTx.fraction = fraction
  assetTx.poolPercentage = fraction.div(lendingPair.totalAssetFraction)
  assetTx.block = event.block.number
  assetTx.timestamp = event.block.timestamp
  assetTx.save()
}

export function handleLogAddBorrow(event: LogAddBorrow): void {
  log.info('[BentoBox:LendingPair] Log Add Borrow {} {} {}', [
    event.params.fraction.toString(),
    event.params.amount.toString(),
    event.params.user.toHex(),
  ])
  const amount = event.params.amount
  const fraction = event.params.fraction
  const lid = event.address.toHex()

  const lendingPair = LendingPair.load(lid)
  lendingPair.totalBorrowFraction = lendingPair.totalBorrowFraction.plus(fraction)
  lendingPair.totalBorrowAmount = lendingPair.totalBorrowAmount.plus(amount)
  lendingPair.save()

  const user = getUserLendingPairData(event.params.user, event.address)
  user.userBorrowFraction = user.userBorrowFraction.plus(fraction)
  user.save()

  //const tid = lendingPair.asset.toHex()
  const asset = getToken(Address.fromString(lendingPair.asset), event.block)
  const borrowTx = new PairTx(getUniqueId(event))
  borrowTx.type = "borrowTx"
  borrowTx.root = getUserLendingPairDataId(event.params.user, event.address)
  borrowTx.amount = amount
  borrowTx.lendingPair = lid
  borrowTx.token = asset.id
  borrowTx.fraction = fraction
  borrowTx.poolPercentage = fraction.div(lendingPair.totalBorrowFraction)
  borrowTx.block = event.block.number
  borrowTx.timestamp = event.block.timestamp
  borrowTx.save()
}

export function handleLogAddCollateral(event: LogAddCollateral): void {
  log.info('[BentoBox:LendingPair] Log Add Collateral {} {}', [
    event.params.amount.toString(),
    event.params.user.toHex(),
  ])
  const amount = event.params.amount
  const lid = event.address.toHex()
  const lendingPair = LendingPair.load(lid)
  lendingPair.totalCollateralAmount = lendingPair.totalCollateralAmount.plus(amount)
  lendingPair.save()

  const user = getUser(event.params.user, event.block)
  const userData = getUserLendingPairData(event.params.user, event.address)
  userData.userCollateralAmount = userData.userCollateralAmount.plus(amount)
  userData.save()

  //const test_collateral = lendingPair.collateral as Token
  log.info('lendingPair-id: {}, collateral: {}', [lid, lendingPair.collateral])

  //const tid = lendingPair.collateral.toHex()
  const collateral = getToken(Address.fromString(lendingPair.collateral), event.block)
  const collateralTx = new PairTx(getUniqueId(event))
  collateralTx.type = "collateralTx"
  collateralTx.root = getUserLendingPairDataId(event.params.user, event.address)
  collateralTx.lendingPair = lid
  collateralTx.token = collateral.id
  collateralTx.amount = amount
  collateralTx.poolPercentage = amount.div(lendingPair.totalCollateralAmount)
  collateralTx.block = event.block.number
  collateralTx.timestamp = event.block.timestamp
  collateralTx.save()
}

export function handleLogExchangeRate(event: LogExchangeRate): void {
  log.info('[BentoBox:LendingPair] Log Exchange Rate {}', [event.params.rate.toString()])
  const lendingPair = LendingPair.load(event.address.toHex())
  lendingPair.exchangeRate = lendingPair.exchangeRate.plus(event.params.rate)
  lendingPair.save()
}

export function handleLogRemoveAsset(event: LogRemoveAsset): void {
  log.info('[BentoBox:LendingPair] Log Remove Asset {} {} {}', [
    event.params.fraction.toString(),
    event.params.amount.toString(),
    event.params.user.toHex(),
  ])
  const fraction = event.params.fraction
  const amount = event.params.amount
  const lid = event.address.toHex()

  const lendingPair = LendingPair.load(lid)
  lendingPair.totalAssetFraction = lendingPair.totalAssetFraction.minus(fraction)
  lendingPair.totalAssetAmount = lendingPair.totalAssetAmount.minus(amount)
  lendingPair.save()

  const user = getUserLendingPairData(event.params.user, event.address)
  user.balanceOf = user.balanceOf.minus(fraction)
  user.save()

  //const tid = lendingPair.asset.toHex()
  const asset = getToken(Address.fromString(lendingPair.asset), event.block)
  const assetTx = new PairTx(getUniqueId(event))
  assetTx.type = "assetTx"
  assetTx.root = getUserLendingPairDataId(event.params.user, event.address)
  assetTx.lendingPair = lid
  assetTx.token = asset.id
  assetTx.fraction = fraction
  assetTx.amount = amount
  assetTx.poolPercentage = fraction.div(lendingPair.totalAssetFraction)
  assetTx.block = event.block.number
  assetTx.timestamp = event.block.timestamp
  assetTx.save()
}

export function handleLogRemoveBorrow(event: LogRemoveBorrow): void {
  log.info('[BentoBox:LendingPair] Log Remove Borrow {} {} {}', [
    event.params.fraction.toString(),
    event.params.amount.toString(),
    event.params.user.toHex(),
  ])
  const amount = event.params.amount
  const fraction = event.params.fraction
  const lid = event.address.toHex()

  const lendingPair = LendingPair.load(lid)
  lendingPair.totalBorrowFraction = lendingPair.totalBorrowFraction.minus(fraction)
  lendingPair.totalBorrowAmount = lendingPair.totalBorrowAmount.minus(amount)
  lendingPair.save()

  const user = getUserLendingPairData(event.params.user, event.address)
  user.userBorrowFraction = user.userBorrowFraction.minus(fraction)
  user.save()

  //const tid = lendingPair.asset.toHex()
  const asset = getToken(Address.fromString(lendingPair.asset), event.block)
  const borrowTx = new PairTx(getUniqueId(event))
  borrowTx.type = "borrowTx"
  borrowTx.root = getUserLendingPairDataId(event.params.user, event.address)
  borrowTx.lendingPair = lid
  borrowTx.token = asset.id
  borrowTx.fraction = fraction
  borrowTx.amount = amount
  borrowTx.poolPercentage = fraction.div(lendingPair.totalBorrowFraction)
  borrowTx.block = event.block.number
  borrowTx.timestamp = event.block.timestamp
  borrowTx.save()
}

export function handleLogRemoveCollateral(event: LogRemoveCollateral): void {
  log.info('[BentoBox:LendingPair] Log Remove Collateral {} {}', [
    event.params.amount.toString(),
    event.params.user.toHex(),
  ])
  const amount = event.params.amount
  const lid = event.address.toHex()

  const lendingPair = LendingPair.load(lid)
  lendingPair.totalCollateralAmount = lendingPair.totalCollateralAmount.minus(amount)
  lendingPair.save()

  const user = getUserLendingPairData(event.params.user, event.address)
  user.userCollateralAmount = user.userCollateralAmount.minus(amount)
  user.save()

  //const tid = lendingPair.collateral.toHex()
  const collateral = getToken(Address.fromString(lendingPair.collateral), event.block)
  const collateralTx = new PairTx(getUniqueId(event))
  collateralTx.type = "collateralTx"
  collateralTx.root = getUserLendingPairDataId(event.params.user, event.address)
  collateralTx.lendingPair = lid
  collateralTx.token = collateral.id
  collateralTx.amount = amount
  collateralTx.poolPercentage = amount.div(lendingPair.totalCollateralAmount)
  collateralTx.block = event.block.number
  collateralTx.timestamp = event.block.timestamp
  collateralTx.save()
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  log.info('[BentoBox:LendingPair] Ownership Transfered {} {}', [
    event.params.newOwner.toHex(),
    event.params.previousOwner.toHex(),
  ])
  const lendingPair = LendingPair.load(event.address.toHex())
  lendingPair.owner = event.params.newOwner
  lendingPair.save()
}

export function handleTransfer(event: Transfer): void {
  log.info('[BentoBox:LendingPair] Transfer {} {}', [
    event.params._from.toHex(),
    event.params._to.toHex(),
    event.params._value.toString(),
  ])
  const sender = getUserLendingPairData(event.params._from, event.address)
  sender.balanceOf = sender.balanceOf.minus(event.params._value)
  sender.save()

  const user = getUser(event.params._to, event.block)
  const receiver = getUserLendingPairData(event.params._to, event.address)
  receiver.balanceOf = receiver.balanceOf.plus(event.params._value)
  receiver.save()
}

export function handleLogAccrue(event: LogAccrue): void {
  log.info('[BentoBox:LendingPair] Log Accrue {} {} {} {}', [event.params.accruedAmount.toString(), event.params.feeAmount.toString(), event.params.rate.toString(), event.params.utilization.toString()])
  const lendingPair = LendingPair.load(event.address.toHex())
  const extraAmount = event.params.accruedAmount
  const feeAmount = event.params.feeAmount
  lendingPair.totalAssetAmount = lendingPair.totalAssetAmount.plus(extraAmount.minus(feeAmount))
  lendingPair.totalBorrowAmount = lendingPair.totalBorrowAmount.plus(extraAmount)
  lendingPair.feesPendingAmount = lendingPair.feesPendingAmount.plus(feeAmount)
  lendingPair.interestPerBlock = event.params.rate
  lendingPair.utilization = event.params.utilization
  lendingPair.lastBlockAccrued = event.block.number
  lendingPair.block = event.block.number
  lendingPair.timestamp = event.block.timestamp
  lendingPair.save()
}

export function handleLogFeeTo(event: LogFeeTo): void {
  const lendingPair = LendingPair.load(event.address.toHex())
  lendingPair.feeTo = event.params.newFeeTo
  lendingPair.block = event.block.number
  lendingPair.timestamp = event.block.timestamp
  lendingPair.save()
}

export function handleLogDev(event: LogDev): void {
  const lendingPair = LendingPair.load(event.address.toHex())
  lendingPair.dev = event.params.newDev
  lendingPair.block = event.block.number
  lendingPair.timestamp = event.block.timestamp
  lendingPair.save()
}

export function handleLogWithdrawFees(event: LogDev): void {
  const lendingPair = LendingPair.load(event.address.toHex())
  //lendingPair.feesPendingAmount = event.params.feesPendingAmount
  lendingPair.block = event.block.number
  lendingPair.timestamp = event.block.timestamp
  lendingPair.save()
}
