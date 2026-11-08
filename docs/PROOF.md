# Proof

Everything MANDATE claims, with a link you can check. Generated from the live record by
`node scripts/proof-md.js` on 2026-11-08 20:24 UTC. The live
version of this page is the [Explorer](https://mandate-gules-five.vercel.app/explorer).

## At a glance

| | |
| --- | --- |
| Payments on Sui mainnet | **213** (6.33 USDC moved) |
| Tasks completed | **198** |
| Memories on Walrus Memory | **590** in 28 namespaces |
| Payments independently re-read through Tatum | **213 of 213** |
| Wallet Risk Report | 74 payments, 1.48 USDC |
| Premium Summariser | 42 payments, 2.10 USDC |
| Token Holder Check | 87 payments, 2.61 USDC |
| Transfer | 7 payments, 0.07 USDC |
| Swap | 3 payments, 0.07 USDC |

## The contract

| | |
| --- | --- |
| Package `mandate::grant` (first publish) | [`0x50654129…9993`](https://suiscan.xyz/mainnet/object/0x5065412934bf6d7e344656972694e5f0c84a5c02c05472787076f4bdc72b9993), published in [`6sfEdFpVsK…`](https://suiscan.xyz/mainnet/tx/6sfEdFpVsK4fjWf5WaroobPhS2S3cQ4fbMwTLTKDcmH3) |
| Latest version (custody and swaps) | [`0xef2d8871…2657`](https://suiscan.xyz/mainnet/object/0xef2d8871cd2efb49fda1dd5da9a548eb65605b27f451cd9053458b3ba9f22657), upgraded in [`5KyvmFD1Uh…`](https://suiscan.xyz/mainnet/tx/5KyvmFD1UhT1RrrG5tdP5zDBZtfkdHJinLpX6EdovTQs) |
| Custody upgrade (funds held in the mandate) | [`0x8c54c836…b5be`](https://suiscan.xyz/mainnet/object/0x8c54c836705795a63c6bd1a8432e0b48a97ae58084e36db839515e139ba3b5be) |
| Move unit tests | 36, run in CI |

## The learning result

The same 50 tasks (`scripts/tasks.json`), run twice on mainnet with real payments: once with memory
off, once with memory on starting empty. Ratings come from a deterministic rater applied to both runs
([ADR 0001](adr/0001-scripted-rater.md)). Raw data: [`docs/replay/`](replay/).

| | Memory off | Memory on | Change |
| --- | --- | --- | --- |
| Total spent | 2.50 USDC | 1.38 USDC | -45% |
| Wasted on useless sources | 1.25 USDC | 0.18 USDC | **-86%** |
| Wasted share of spend | 50% | 13% | |
| Cost per useful answer | 0.05 USDC | 0.03 USDC | **-43%** |
| Useful answers | 50 | 48 | |
| Paid calls | 75 | 52 | |

## Dead man's switch, on mainnet

Mandate [`0xbdf8516d…7077`](https://suiscan.xyz/mainnet/object/0xbdf8516d498cb27d3255a8b21b17caf9c6d5ecb685268e10bb2b88d4617d7077) with a 2-minute check-in window (`scripts/dormancy-demo.js`):

| Time (UTC) | Event | Result |
| --- | --- | --- |
| 20:36:59 | grant created | [`41RV6zPvK2…`](https://suiscan.xyz/mainnet/tx/41RV6zPvK22rRkY8AfFQ7zdCfWicfokLCeMKVzZMKRxb) |
| 20:38:02 | task while active | paid [`8bXF3qwAVE…`](https://suiscan.xyz/mainnet/tx/8bXF3qwAVEuvEeVAuYFyEqCCdtXUm521sreqnU9kZoKQ) |
| 20:38:02 | owner goes quiet | no check-in for 150s |
| 20:40:39 | task after silence | refused: dormant: grant is dormant |
| 20:40:42 | owner heartbeat | [`E61fPiEGVh…`](https://suiscan.xyz/mainnet/tx/E61fPiEGVh4qzwn4qnrqCFjWRRSMW9vrr2fjPZkcjMDc) |
| 20:40:57 | task after heartbeat | paid [`33XERtr7so…`](https://suiscan.xyz/mainnet/tx/33XERtr7sod12gW9xw8UQq3dzof9s9EQ7bvHoPboAZic) |

## Every payment

Newest first. Each is a real USDC transfer on Sui mainnet. Payments by signed-in users are listed
without their (private) receipt.

| Task | What | Amount | Transaction | Verified |
| --- | --- | --- | --- | --- |
| [`53f3496a`](https://mandate-gules-five.vercel.app/receipts/53f3496a) | Token Holder Check | 0.03 USDC | [`5Yoe4U9tW2…`](https://suiscan.xyz/mainnet/tx/5Yoe4U9tW2YrfZVUE3yN1xXc2TUd5oaU1kzN3kg81DL1) | Tatum gRPC |
| [`98d6ff10`](https://mandate-gules-five.vercel.app/receipts/98d6ff10) | Token Holder Check | 0.03 USDC | [`8cHAubxcSw…`](https://suiscan.xyz/mainnet/tx/8cHAubxcSwLNJzYmxWHMSUHhtS8atar4EanZgHDxVcKY) | Tatum gRPC |
| private | Swap | 0.02 USDC | [`6op9HE766V…`](https://suiscan.xyz/mainnet/tx/6op9HE766VQqHVYRgTfA76ttcRkJ3oMwBJ7aMnVevP22) | Tatum gRPC |
| private | Swap | 0.02 USDC | [`A8d7uQt958…`](https://suiscan.xyz/mainnet/tx/A8d7uQt958M2WXaV1tGULRPcuBvxrhpFcEdNyiBEFxGc) | Tatum gRPC |
| private | Swap | 0.03 USDC | [`7n3GXgpmmX…`](https://suiscan.xyz/mainnet/tx/7n3GXgpmmXL9ZEWAUsK9NAGmk6pRXZJ36FHca34imxzg) | Tatum gRPC |
| [`5d9410d9`](https://mandate-gules-five.vercel.app/receipts/5d9410d9) | Token Holder Check | 0.03 USDC | [`G9nYUTvSXg…`](https://suiscan.xyz/mainnet/tx/G9nYUTvSXgcxfRuManqctXjdknRvQbnnm51NVPEqhQRk) | Tatum gRPC |
| [`58b295bb`](https://mandate-gules-five.vercel.app/receipts/58b295bb) | Token Holder Check | 0.03 USDC | [`BX2oPtvVP3…`](https://suiscan.xyz/mainnet/tx/BX2oPtvVP31TjJYZEpvhDsU7hcsQZzFjSeRcXV2QHuMc) | Tatum gRPC |
| [`f148e96b`](https://mandate-gules-five.vercel.app/receipts/f148e96b) | Token Holder Check | 0.03 USDC | [`63fYGWJjHR…`](https://suiscan.xyz/mainnet/tx/63fYGWJjHRnuyn8meHfuzjtD786RTbsBRC33csPiDB7U) | Tatum gRPC |
| [`11ea8a21`](https://mandate-gules-five.vercel.app/receipts/11ea8a21) | Token Holder Check | 0.03 USDC | [`7jXBWGTuiU…`](https://suiscan.xyz/mainnet/tx/7jXBWGTuiU2PjWv46SV1UrPCf5P7csnSWBjD2hvjUxeM) | Tatum gRPC |
| private | Transfer | 0.01 USDC | [`LuoS9jLiEP…`](https://suiscan.xyz/mainnet/tx/LuoS9jLiEPEitNCf7FxQZhU5U5hcXtfr9dGhCypfvZx) | Tatum gRPC |
| private | Token Holder Check | 0.03 USDC | [`FB8RqUWaaG…`](https://suiscan.xyz/mainnet/tx/FB8RqUWaaGUpr9pgpe2VP9gwbzhfexdXG7eBCgptT4th) | Tatum gRPC |
| [`b0299a21`](https://mandate-gules-five.vercel.app/receipts/b0299a21) | Token Holder Check | 0.03 USDC | [`KDbpKJAd5o…`](https://suiscan.xyz/mainnet/tx/KDbpKJAd5oPTJrcQHqxeVLB7kVudcb1kLda6AxWjBu1) | Tatum gRPC |
| private | Transfer | 0.01 USDC | [`FfrEQZkoet…`](https://suiscan.xyz/mainnet/tx/FfrEQZkoetVwzaR3VSP8Mjrz7i6s1qPU9w8B8RLRqAT4) | Tatum gRPC |
| private | Transfer | 0.01 USDC | [`5tguBitmT9…`](https://suiscan.xyz/mainnet/tx/5tguBitmT9wSYwGvK2LrtyyjgdZYA6R4Xt4XCQWVc2sE) | Tatum gRPC |
| private | Transfer | 0.01 USDC | [`4kN2rAiUx9…`](https://suiscan.xyz/mainnet/tx/4kN2rAiUx9W7X5iYDp8ozwA3UsXeD2g6R7GeVo6yPjG1) | Tatum gRPC |
| private | Token Holder Check | 0.03 USDC | [`FoPvdNHVeZ…`](https://suiscan.xyz/mainnet/tx/FoPvdNHVeZuAsy5VdBeZMf2f3thvE2HBSMSWfEuf9oza) | Tatum gRPC |
| [`42fc1413`](https://mandate-gules-five.vercel.app/receipts/42fc1413) | Token Holder Check | 0.03 USDC | [`FAAdEwi2NG…`](https://suiscan.xyz/mainnet/tx/FAAdEwi2NGk18CR1ddjWMh61E13JPCGs27f5tdyre2ht) | Tatum gRPC |
| [`2110edbf`](https://mandate-gules-five.vercel.app/receipts/2110edbf) | Token Holder Check | 0.03 USDC | [`7i7rTViGRz…`](https://suiscan.xyz/mainnet/tx/7i7rTViGRz9P9qfVUgdR5XLWCkNnPUcfvpXc4XCbBy6n) | Tatum gRPC |
| [`3a8fbff5`](https://mandate-gules-five.vercel.app/receipts/3a8fbff5) | Token Holder Check | 0.03 USDC | [`bp4PqFexPE…`](https://suiscan.xyz/mainnet/tx/bp4PqFexPE5tdRjdgAwZ7E1YC3BajXHbrmfXyqNSFh8) | Tatum gRPC |
| private | Transfer | 0.01 USDC | [`6K3qZuDbSx…`](https://suiscan.xyz/mainnet/tx/6K3qZuDbSxLa4DawKBuqkLK9jEBxQdbo62fjVTpEX8sT) | Tatum gRPC |
| private | Transfer | 0.01 USDC | [`cd8tbTviQ1…`](https://suiscan.xyz/mainnet/tx/cd8tbTviQ1dfviPsaVherAjTCoibdR4fS3qHZqvnozD) | Tatum gRPC |
| private | Transfer | 0.01 USDC | [`9irtmwdwg9…`](https://suiscan.xyz/mainnet/tx/9irtmwdwg9uQDEdJnPVm3oVhrkpVUKXjuQVCkLB62LkE) | Tatum gRPC |
| private | Token Holder Check | 0.03 USDC | [`Hx8wG5vXJ1…`](https://suiscan.xyz/mainnet/tx/Hx8wG5vXJ1ixAQsdU5UBc2WU4mmxgtTfw7hrqxyzizoc) | Tatum gRPC |
| [`078b0614`](https://mandate-gules-five.vercel.app/receipts/078b0614) | Premium Summariser | 0.05 USDC | [`Gyvf4CHhUL…`](https://suiscan.xyz/mainnet/tx/Gyvf4CHhUL2j7zTgoYMqW9CFz85QUqBoALX9TBf5Phnx) | Tatum gRPC |
| [`078b0614`](https://mandate-gules-five.vercel.app/receipts/078b0614) | Wallet Risk Report | 0.02 USDC | [`976NEE2HYA…`](https://suiscan.xyz/mainnet/tx/976NEE2HYAA1i7h2ewZzMC7Z6oWChP9JHUoAEMGoPWcj) | Tatum gRPC |
| [`eb59460a`](https://mandate-gules-five.vercel.app/receipts/eb59460a) | Token Holder Check | 0.03 USDC | [`AUxbjwJTbP…`](https://suiscan.xyz/mainnet/tx/AUxbjwJTbPRyJNqHDGL3kZKNf8afjmn5rd4RgEAWG4Ds) | Tatum gRPC |
| [`bdf62798`](https://mandate-gules-five.vercel.app/receipts/bdf62798) | Premium Summariser | 0.05 USDC | [`ASEVbk1DBu…`](https://suiscan.xyz/mainnet/tx/ASEVbk1DBu7h7egpVtC9tX3VSj9h7sNo5q7YLGkYLcqG) | Tatum gRPC |
| [`bdf62798`](https://mandate-gules-five.vercel.app/receipts/bdf62798) | Wallet Risk Report | 0.02 USDC | [`CLtU8aHQFv…`](https://suiscan.xyz/mainnet/tx/CLtU8aHQFvwyf9PfkKxNjRKQ3qYUYzVGzjGVuPwExwEk) | Tatum gRPC |
| [`f2a418f3`](https://mandate-gules-five.vercel.app/receipts/f2a418f3) | Premium Summariser | 0.05 USDC | [`xPh9UAQ3LW…`](https://suiscan.xyz/mainnet/tx/xPh9UAQ3LWpHhwUsxStHYFhVPLLp5fqybnX3eRH8Tki) | Tatum gRPC |
| [`f2a418f3`](https://mandate-gules-five.vercel.app/receipts/f2a418f3) | Wallet Risk Report | 0.02 USDC | [`FYHJFd75om…`](https://suiscan.xyz/mainnet/tx/FYHJFd75omcET2uuvS7kTKN8jdmqAqtpryWCx8vSiKUb) | Tatum gRPC |
| [`eb38f674`](https://mandate-gules-five.vercel.app/receipts/eb38f674) | Token Holder Check | 0.03 USDC | [`LpzcfSDDfi…`](https://suiscan.xyz/mainnet/tx/LpzcfSDDfiJPHaa3rcFBfPyEbYYB3XBb5mYDc6nyV6F) | Tatum gRPC |
| [`786cd30d`](https://mandate-gules-five.vercel.app/receipts/786cd30d) | Token Holder Check | 0.03 USDC | [`33XERtr7so…`](https://suiscan.xyz/mainnet/tx/33XERtr7sod12gW9xw8UQq3dzof9s9EQ7bvHoPboAZic) | Tatum gRPC |
| [`971b18c8`](https://mandate-gules-five.vercel.app/receipts/971b18c8) | Token Holder Check | 0.03 USDC | [`8bXF3qwAVE…`](https://suiscan.xyz/mainnet/tx/8bXF3qwAVEuvEeVAuYFyEqCCdtXUm521sreqnU9kZoKQ) | Tatum gRPC |
| [`c22b8c1c`](https://mandate-gules-five.vercel.app/receipts/c22b8c1c) | Token Holder Check | 0.03 USDC | [`Fr1xo1R7YG…`](https://suiscan.xyz/mainnet/tx/Fr1xo1R7YGvqEbj5B9pPrs4Q7zqom4nYfmPaCGA2QzNL) | Tatum gRPC |
| [`fbc0c3d8`](https://mandate-gules-five.vercel.app/receipts/fbc0c3d8) | Premium Summariser | 0.05 USDC | [`DvsVGCeJ6S…`](https://suiscan.xyz/mainnet/tx/DvsVGCeJ6SFSqgwkECB55PENFGMaf6EdsDvTBYDe7NTy) | Tatum gRPC |
| [`fbc0c3d8`](https://mandate-gules-five.vercel.app/receipts/fbc0c3d8) | Wallet Risk Report | 0.02 USDC | [`7c3g9gDoWM…`](https://suiscan.xyz/mainnet/tx/7c3g9gDoWMfhKaxp9CqaWEkgivwp9BTZqb27EBAanRvA) | Tatum gRPC |
| [`ed95ccc4`](https://mandate-gules-five.vercel.app/receipts/ed95ccc4) | Premium Summariser | 0.05 USDC | [`FsGAeLNiRj…`](https://suiscan.xyz/mainnet/tx/FsGAeLNiRjDuDxxW5Pt3yQzNuJMSKBBRfxAUvfjA8eqy) | Tatum gRPC |
| [`ed95ccc4`](https://mandate-gules-five.vercel.app/receipts/ed95ccc4) | Wallet Risk Report | 0.02 USDC | [`duUYvUPgoT…`](https://suiscan.xyz/mainnet/tx/duUYvUPgoTiW3XzH8nFG7cCRQzZAYxGYYeeQDefvq3y) | Tatum gRPC |
| [`5236c34f`](https://mandate-gules-five.vercel.app/receipts/5236c34f) | Token Holder Check | 0.03 USDC | [`2YLTKLgmFo…`](https://suiscan.xyz/mainnet/tx/2YLTKLgmFozddF2MHZr62PKDWTbYtLN8B3ufcMQkuBEd) | Tatum gRPC |
| [`63e9068b`](https://mandate-gules-five.vercel.app/receipts/63e9068b) | Token Holder Check | 0.03 USDC | [`GYQGjRoUbm…`](https://suiscan.xyz/mainnet/tx/GYQGjRoUbmhWviWwjNhMDX6HRmZUG4YFDxFwRbKrEcZN) | Tatum gRPC |
| [`87a55573`](https://mandate-gules-five.vercel.app/receipts/87a55573) | Wallet Risk Report | 0.02 USDC | [`4ZZJGobbH8…`](https://suiscan.xyz/mainnet/tx/4ZZJGobbH8eEo9B6ogFogJFTaFdijCTwkVNSroZ1sjyq) | Tatum gRPC |
| [`1cdbf7d3`](https://mandate-gules-five.vercel.app/receipts/1cdbf7d3) | Wallet Risk Report | 0.02 USDC | [`9RKFhxDpmz…`](https://suiscan.xyz/mainnet/tx/9RKFhxDpmzP143Pkerti9HZmd64K6MK3J9FGR8SjSxMU) | Tatum gRPC |
| [`e2ac773f`](https://mandate-gules-five.vercel.app/receipts/e2ac773f) | Token Holder Check | 0.03 USDC | [`6CMv9cZJpu…`](https://suiscan.xyz/mainnet/tx/6CMv9cZJpuW2iQXBvFQ75eGDpa4ZE1xjJ8aH8V74zEXf) | Tatum gRPC |
| [`51c1bdc6`](https://mandate-gules-five.vercel.app/receipts/51c1bdc6) | Wallet Risk Report | 0.02 USDC | [`9fiXJSoTf4…`](https://suiscan.xyz/mainnet/tx/9fiXJSoTf4uuhs5EE5ST44FHbGhp4yyManPbfkN5S1bd) | Tatum gRPC |
| [`606e8df3`](https://mandate-gules-five.vercel.app/receipts/606e8df3) | Token Holder Check | 0.03 USDC | [`FnHg8QcnbV…`](https://suiscan.xyz/mainnet/tx/FnHg8QcnbVWveXzWv8e1hTFck1Rz3c3P3jh9aXcVshrh) | Tatum gRPC |
| [`4d4b786a`](https://mandate-gules-five.vercel.app/receipts/4d4b786a) | Wallet Risk Report | 0.02 USDC | [`4u64wetQgD…`](https://suiscan.xyz/mainnet/tx/4u64wetQgDN1erv1X1vG2MBzZ1Wr1jSS4BGK4vt3YBwt) | Tatum gRPC |
| [`2018a928`](https://mandate-gules-five.vercel.app/receipts/2018a928) | Wallet Risk Report | 0.02 USDC | [`GBK2Gs2Pex…`](https://suiscan.xyz/mainnet/tx/GBK2Gs2Pex4euReMGD3QfKVVyRoAMvRnjp5oGqu2KksD) | Tatum gRPC |
| [`3ed498d9`](https://mandate-gules-five.vercel.app/receipts/3ed498d9) | Token Holder Check | 0.03 USDC | [`B9h2x5LPW8…`](https://suiscan.xyz/mainnet/tx/B9h2x5LPW873K95ptGASej5wJ6ypheugWAfXh8RTizwf) | Tatum gRPC |
| [`abdcca25`](https://mandate-gules-five.vercel.app/receipts/abdcca25) | Wallet Risk Report | 0.02 USDC | [`54w8XAR4At…`](https://suiscan.xyz/mainnet/tx/54w8XAR4AtibEDNxKRf3x51pGTZt8noCXhJD76Gep49R) | Tatum gRPC |
| [`af2a984a`](https://mandate-gules-five.vercel.app/receipts/af2a984a) | Wallet Risk Report | 0.02 USDC | [`C2XYLBMPjy…`](https://suiscan.xyz/mainnet/tx/C2XYLBMPjy2AyDMYeqvVuxexUnwoqhZa4Vcs2NJ6zSjs) | Tatum gRPC |
| [`d6cfaab4`](https://mandate-gules-five.vercel.app/receipts/d6cfaab4) | Token Holder Check | 0.03 USDC | [`GHxqoC2mW5…`](https://suiscan.xyz/mainnet/tx/GHxqoC2mW5vseXFbzjTpoLo6AQiLcAfsxgnfYfELUNdm) | Tatum gRPC |
| [`d4659e44`](https://mandate-gules-five.vercel.app/receipts/d4659e44) | Wallet Risk Report | 0.02 USDC | [`EL1G2ma4W3…`](https://suiscan.xyz/mainnet/tx/EL1G2ma4W3N86Tu16VoGTnXFXENWzkv1SKZgASRRmmsd) | Tatum gRPC |
| [`1b6ffbea`](https://mandate-gules-five.vercel.app/receipts/1b6ffbea) | Wallet Risk Report | 0.02 USDC | [`AQ2LaFMdJU…`](https://suiscan.xyz/mainnet/tx/AQ2LaFMdJUcXSjW1gnjbwLh1fGYxDZfbTFAXYkosXp8b) | Tatum gRPC |
| [`aa036726`](https://mandate-gules-five.vercel.app/receipts/aa036726) | Wallet Risk Report | 0.02 USDC | [`GypKe5HHhL…`](https://suiscan.xyz/mainnet/tx/GypKe5HHhLj751BfQX8x2zodkdkkk7MEaB8y45XQU8gV) | Tatum gRPC |
| [`05d6d68b`](https://mandate-gules-five.vercel.app/receipts/05d6d68b) | Token Holder Check | 0.03 USDC | [`Aq5E53CuVh…`](https://suiscan.xyz/mainnet/tx/Aq5E53CuVhFbdSDKzdFdkb2roia8yXddrvaciUd3zjPM) | Tatum gRPC |
| [`854f86c6`](https://mandate-gules-five.vercel.app/receipts/854f86c6) | Wallet Risk Report | 0.02 USDC | [`4r1yzbPVUz…`](https://suiscan.xyz/mainnet/tx/4r1yzbPVUzCDdTGuF8SuFNEjEq9YSqauyGKq4XizchiJ) | Tatum gRPC |
| [`f8549020`](https://mandate-gules-five.vercel.app/receipts/f8549020) | Token Holder Check | 0.03 USDC | [`EpxhSaSSFh…`](https://suiscan.xyz/mainnet/tx/EpxhSaSSFhVKsVjZa6EvMuFRDkpC57ht3373gcoKHfS) | Tatum gRPC |
| [`4adaf605`](https://mandate-gules-five.vercel.app/receipts/4adaf605) | Wallet Risk Report | 0.02 USDC | [`EqfgxczBkh…`](https://suiscan.xyz/mainnet/tx/EqfgxczBkhUSWUFug4Cd8V8YJBBrXJNTYUTnCibNiQi6) | Tatum gRPC |
| [`8325ffd3`](https://mandate-gules-five.vercel.app/receipts/8325ffd3) | Wallet Risk Report | 0.02 USDC | [`GjUsq1cRJN…`](https://suiscan.xyz/mainnet/tx/GjUsq1cRJNPwZp5dXQGdEzr9QP9xnG7XXEvqGotQjzBp) | Tatum gRPC |
| [`37658048`](https://mandate-gules-five.vercel.app/receipts/37658048) | Token Holder Check | 0.03 USDC | [`F4AXfhANkq…`](https://suiscan.xyz/mainnet/tx/F4AXfhANkqjAYSJBbZ9bUhVwmC3P59WvqnnV9T1igMMi) | Tatum gRPC |
| [`9717647c`](https://mandate-gules-five.vercel.app/receipts/9717647c) | Token Holder Check | 0.03 USDC | [`uNxcG9RpMZ…`](https://suiscan.xyz/mainnet/tx/uNxcG9RpMZaB2ctjzxDKdeyABKLCHbJn8Lf9QzkLCTM) | Tatum gRPC |
| [`31d0eb73`](https://mandate-gules-five.vercel.app/receipts/31d0eb73) | Wallet Risk Report | 0.02 USDC | [`SBXph8LTgF…`](https://suiscan.xyz/mainnet/tx/SBXph8LTgFWbZfLvNjUGBya6BrZoD93x8jCcutx47Rp) | Tatum gRPC |
| [`ed09a8c4`](https://mandate-gules-five.vercel.app/receipts/ed09a8c4) | Token Holder Check | 0.03 USDC | [`ASYQatNde2…`](https://suiscan.xyz/mainnet/tx/ASYQatNde2Tid8GFQZRDu9xJjQ3HV5LHgqK6Y5iPsD7S) | Tatum gRPC |
| [`0703b882`](https://mandate-gules-five.vercel.app/receipts/0703b882) | Token Holder Check | 0.03 USDC | [`HyEqzdTo1Q…`](https://suiscan.xyz/mainnet/tx/HyEqzdTo1QuTUeDDtY4iu9kgbgUMx2AkWjgkypj3NtU1) | Tatum gRPC |
| [`df0a79c3`](https://mandate-gules-five.vercel.app/receipts/df0a79c3) | Token Holder Check | 0.03 USDC | [`2Rg2vZXahH…`](https://suiscan.xyz/mainnet/tx/2Rg2vZXahHitwRVzRDmexrFhq9m2ihDUMuXceydNgyAS) | Tatum gRPC |
| [`869f1d95`](https://mandate-gules-five.vercel.app/receipts/869f1d95) | Token Holder Check | 0.03 USDC | [`24EkfUemGT…`](https://suiscan.xyz/mainnet/tx/24EkfUemGThQDTisdPXKrLNi7LnQRMeNQtGZpYWYb5qS) | Tatum gRPC |
| [`938e0475`](https://mandate-gules-five.vercel.app/receipts/938e0475) | Token Holder Check | 0.03 USDC | [`2ShjycdJNS…`](https://suiscan.xyz/mainnet/tx/2ShjycdJNSYQPz3Ey4xvwJnkz8h7XpfqZoVApXQED1G3) | Tatum gRPC |
| [`ba6d8dfb`](https://mandate-gules-five.vercel.app/receipts/ba6d8dfb) | Token Holder Check | 0.03 USDC | [`9g3q1tRBab…`](https://suiscan.xyz/mainnet/tx/9g3q1tRBabHY18G1jSiWKcSk3qVV8itb6gTVaM2kxMks) | Tatum gRPC |
| [`9934b799`](https://mandate-gules-five.vercel.app/receipts/9934b799) | Token Holder Check | 0.03 USDC | [`BjK8PMn9uT…`](https://suiscan.xyz/mainnet/tx/BjK8PMn9uTnTXrQtSxj58uiT1ZBxUsUhzxNpS9DpdeAr) | Tatum gRPC |
| [`37360b18`](https://mandate-gules-five.vercel.app/receipts/37360b18) | Token Holder Check | 0.03 USDC | [`Gkubddk3pw…`](https://suiscan.xyz/mainnet/tx/Gkubddk3pwqNJQ9bmMYkCpA23Nu4owBTK1zqjZNWK9cn) | Tatum gRPC |
| [`0bcabebe`](https://mandate-gules-five.vercel.app/receipts/0bcabebe) | Wallet Risk Report | 0.02 USDC | [`3RRMgGMDz1…`](https://suiscan.xyz/mainnet/tx/3RRMgGMDz1wX331tyP6yPM8Lv4LweTaKA2DimVC3oJaT) | Tatum gRPC |
| [`d7ce0412`](https://mandate-gules-five.vercel.app/receipts/d7ce0412) | Wallet Risk Report | 0.02 USDC | [`4GSsjtg8Yi…`](https://suiscan.xyz/mainnet/tx/4GSsjtg8YiXC93vDSrt6yk4iYRjEoqDUQGdRXdxmBnQe) | Tatum gRPC |
| [`348d0d5d`](https://mandate-gules-five.vercel.app/receipts/348d0d5d) | Wallet Risk Report | 0.02 USDC | [`BACiV4pHC5…`](https://suiscan.xyz/mainnet/tx/BACiV4pHC5ZKcqAXrg2oNz8sLzMY6qYAjyMJGJruRVXj) | Tatum gRPC |
| [`4aadcfff`](https://mandate-gules-five.vercel.app/receipts/4aadcfff) | Wallet Risk Report | 0.02 USDC | [`BPFvTmxrn2…`](https://suiscan.xyz/mainnet/tx/BPFvTmxrn2TEUu1CupKUkCQTmYmiFLyWrMhu4FSP8BjG) | Tatum gRPC |
| [`b4ae9044`](https://mandate-gules-five.vercel.app/receipts/b4ae9044) | Token Holder Check | 0.03 USDC | [`BSiXBUg2EA…`](https://suiscan.xyz/mainnet/tx/BSiXBUg2EAxoe9tehfutEioRYbuJeZUSgZv8wx7c79hX) | Tatum gRPC |
| [`65a4ed02`](https://mandate-gules-five.vercel.app/receipts/65a4ed02) | Wallet Risk Report | 0.02 USDC | [`FLKbmyh5j7…`](https://suiscan.xyz/mainnet/tx/FLKbmyh5j7asdsn7iD64HmrppC5B1T7Y9iHA245CDMkN) | Tatum gRPC |
| [`e3f98bb3`](https://mandate-gules-five.vercel.app/receipts/e3f98bb3) | Wallet Risk Report | 0.02 USDC | [`7jJLwA3sLw…`](https://suiscan.xyz/mainnet/tx/7jJLwA3sLwtZMZ6H9Mfij72ynToPdEY6hPXxGsciTk4a) | Tatum gRPC |
| [`e0300453`](https://mandate-gules-five.vercel.app/receipts/e0300453) | Wallet Risk Report | 0.02 USDC | [`Gxmj2w9eQJ…`](https://suiscan.xyz/mainnet/tx/Gxmj2w9eQJEJXRsnoDc1J36stxnm1BBiJu2E5hYhQqsV) | Tatum gRPC |
| [`d74c09c3`](https://mandate-gules-five.vercel.app/receipts/d74c09c3) | Token Holder Check | 0.03 USDC | [`5FKAgDmHVM…`](https://suiscan.xyz/mainnet/tx/5FKAgDmHVMMj48mb7oxhbSxs6SSncfemaStQVxJ9Kakt) | Tatum gRPC |
| [`ba3064fe`](https://mandate-gules-five.vercel.app/receipts/ba3064fe) | Premium Summariser | 0.05 USDC | [`77obXjr58V…`](https://suiscan.xyz/mainnet/tx/77obXjr58VKuMGt4TkwNLjt2iA9TJtCZ7pRg9cDSN9Sj) | Tatum gRPC |
| [`ba3064fe`](https://mandate-gules-five.vercel.app/receipts/ba3064fe) | Wallet Risk Report | 0.02 USDC | [`CvxsKWFWeR…`](https://suiscan.xyz/mainnet/tx/CvxsKWFWeRgiaezeVzxfsifVppbvNH3YgqWW235SEQs1) | Tatum gRPC |
| [`1ce420fb`](https://mandate-gules-five.vercel.app/receipts/1ce420fb) | Token Holder Check | 0.03 USDC | [`FvU81h5J6s…`](https://suiscan.xyz/mainnet/tx/FvU81h5J6sMpqtZw6fuuqh7NRWFALb5uuYHfKQAQyURR) | Tatum gRPC |
| [`713f9eee`](https://mandate-gules-five.vercel.app/receipts/713f9eee) | Token Holder Check | 0.03 USDC | [`ZKTSh7uefv…`](https://suiscan.xyz/mainnet/tx/ZKTSh7uefv2cSLCY4sXuwafKPQCcW6osvtjkRcuMah4) | Tatum gRPC |
| [`02b8617b`](https://mandate-gules-five.vercel.app/receipts/02b8617b) | Token Holder Check | 0.03 USDC | [`UtqcyeurUn…`](https://suiscan.xyz/mainnet/tx/UtqcyeurUnQqkxEoW91XaANU3csA1FskcqQtmMxiPGM) | Tatum gRPC |
| [`d0e42892`](https://mandate-gules-five.vercel.app/receipts/d0e42892) | Token Holder Check | 0.03 USDC | [`J4k83SJPdP…`](https://suiscan.xyz/mainnet/tx/J4k83SJPdPGRTGeGWvMzSK5PBmBujy3ovPQAwkjAkdBZ) | Tatum gRPC |
| [`41f37143`](https://mandate-gules-five.vercel.app/receipts/41f37143) | Premium Summariser | 0.05 USDC | [`Bp7eMk1uWx…`](https://suiscan.xyz/mainnet/tx/Bp7eMk1uWxJTgKBLvCqzCUobEEjeygE9dYJq6RvWVHjn) | Tatum gRPC |
| [`41f37143`](https://mandate-gules-five.vercel.app/receipts/41f37143) | Wallet Risk Report | 0.02 USDC | [`ePKAKFRiNZ…`](https://suiscan.xyz/mainnet/tx/ePKAKFRiNZmesbrari6mfUpjJH62824NMCCqQgq1oJJ) | Tatum gRPC |
| [`5b9521fa`](https://mandate-gules-five.vercel.app/receipts/5b9521fa) | Token Holder Check | 0.03 USDC | [`EsfJ6JfM3J…`](https://suiscan.xyz/mainnet/tx/EsfJ6JfM3JUKBRi6MhHM8M5iWT7nRJyAY8pN5ucBVoun) | Tatum gRPC |
| [`edd6a226`](https://mandate-gules-five.vercel.app/receipts/edd6a226) | Premium Summariser | 0.05 USDC | [`3rcMQE8jNd…`](https://suiscan.xyz/mainnet/tx/3rcMQE8jNdpjmWukDiQM2Jc9jdepkrdV14bWA3vBqBM5) | Tatum gRPC |
| [`edd6a226`](https://mandate-gules-five.vercel.app/receipts/edd6a226) | Wallet Risk Report | 0.02 USDC | [`3En46NjhJN…`](https://suiscan.xyz/mainnet/tx/3En46NjhJNhQpUPpmrnRKQuRscsGmLpnPXqRGK3yXpak) | Tatum gRPC |
| [`d360c44b`](https://mandate-gules-five.vercel.app/receipts/d360c44b) | Token Holder Check | 0.03 USDC | [`vPhBzgFpv7…`](https://suiscan.xyz/mainnet/tx/vPhBzgFpv7SzqNk5GshdMRoW9VPUc3A3hUtZPJBwX19) | Tatum gRPC |
| [`b212a5d4`](https://mandate-gules-five.vercel.app/receipts/b212a5d4) | Premium Summariser | 0.05 USDC | [`3Yn8wBaYzN…`](https://suiscan.xyz/mainnet/tx/3Yn8wBaYzNr88gHg46pScAqwibU1SBPpwhUzYXEzTm53) | Tatum gRPC |
| [`b212a5d4`](https://mandate-gules-five.vercel.app/receipts/b212a5d4) | Wallet Risk Report | 0.02 USDC | [`6uJTPkw4eG…`](https://suiscan.xyz/mainnet/tx/6uJTPkw4eGgU4RWRndcEvhT7KWvJQr646ZgCu97jw5ND) | Tatum gRPC |
| [`5c6d0309`](https://mandate-gules-five.vercel.app/receipts/5c6d0309) | Premium Summariser | 0.05 USDC | [`Hx7y3rTyzb…`](https://suiscan.xyz/mainnet/tx/Hx7y3rTyzbtRChY4CXYEhWTPJLqSzxJxN8g1EGKcgeL8) | Tatum gRPC |
| [`5c6d0309`](https://mandate-gules-five.vercel.app/receipts/5c6d0309) | Wallet Risk Report | 0.02 USDC | [`4v56RQUN6U…`](https://suiscan.xyz/mainnet/tx/4v56RQUN6UqSNccetvN1syXvYm38zcLLHWG7m3MFmhPy) | Tatum gRPC |
| [`28593ab5`](https://mandate-gules-five.vercel.app/receipts/28593ab5) | Token Holder Check | 0.03 USDC | [`B7LYDqynVs…`](https://suiscan.xyz/mainnet/tx/B7LYDqynVsVp6gpRtFbijTb3FW9qGAbQRcbfJhErNgNq) | Tatum gRPC |
| [`8a80c954`](https://mandate-gules-five.vercel.app/receipts/8a80c954) | Token Holder Check | 0.03 USDC | [`BBPK8qRKxX…`](https://suiscan.xyz/mainnet/tx/BBPK8qRKxXYQco87nAN3x4JhwxYu9wfM8ohKTaSX64PS) | Tatum gRPC |
| [`9281b4eb`](https://mandate-gules-five.vercel.app/receipts/9281b4eb) | Premium Summariser | 0.05 USDC | [`HkKB8b8hMB…`](https://suiscan.xyz/mainnet/tx/HkKB8b8hMBypxJmQZn8hU2D6cgumLXQwJbEHmAMQqRya) | Tatum gRPC |
| [`9281b4eb`](https://mandate-gules-five.vercel.app/receipts/9281b4eb) | Wallet Risk Report | 0.02 USDC | [`26Pe5aAGTn…`](https://suiscan.xyz/mainnet/tx/26Pe5aAGTniLQSwqjyTtRTkJnyvS3Jq6r3MuGrXd2W4K) | Tatum gRPC |
| [`e582589f`](https://mandate-gules-five.vercel.app/receipts/e582589f) | Token Holder Check | 0.03 USDC | [`HYG9YJ8Bee…`](https://suiscan.xyz/mainnet/tx/HYG9YJ8BeepAQeFTA8mrQaubtwBQPJu11mf8KTb7YdS7) | Tatum gRPC |
| [`11323e83`](https://mandate-gules-five.vercel.app/receipts/11323e83) | Token Holder Check | 0.03 USDC | [`9153U6Gnag…`](https://suiscan.xyz/mainnet/tx/9153U6GnagYZag6FNUpvGT9445vkH45pVZo9i4C6o7tU) | Tatum gRPC |
| [`ff2baf04`](https://mandate-gules-five.vercel.app/receipts/ff2baf04) | Token Holder Check | 0.03 USDC | [`7XeZFziCVd…`](https://suiscan.xyz/mainnet/tx/7XeZFziCVdGBAat65JS1N3urDpoAiuRSzkHRky7QaGT8) | Tatum gRPC |
| [`cab6130a`](https://mandate-gules-five.vercel.app/receipts/cab6130a) | Token Holder Check | 0.03 USDC | [`DFgW6JBzcY…`](https://suiscan.xyz/mainnet/tx/DFgW6JBzcY8H85qyJ6qee19W6yhYb6hC9uhQi9k9DwUD) | Tatum gRPC |
| [`a91a0a6b`](https://mandate-gules-five.vercel.app/receipts/a91a0a6b) | Token Holder Check | 0.03 USDC | [`376jgUPuxE…`](https://suiscan.xyz/mainnet/tx/376jgUPuxECp1zeJG913kp8qnRiZkW3npimzJouA3nps) | Tatum gRPC |
| [`1d4424ef`](https://mandate-gules-five.vercel.app/receipts/1d4424ef) | Token Holder Check | 0.03 USDC | [`Cahiec1whS…`](https://suiscan.xyz/mainnet/tx/Cahiec1whSN9t47uUshz5h2qbayiZ1avxuLMfP3jEBPi) | Tatum gRPC |
| [`b6574188`](https://mandate-gules-five.vercel.app/receipts/b6574188) | Token Holder Check | 0.03 USDC | [`9Kgd8RJ2MT…`](https://suiscan.xyz/mainnet/tx/9Kgd8RJ2MTpG82z6bPhPFpsCREHMTo4WVaiKFwysxKK6) | Tatum gRPC |
| [`efc37b4e`](https://mandate-gules-five.vercel.app/receipts/efc37b4e) | Token Holder Check | 0.03 USDC | [`7vANDLDZLg…`](https://suiscan.xyz/mainnet/tx/7vANDLDZLgKPRteigtzSaNxmPF2BWu2KX5vj8stPvwyk) | Tatum gRPC |
| [`a2a35955`](https://mandate-gules-five.vercel.app/receipts/a2a35955) | Wallet Risk Report | 0.02 USDC | [`HUnVcXdvzq…`](https://suiscan.xyz/mainnet/tx/HUnVcXdvzqEp8xF9zcBVcvoTWX4Gzp1KDKtUSxg25yc3) | Tatum gRPC |
| [`07e516f9`](https://mandate-gules-five.vercel.app/receipts/07e516f9) | Wallet Risk Report | 0.02 USDC | [`6g1Kh148Mo…`](https://suiscan.xyz/mainnet/tx/6g1Kh148Moa29wUgTHF1zq7kzWkQjodfLrKZyKUHQ1Fi) | Tatum gRPC |
| [`13126125`](https://mandate-gules-five.vercel.app/receipts/13126125) | Wallet Risk Report | 0.02 USDC | [`Guz69wSVe1…`](https://suiscan.xyz/mainnet/tx/Guz69wSVe1ZHrhh5MYmmjTASocxySA6pZGMDbrvMBmKi) | Tatum gRPC |
| [`cc531ea8`](https://mandate-gules-five.vercel.app/receipts/cc531ea8) | Wallet Risk Report | 0.02 USDC | [`57gSkTD9nV…`](https://suiscan.xyz/mainnet/tx/57gSkTD9nV9ehGawU8kqTviAYcAY6nu5Wy3RHMF7m4L) | Tatum gRPC |
| [`a59d7f56`](https://mandate-gules-five.vercel.app/receipts/a59d7f56) | Token Holder Check | 0.03 USDC | [`qfEp7xZMBd…`](https://suiscan.xyz/mainnet/tx/qfEp7xZMBdnqSJwT3WqVtuRPM6ebw7wiVbqJ4ogjGFs) | Tatum gRPC |
| [`1cc68fda`](https://mandate-gules-five.vercel.app/receipts/1cc68fda) | Wallet Risk Report | 0.02 USDC | [`6wAwGaU8oT…`](https://suiscan.xyz/mainnet/tx/6wAwGaU8oTnKdViDJGTbZRSuLVhr2HsuQf455tXs9MfF) | Tatum gRPC |
| [`8190b049`](https://mandate-gules-five.vercel.app/receipts/8190b049) | Wallet Risk Report | 0.02 USDC | [`ASCkvRZpjp…`](https://suiscan.xyz/mainnet/tx/ASCkvRZpjpUkweSWktiLaX6cjf6JaZZo9cRmVNk8hcFt) | Tatum gRPC |
| [`630bde57`](https://mandate-gules-five.vercel.app/receipts/630bde57) | Wallet Risk Report | 0.02 USDC | [`Ea7Q29oh6u…`](https://suiscan.xyz/mainnet/tx/Ea7Q29oh6uDD1eBpsDLuHN7CuVoh6YWDcfHYzY33f7Bb) | Tatum gRPC |
| [`f77fec12`](https://mandate-gules-five.vercel.app/receipts/f77fec12) | Token Holder Check | 0.03 USDC | [`12b9s4zcEh…`](https://suiscan.xyz/mainnet/tx/12b9s4zcEhbaYSdujeHJTs1PC8wQUp9ubWBUcTkb2VXF) | Tatum gRPC |
| [`3e8bc00b`](https://mandate-gules-five.vercel.app/receipts/3e8bc00b) | Premium Summariser | 0.05 USDC | [`Cf4XNri5Dh…`](https://suiscan.xyz/mainnet/tx/Cf4XNri5DhMR5KUGdJwBaxbcfGDGibrcTrz2fGeSB26H) | Tatum gRPC |
| [`3e8bc00b`](https://mandate-gules-five.vercel.app/receipts/3e8bc00b) | Wallet Risk Report | 0.02 USDC | [`DcEnU4yoqB…`](https://suiscan.xyz/mainnet/tx/DcEnU4yoqBDqRLaH96Q6tHyUpNa7bdtRL5SyRjBLxykb) | Tatum gRPC |
| [`48b63654`](https://mandate-gules-five.vercel.app/receipts/48b63654) | Token Holder Check | 0.03 USDC | [`6R5FjCoBSQ…`](https://suiscan.xyz/mainnet/tx/6R5FjCoBSQgsSU3A25ReFStqWfNfTV22XQrCr13e2jh1) | Tatum gRPC |
| [`55761712`](https://mandate-gules-five.vercel.app/receipts/55761712) | Token Holder Check | 0.03 USDC | [`79DF7WP2Yp…`](https://suiscan.xyz/mainnet/tx/79DF7WP2Yp4PFTV28xNtWg4cuXgdav24z3Na2BdD6H7R) | Tatum gRPC |
| [`1b188ebc`](https://mandate-gules-five.vercel.app/receipts/1b188ebc) | Token Holder Check | 0.03 USDC | [`CnVFBbKFpF…`](https://suiscan.xyz/mainnet/tx/CnVFBbKFpFWM2ERo3rc38VUGCR3yYEPdx5CeJLQJ9Smx) | Tatum gRPC |
| [`c6caba44`](https://mandate-gules-five.vercel.app/receipts/c6caba44) | Token Holder Check | 0.03 USDC | [`DoYbpf4Zuo…`](https://suiscan.xyz/mainnet/tx/DoYbpf4ZuoH7yjNifaTqv38St9s11fkgcuq9EpxfAXHJ) | Tatum gRPC |
| [`052c2524`](https://mandate-gules-five.vercel.app/receipts/052c2524) | Premium Summariser | 0.05 USDC | [`2bswgDz8iy…`](https://suiscan.xyz/mainnet/tx/2bswgDz8iyFvXFEFc2TMVsVZjPUnSSbNaniXDSpUzUFm) | Tatum gRPC |
| [`052c2524`](https://mandate-gules-five.vercel.app/receipts/052c2524) | Wallet Risk Report | 0.02 USDC | [`xEJWfTA1kD…`](https://suiscan.xyz/mainnet/tx/xEJWfTA1kDCGJ3QhxZpEqh8y7x8eyP8RHd5o1MqPb6v) | Tatum gRPC |
| [`c25873dc`](https://mandate-gules-five.vercel.app/receipts/c25873dc) | Token Holder Check | 0.03 USDC | [`J6tD3jggQs…`](https://suiscan.xyz/mainnet/tx/J6tD3jggQscTLRvNK94zu6tKZ9GjPBrftstR7XPsEPx8) | Tatum gRPC |
| [`83193f97`](https://mandate-gules-five.vercel.app/receipts/83193f97) | Premium Summariser | 0.05 USDC | [`DHT3bVQdwC…`](https://suiscan.xyz/mainnet/tx/DHT3bVQdwCGwzw2CDYDvonrWJLeHR8WXcDtjkpNS6xxt) | Tatum gRPC |
| [`83193f97`](https://mandate-gules-five.vercel.app/receipts/83193f97) | Wallet Risk Report | 0.02 USDC | [`GKdqBrFtQX…`](https://suiscan.xyz/mainnet/tx/GKdqBrFtQXoLND2gwo7euMCEAyQvVBVHaUBLt5473w6k) | Tatum gRPC |
| [`08663fb2`](https://mandate-gules-five.vercel.app/receipts/08663fb2) | Premium Summariser | 0.05 USDC | [`C1Rfq1DJLU…`](https://suiscan.xyz/mainnet/tx/C1Rfq1DJLUni25eJDWSRo6cEmQo1VFBABPn6F18XKgb8) | Tatum gRPC |
| [`08663fb2`](https://mandate-gules-five.vercel.app/receipts/08663fb2) | Wallet Risk Report | 0.02 USDC | [`8H856yCzZi…`](https://suiscan.xyz/mainnet/tx/8H856yCzZi4eoua5TKzXtBXwLRca8kQwuhVGZzSSfbSi) | Tatum gRPC |
| [`e2f724ca`](https://mandate-gules-five.vercel.app/receipts/e2f724ca) | Token Holder Check | 0.03 USDC | [`BKzKekWTkE…`](https://suiscan.xyz/mainnet/tx/BKzKekWTkE5HAGUiomEepxErQqEcq62LQF49pnSMksKD) | Tatum gRPC |
| [`7e4f5208`](https://mandate-gules-five.vercel.app/receipts/7e4f5208) | Premium Summariser | 0.05 USDC | [`DUdFgBXCDs…`](https://suiscan.xyz/mainnet/tx/DUdFgBXCDs9xqxxwNsFK7GkdzzC3KGHPxs9NctKwRDz9) | Tatum gRPC |
| [`7e4f5208`](https://mandate-gules-five.vercel.app/receipts/7e4f5208) | Wallet Risk Report | 0.02 USDC | [`FbiDJETAcr…`](https://suiscan.xyz/mainnet/tx/FbiDJETAcra2iSDkSn67NFzcmJ3WvWVgau2UVkoZx2gi) | Tatum gRPC |
| [`83033b9b`](https://mandate-gules-five.vercel.app/receipts/83033b9b) | Premium Summariser | 0.05 USDC | [`Etz7G8bq8Z…`](https://suiscan.xyz/mainnet/tx/Etz7G8bq8Z1ub6E9QNhS5XBghG3AMZMP5yccp3CQ9xn4) | Tatum gRPC |
| [`83033b9b`](https://mandate-gules-five.vercel.app/receipts/83033b9b) | Wallet Risk Report | 0.02 USDC | [`5eBv5yCEBk…`](https://suiscan.xyz/mainnet/tx/5eBv5yCEBkWXppRV9BaJYrirMvdtVndCZd4AAQ9WZaak) | Tatum gRPC |
| [`5f00e515`](https://mandate-gules-five.vercel.app/receipts/5f00e515) | Token Holder Check | 0.03 USDC | [`GCasEL6Jor…`](https://suiscan.xyz/mainnet/tx/GCasEL6JorofxPAjnhWuAh7Xi5WSZiP1Y35qHfmTxPSG) | Tatum gRPC |
| [`2159f91b`](https://mandate-gules-five.vercel.app/receipts/2159f91b) | Token Holder Check | 0.03 USDC | [`8duEQZBnyw…`](https://suiscan.xyz/mainnet/tx/8duEQZBnywrXQ36gVsvDfytxyaSoYa7pg3GuUVD7Bi6j) | Tatum gRPC |
| [`74739d5d`](https://mandate-gules-five.vercel.app/receipts/74739d5d) | Premium Summariser | 0.05 USDC | [`BGzy3dkpuQ…`](https://suiscan.xyz/mainnet/tx/BGzy3dkpuQqBjDCTr9HDNrfsknekBbeKDecjjMBSWcmb) | Tatum gRPC |
| [`74739d5d`](https://mandate-gules-five.vercel.app/receipts/74739d5d) | Wallet Risk Report | 0.02 USDC | [`GzQi3ibLQU…`](https://suiscan.xyz/mainnet/tx/GzQi3ibLQUUw4dLFtzBQbU3VtpUFx4knCAzEdPrcurVn) | Tatum gRPC |
| [`9bf9f290`](https://mandate-gules-five.vercel.app/receipts/9bf9f290) | Premium Summariser | 0.05 USDC | [`BwLeY9MFnE…`](https://suiscan.xyz/mainnet/tx/BwLeY9MFnEDaqALnWQdXxhAjSkxDvDt8P9kRMyqNYJ4a) | Tatum gRPC |
| [`9bf9f290`](https://mandate-gules-five.vercel.app/receipts/9bf9f290) | Wallet Risk Report | 0.02 USDC | [`Cxb2a4nehf…`](https://suiscan.xyz/mainnet/tx/Cxb2a4nehfNw5D6BmFi6suwsVs54BQEA18At5ZC4w6zu) | Tatum gRPC |
| [`6a07380d`](https://mandate-gules-five.vercel.app/receipts/6a07380d) | Premium Summariser | 0.05 USDC | [`39sa1Uwb5t…`](https://suiscan.xyz/mainnet/tx/39sa1Uwb5tT1mqzWSTdPCotrowAuRBfUtUPnC7kkHcgC) | Tatum gRPC |
| [`6a07380d`](https://mandate-gules-five.vercel.app/receipts/6a07380d) | Wallet Risk Report | 0.02 USDC | [`7EjQ5TaRkJ…`](https://suiscan.xyz/mainnet/tx/7EjQ5TaRkJi9b8PXegqXbr99bZTKiv1t9K1EMbNqrYqw) | Tatum gRPC |
| [`0524c0cb`](https://mandate-gules-five.vercel.app/receipts/0524c0cb) | Token Holder Check | 0.03 USDC | [`E77hq9BB54…`](https://suiscan.xyz/mainnet/tx/E77hq9BB54d99RxF91emCxJs9GdQeuTpamLYQGBwH1uU) | Tatum gRPC |
| [`e04b1c5c`](https://mandate-gules-five.vercel.app/receipts/e04b1c5c) | Token Holder Check | 0.03 USDC | [`3mQhBpVTpQ…`](https://suiscan.xyz/mainnet/tx/3mQhBpVTpQnhGNqSNY1uuSmyAhjCPBgDf3jWpNQZC8iy) | Tatum gRPC |
| [`e591ddd9`](https://mandate-gules-five.vercel.app/receipts/e591ddd9) | Premium Summariser | 0.05 USDC | [`D5eiVSn9VX…`](https://suiscan.xyz/mainnet/tx/D5eiVSn9VXi5b4zpusmyyrFCxquajn6KicG7VFEaH3Yv) | Tatum gRPC |
| [`e591ddd9`](https://mandate-gules-five.vercel.app/receipts/e591ddd9) | Wallet Risk Report | 0.02 USDC | [`Dkqn1qZoy6…`](https://suiscan.xyz/mainnet/tx/Dkqn1qZoy6emYdEosBRFiNm9e6QnFZwXw64RB6HQ1Fcy) | Tatum gRPC |
| [`6f984a10`](https://mandate-gules-five.vercel.app/receipts/6f984a10) | Premium Summariser | 0.05 USDC | [`EWfY4VDACF…`](https://suiscan.xyz/mainnet/tx/EWfY4VDACFJVUc3uCfAfsLoz66NV3AGGFQFjcU1yHr9p) | Tatum gRPC |
| [`6f984a10`](https://mandate-gules-five.vercel.app/receipts/6f984a10) | Wallet Risk Report | 0.02 USDC | [`BeahGo8ceh…`](https://suiscan.xyz/mainnet/tx/BeahGo8cehoaw3sv8TjrPWdsVaYeKWMbDnXaB2vDvUNc) | Tatum gRPC |
| [`a4b73b4e`](https://mandate-gules-five.vercel.app/receipts/a4b73b4e) | Premium Summariser | 0.05 USDC | [`RTCiVi8ExR…`](https://suiscan.xyz/mainnet/tx/RTCiVi8ExRYgXQrkiEwAqvDCwwHvaRVwsNTnAVD3WfY) | Tatum gRPC |
| [`a4b73b4e`](https://mandate-gules-five.vercel.app/receipts/a4b73b4e) | Wallet Risk Report | 0.02 USDC | [`FH211eLdho…`](https://suiscan.xyz/mainnet/tx/FH211eLdhomyuvjkqH6dw6wN39ho9WXvhvTKJgSBQJBs) | Tatum gRPC |
| [`c31cfe72`](https://mandate-gules-five.vercel.app/receipts/c31cfe72) | Premium Summariser | 0.05 USDC | [`2o91urm44W…`](https://suiscan.xyz/mainnet/tx/2o91urm44WhZUkF9jLQwaWHg2iXTbPZYt9nPpQjmCRZG) | Tatum gRPC |
| [`c31cfe72`](https://mandate-gules-five.vercel.app/receipts/c31cfe72) | Wallet Risk Report | 0.02 USDC | [`jm51GimEP5…`](https://suiscan.xyz/mainnet/tx/jm51GimEP5Xvt9gDfmfftD1s4AmC8HJ6XxoTMtC4SJq) | Tatum gRPC |
| [`74ddc5b0`](https://mandate-gules-five.vercel.app/receipts/74ddc5b0) | Premium Summariser | 0.05 USDC | [`WYoipW3jup…`](https://suiscan.xyz/mainnet/tx/WYoipW3jupjULzBUfJn1xYyiPzqaCGFCFjp94tc3n3x) | Tatum gRPC |
| [`74ddc5b0`](https://mandate-gules-five.vercel.app/receipts/74ddc5b0) | Wallet Risk Report | 0.02 USDC | [`t2AnrkJMCg…`](https://suiscan.xyz/mainnet/tx/t2AnrkJMCgNguREtsX2PMEVb1SpcDrRGLNbzdRSoShv) | Tatum gRPC |
| [`9a4d70b1`](https://mandate-gules-five.vercel.app/receipts/9a4d70b1) | Premium Summariser | 0.05 USDC | [`3LDXnLhL9y…`](https://suiscan.xyz/mainnet/tx/3LDXnLhL9ywjmuw9nuTqwLWbor82nYwWRdjt4QFtXeq3) | Tatum gRPC |
| [`9a4d70b1`](https://mandate-gules-five.vercel.app/receipts/9a4d70b1) | Wallet Risk Report | 0.02 USDC | [`2fkUAqF2AW…`](https://suiscan.xyz/mainnet/tx/2fkUAqF2AWRcdJBgAXdhQN9Ev2tMYNE82wqujysquHs8) | Tatum gRPC |
| [`c4004322`](https://mandate-gules-five.vercel.app/receipts/c4004322) | Premium Summariser | 0.05 USDC | [`GGy24oB71P…`](https://suiscan.xyz/mainnet/tx/GGy24oB71Pz32ijwbwwaWD9NKrj7GnEpd7WjtqTNYzYN) | Tatum gRPC |
| [`c4004322`](https://mandate-gules-five.vercel.app/receipts/c4004322) | Wallet Risk Report | 0.02 USDC | [`BdNpQsXot2…`](https://suiscan.xyz/mainnet/tx/BdNpQsXot2DxByBGvRtydKwLHwoAwmjEdMQ8Zq3oVQbk) | Tatum gRPC |
| [`bac49d1a`](https://mandate-gules-five.vercel.app/receipts/bac49d1a) | Token Holder Check | 0.03 USDC | [`EwdLYRT6Ax…`](https://suiscan.xyz/mainnet/tx/EwdLYRT6Axmy8ax4a6BgwZFV75CXTEbamcvLxZh1jjto) | Tatum gRPC |
| [`c083b941`](https://mandate-gules-five.vercel.app/receipts/c083b941) | Premium Summariser | 0.05 USDC | [`6eb8WDrt4C…`](https://suiscan.xyz/mainnet/tx/6eb8WDrt4Ca64vTstC2f1FJwtLQP3uDDfnWf3WuMTMV1) | Tatum gRPC |
| [`c083b941`](https://mandate-gules-five.vercel.app/receipts/c083b941) | Wallet Risk Report | 0.02 USDC | [`23RYHUDvwJ…`](https://suiscan.xyz/mainnet/tx/23RYHUDvwJaDCQcnxrjivZmAqJ9sbrZkvxryzxgYNuyn) | Tatum gRPC |
| [`690e37ea`](https://mandate-gules-five.vercel.app/receipts/690e37ea) | Token Holder Check | 0.03 USDC | [`GGtS3ZkSiS…`](https://suiscan.xyz/mainnet/tx/GGtS3ZkSiSZkGdLgnnSEtYFnLqCRwqK9FRjb7nJ8wNXv) | Tatum gRPC |
| [`026fcef2`](https://mandate-gules-five.vercel.app/receipts/026fcef2) | Premium Summariser | 0.05 USDC | [`6oMdL72zir…`](https://suiscan.xyz/mainnet/tx/6oMdL72ziryQrSPFTDq9k8gxSxuRsGZa5EqNdMZF5iVN) | Tatum gRPC |
| [`026fcef2`](https://mandate-gules-five.vercel.app/receipts/026fcef2) | Wallet Risk Report | 0.02 USDC | [`BxGGPbLMh3…`](https://suiscan.xyz/mainnet/tx/BxGGPbLMh3Rantysdx3us4KNjq1ttUzKVAxGqGuscCd2) | Tatum gRPC |
| [`953a4ef5`](https://mandate-gules-five.vercel.app/receipts/953a4ef5) | Premium Summariser | 0.05 USDC | [`7BvTbAV1Q6…`](https://suiscan.xyz/mainnet/tx/7BvTbAV1Q69c5WQrdBnReZpKKHTKKNUVeM9gDAYr8Jjg) | Tatum gRPC |
| [`953a4ef5`](https://mandate-gules-five.vercel.app/receipts/953a4ef5) | Wallet Risk Report | 0.02 USDC | [`De5McxV3AY…`](https://suiscan.xyz/mainnet/tx/De5McxV3AY6mBqTYJTD4MMqo8tjhcpKm2tSBmrNWBxFm) | Tatum gRPC |
| [`c902e207`](https://mandate-gules-five.vercel.app/receipts/c902e207) | Premium Summariser | 0.05 USDC | [`DsxJnpa1bi…`](https://suiscan.xyz/mainnet/tx/DsxJnpa1biMAkeHVCWWBZZdwZ6gk6E585MjzPo75qmyc) | Tatum gRPC |
| [`c902e207`](https://mandate-gules-five.vercel.app/receipts/c902e207) | Wallet Risk Report | 0.02 USDC | [`J5eVWYaDNi…`](https://suiscan.xyz/mainnet/tx/J5eVWYaDNijt8ZFauFc4nptBq376uRPFnrn62pND93Sh) | Tatum gRPC |
| [`26805574`](https://mandate-gules-five.vercel.app/receipts/26805574) | Token Holder Check | 0.03 USDC | [`9XPt4AzDut…`](https://suiscan.xyz/mainnet/tx/9XPt4AzDutifPgVd18f2rp7wphwgH1aJdaCPJrgaqSKS) | Tatum gRPC |
| [`ad4cb2b7`](https://mandate-gules-five.vercel.app/receipts/ad4cb2b7) | Token Holder Check | 0.03 USDC | [`Bako5f9Kgd…`](https://suiscan.xyz/mainnet/tx/Bako5f9Kgdf4GNnoQxJc3KWQutPmRqb44uRjpNsGEumR) | Tatum gRPC |
| [`88803b8e`](https://mandate-gules-five.vercel.app/receipts/88803b8e) | Token Holder Check | 0.03 USDC | [`Dz9whHmUHB…`](https://suiscan.xyz/mainnet/tx/Dz9whHmUHBri99wPceXfBT6PeCDwPi7eNLp9LfNFpPgo) | Tatum gRPC |
| [`973e38f4`](https://mandate-gules-five.vercel.app/receipts/973e38f4) | Token Holder Check | 0.03 USDC | [`4V5GVWVotP…`](https://suiscan.xyz/mainnet/tx/4V5GVWVotPxL3zEPpqNGiRt1YmtAhR1nek2M1tRyHHuP) | Tatum gRPC |
| [`3e5683ff`](https://mandate-gules-five.vercel.app/receipts/3e5683ff) | Premium Summariser | 0.05 USDC | [`4kTV8xVc5a…`](https://suiscan.xyz/mainnet/tx/4kTV8xVc5azgWnhx51Xtb8Xtr7NzjEECgrvc88af72Lh) | Tatum gRPC |
| [`3e5683ff`](https://mandate-gules-five.vercel.app/receipts/3e5683ff) | Wallet Risk Report | 0.02 USDC | [`5sY63vegc8…`](https://suiscan.xyz/mainnet/tx/5sY63vegc81twKxbJocaKFmzK7QiYTAg3b1kkPExUBwP) | Tatum gRPC |
| [`a10be48e`](https://mandate-gules-five.vercel.app/receipts/a10be48e) | Token Holder Check | 0.03 USDC | [`4sYH2hW884…`](https://suiscan.xyz/mainnet/tx/4sYH2hW884cd6WRsgnacvWmeQW3Qk1kkWQVxeDXsoKR6) | Tatum gRPC |
| [`af3694f3`](https://mandate-gules-five.vercel.app/receipts/af3694f3) | Token Holder Check | 0.03 USDC | [`6iT4d7sAhJ…`](https://suiscan.xyz/mainnet/tx/6iT4d7sAhJYWSXZMFK1M9RCFaAfbHcxDiiPeA3twdiXp) | Tatum gRPC |
| [`460090a8`](https://mandate-gules-five.vercel.app/receipts/460090a8) | Token Holder Check | 0.03 USDC | [`EpUNFoqD1N…`](https://suiscan.xyz/mainnet/tx/EpUNFoqD1N6ck3FYdgCJQ9mM45g1C32Zqidau5XBewnX) | Tatum gRPC |
| [`a39e22e5`](https://mandate-gules-five.vercel.app/receipts/a39e22e5) | Premium Summariser | 0.05 USDC | [`C3cJTWWWLc…`](https://suiscan.xyz/mainnet/tx/C3cJTWWWLcR8qdHKMoprsFf6ELwYxgup5q3EV1gQu6az) | Tatum gRPC |
| [`a39e22e5`](https://mandate-gules-five.vercel.app/receipts/a39e22e5) | Wallet Risk Report | 0.02 USDC | [`8bQtZVCUYT…`](https://suiscan.xyz/mainnet/tx/8bQtZVCUYT4EG53UMEWM7vyDccHQhpK4iFvhg5z7VkyT) | Tatum gRPC |
| [`02aa5709`](https://mandate-gules-five.vercel.app/receipts/02aa5709) | Premium Summariser | 0.05 USDC | [`8AiPZgtkBJ…`](https://suiscan.xyz/mainnet/tx/8AiPZgtkBJkuLsFEzvUGTYVWtNjPauaXWTeNQLkWNrfQ) | Tatum gRPC |
| [`02aa5709`](https://mandate-gules-five.vercel.app/receipts/02aa5709) | Wallet Risk Report | 0.02 USDC | [`CbEBiaanFF…`](https://suiscan.xyz/mainnet/tx/CbEBiaanFFKPtPNPD2dPriX4xGBM6p35U1YKa8yNnhB2) | Tatum gRPC |
| [`e5cc6bab`](https://mandate-gules-five.vercel.app/receipts/e5cc6bab) | Token Holder Check | 0.03 USDC | [`7NJCYKYk65…`](https://suiscan.xyz/mainnet/tx/7NJCYKYk652KjHscEb2SvtdbCQ7E6Kmw8hCH2bi5MjpG) | Tatum gRPC |
| [`2270bdb4`](https://mandate-gules-five.vercel.app/receipts/2270bdb4) | Token Holder Check | 0.03 USDC | [`8QG5diQELN…`](https://suiscan.xyz/mainnet/tx/8QG5diQELNFTaKy3zSZG3h5rUiBky97VFgqqdnEJ753W) | Tatum gRPC |
| [`2ec625e1`](https://mandate-gules-five.vercel.app/receipts/2ec625e1) | Token Holder Check | 0.03 USDC | [`5NcT5ZdaXG…`](https://suiscan.xyz/mainnet/tx/5NcT5ZdaXGhvyv4FDtjM9Tr1WZbWwWXPKqUajGaM6m2a) | Tatum gRPC |
| [`d6cd8e0f`](https://mandate-gules-five.vercel.app/receipts/d6cd8e0f) | Premium Summariser | 0.05 USDC | [`FkZWNYPHf4…`](https://suiscan.xyz/mainnet/tx/FkZWNYPHf4bcZ9Z3ajTbknJzL5Hbvv66dXEQ5AzEcEKD) | Tatum gRPC |
| [`d6cd8e0f`](https://mandate-gules-five.vercel.app/receipts/d6cd8e0f) | Wallet Risk Report | 0.02 USDC | [`81GuLTBois…`](https://suiscan.xyz/mainnet/tx/81GuLTBoisbjdmbefwdPikTvStVLip4wtoY8dniAw4qM) | Tatum gRPC |
| [`e1edbc72`](https://mandate-gules-five.vercel.app/receipts/e1edbc72) | Premium Summariser | 0.05 USDC | [`HE1P7UUqqa…`](https://suiscan.xyz/mainnet/tx/HE1P7UUqqaojF7yvW9ZGZo8wp5zFWavCmJ4hdafRowi9) | Tatum gRPC |
| [`e1edbc72`](https://mandate-gules-five.vercel.app/receipts/e1edbc72) | Wallet Risk Report | 0.02 USDC | [`Hn5oVCwTB6…`](https://suiscan.xyz/mainnet/tx/Hn5oVCwTB6qrjWkMRCPDwqHns446zUmTTzHwAX3q9hL8) | Tatum gRPC |
| [`efcdb557`](https://mandate-gules-five.vercel.app/receipts/efcdb557) | Token Holder Check | 0.03 USDC | [`HBdwBL2TRd…`](https://suiscan.xyz/mainnet/tx/HBdwBL2TRdt2WQCYaT8TL2WTtAZCJ2EajxkPMjJj4pSF) | Tatum gRPC |
| [`68eb0b27`](https://mandate-gules-five.vercel.app/receipts/68eb0b27) | Token Holder Check | 0.03 USDC | [`5apdTUAnLn…`](https://suiscan.xyz/mainnet/tx/5apdTUAnLncwk3R4DvsRNUKWfRo28PNHf5EchP1rcGvG) | Tatum gRPC |
| [`83888acc`](https://mandate-gules-five.vercel.app/receipts/83888acc) | Token Holder Check | 0.03 USDC | [`BYmukYuDpo…`](https://suiscan.xyz/mainnet/tx/BYmukYuDpoHuaWhURoaBVCDMwchvfjSFpYKM97ekr2L3) | Tatum gRPC |
| [`be92f08c`](https://mandate-gules-five.vercel.app/receipts/be92f08c) | Premium Summariser | 0.05 USDC | [`2yUWzxNx48…`](https://suiscan.xyz/mainnet/tx/2yUWzxNx483NLWtgYo9jZCgVjBg2JFVMUXW5vrKfmTWG) | Tatum gRPC |
| [`be92f08c`](https://mandate-gules-five.vercel.app/receipts/be92f08c) | Wallet Risk Report | 0.02 USDC | [`F46HRhwvzY…`](https://suiscan.xyz/mainnet/tx/F46HRhwvzYvS5Co4pv6xSpeE6mdSTYGbGiJ1ADvZLCiu) | Tatum gRPC |
| [`1398ecee`](https://mandate-gules-five.vercel.app/receipts/1398ecee) | Premium Summariser | 0.05 USDC | [`D7BZXo2EUm…`](https://suiscan.xyz/mainnet/tx/D7BZXo2EUm83q7Jup9XpUG6eHC1DjRWpxtnEFi6AqUQj) | Tatum gRPC |
| [`1398ecee`](https://mandate-gules-five.vercel.app/receipts/1398ecee) | Wallet Risk Report | 0.02 USDC | [`AXgJcEy4WH…`](https://suiscan.xyz/mainnet/tx/AXgJcEy4WHzb6QuaQBcqo9eVPPAmGxz1BFjPcXRyoy4v) | Tatum gRPC |
| [`ef160b06`](https://mandate-gules-five.vercel.app/receipts/ef160b06) | Token Holder Check | 0.03 USDC | [`76dWLN6M5k…`](https://suiscan.xyz/mainnet/tx/76dWLN6M5kWJi8gB4gJUGsmkSbrXso9uJNYuQBfohLgh) | Tatum gRPC |
| [`c5d40f78`](https://mandate-gules-five.vercel.app/receipts/c5d40f78) | Token Holder Check | 0.03 USDC | [`Dg4d5UTAgx…`](https://suiscan.xyz/mainnet/tx/Dg4d5UTAgxW41btkQjPVr9Vp1tA6LtevYxXarcLACdFV) | Tatum gRPC |
| [`ed33986a`](https://mandate-gules-five.vercel.app/receipts/ed33986a) | Token Holder Check | 0.03 USDC | [`FsY2q1vpmw…`](https://suiscan.xyz/mainnet/tx/FsY2q1vpmwtb7mciUR2VakRYWBAdDLPAr3ysGtzW6PWY) | Tatum gRPC |
| [`b77aac7d`](https://mandate-gules-five.vercel.app/receipts/b77aac7d) | Token Holder Check | 0.03 USDC | [`on94ds9zWy…`](https://suiscan.xyz/mainnet/tx/on94ds9zWymoHzZwK6ZHmKAcYWibLu36pvXyFtrqaGy) | Tatum gRPC |
| [`a81a49b5`](https://mandate-gules-five.vercel.app/receipts/a81a49b5) | Token Holder Check | 0.03 USDC | [`GsY4VKDhJ8…`](https://suiscan.xyz/mainnet/tx/GsY4VKDhJ8obobVR3Hx8pcEG7kTjr8L3TAp6oFrNaisW) | Tatum gRPC |
| [`ebb6661f`](https://mandate-gules-five.vercel.app/receipts/ebb6661f) | Premium Summariser | 0.05 USDC | [`Ao3MobMq1s…`](https://suiscan.xyz/mainnet/tx/Ao3MobMq1sxmuxdifaDz5SSb53238FP3BsZmkJRcbsdR) | Tatum gRPC |
| [`ebb6661f`](https://mandate-gules-five.vercel.app/receipts/ebb6661f) | Wallet Risk Report | 0.02 USDC | [`GR3mkaSiiF…`](https://suiscan.xyz/mainnet/tx/GR3mkaSiiF1StZKiPGdBYjiDQocAZXY38248Z1FL7tmK) | Tatum gRPC |
| [`798cf7b8`](https://mandate-gules-five.vercel.app/receipts/798cf7b8) | Wallet Risk Report | 0.02 USDC | [`4Gtr5EXoXs…`](https://suiscan.xyz/mainnet/tx/4Gtr5EXoXsgmQMh1ujT5KZDpR3wjs7dcqBTR3cHTZkS8) | Tatum gRPC |
| [`a8c452d3`](https://mandate-gules-five.vercel.app/receipts/a8c452d3) | Token Holder Check | 0.03 USDC | [`2jSgefmVkZ…`](https://suiscan.xyz/mainnet/tx/2jSgefmVkZ2cbiDiZuKwZYsU1pd6R9BkZNjYeAGQuZph) | Tatum gRPC |
| [`821cff98`](https://mandate-gules-five.vercel.app/receipts/821cff98) | Wallet Risk Report | 0.02 USDC | [`7A3U7AizEo…`](https://suiscan.xyz/mainnet/tx/7A3U7AizEo41jMyL1PZQd1581eGZi4nc7jRoAZBvNQfh) | Tatum gRPC |
| [`0a8bee89`](https://mandate-gules-five.vercel.app/receipts/0a8bee89) | Premium Summariser | 0.05 USDC | [`HKzJZWpC4S…`](https://suiscan.xyz/mainnet/tx/HKzJZWpC4SNDivu7y6Ht9uf8rBdwiinQjYkdmPfgzRnj) | Tatum gRPC |
| [`0a8bee89`](https://mandate-gules-five.vercel.app/receipts/0a8bee89) | Wallet Risk Report | 0.02 USDC | [`8krBHvCLey…`](https://suiscan.xyz/mainnet/tx/8krBHvCLeynt1aqKrLoHtMXxLHs1J55dCcm75Cqe9EbU) | Tatum gRPC |
| [`e2c13e58`](https://mandate-gules-five.vercel.app/receipts/e2c13e58) | Premium Summariser | 0.05 USDC | [`GzsnGFn2td…`](https://suiscan.xyz/mainnet/tx/GzsnGFn2tdWj2FiN3mq2q7kLxWCNNNcip1VaLSVqufhw) | Tatum gRPC |
| [`e2c13e58`](https://mandate-gules-five.vercel.app/receipts/e2c13e58) | Wallet Risk Report | 0.02 USDC | [`GgSWkdV5gQ…`](https://suiscan.xyz/mainnet/tx/GgSWkdV5gQAwcXvWZBPtJyochRawFbmh2Hbn36wyxV53) | Tatum gRPC |
| [`05671672`](https://mandate-gules-five.vercel.app/receipts/05671672) | Wallet Risk Report | 0.02 USDC | [`EFgj5Lojzx…`](https://suiscan.xyz/mainnet/tx/EFgj5LojzxwqTr8mCQbhh52wusLq2S7UeUnJSv3BmFqF) | Tatum gRPC |
| [`88b23fa8`](https://mandate-gules-five.vercel.app/receipts/88b23fa8) | Wallet Risk Report | 0.02 USDC | [`zNbfxKZWDp…`](https://suiscan.xyz/mainnet/tx/zNbfxKZWDppAZL4cLeuRPGNHdZTbJNmXcUcpztdQJFb) | Tatum gRPC |
| [`3f926464`](https://mandate-gules-five.vercel.app/receipts/3f926464) | Premium Summariser | 0.05 USDC | [`8BLqg9PQm7…`](https://suiscan.xyz/mainnet/tx/8BLqg9PQm7CE83NZvHtJpgmdWBDPcEBeN4bmmUuiUvsu) | Tatum gRPC |
| [`3f926464`](https://mandate-gules-five.vercel.app/receipts/3f926464) | Wallet Risk Report | 0.02 USDC | [`6VsbahxkFQ…`](https://suiscan.xyz/mainnet/tx/6VsbahxkFQmAgUpyTXtnn63T5sUtQkj2GWagEo2x73hb) | Tatum gRPC |
