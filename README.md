# Simple Staking Contract

## Address

Contract address at Goerli chain: [0xBFaCA5eC344276F6ccce65602fbB62af0d5E3FeF](https://goerli.etherscan.io/address/0xBFaCA5eC344276F6ccce65602fbB62af0d5E3FeF)

## Description
Логика работы стейкинг контракта следующая:

Пользователи могут отправлять свои USDT токены на контракт для стейкинга в
любое время, в любом количестве.

Пользователям каждый день раздается 1000 TTT токенов на всех, не зависимо от
количества вкладчиков и размера вклада.

Награда распределяется между пользователями пропорционально вкладу (если
Алиса внесла 10 USDT, а Боб 90 USDT, то Алиса получит за день 100 TTT, а Боб
900 TTT).

Награда распределяутся в соответствии с временем стейка
(если Алиса начала стейкать свои токены на полдня раньше Боба, то за первые
полдня она одна получает награду). Если в какой-то момент времени никто не
стейкает токены в контракте - никто не получает награду за это время. Награда
остается на стейкинг контракте.

Срок работы стейкинг контракта - 30 дней. (соответственно роздано будет 30000
ТТТ токенов).

Токены для награды (TTT) отправляются на адрес стейкинг-контракта
заранее.

## Run project

### Install dependencies
```
npm i
```

### Compile contracts
```
npx hardhat compile
```

### Run tests
```
npx hardhat test
```

### Deploy contract and 2 ERC-20 tokens
```
npx hardhat run scripts/deploy.ts
```

