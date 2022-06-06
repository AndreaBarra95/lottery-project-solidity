const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());

const { abi, evm } = require('../compile');

let accounts;
let lottery;

beforeEach(async () => {
  // Get a list of all accounts
  accounts = await web3.eth.getAccounts();
  lottery = await new web3.eth.Contract(abi)
    .deploy({
      data: evm.bytecode.object,
      arguments: [],
    })
    .send({ from: accounts[0], gas: '1000000' });
});

describe('Lottery Contract Test', () => {
  it('deploys a contract', () => {
    assert.ok(lottery.options.address);
  });
  
  it('allows a user to enter the lottery', async () => {
    await lottery.methods.enter().send({ 
      from: accounts[0], 
      value: web3.utils.toWei('0.02', 'ether')
  });
    const players = await lottery.methods.getPlayers().call({
      from: accounts[0]
    });
    assert.equal(accounts[0], players[0]);
    assert.equal(1, players.length);
  });

  it('allows multiple players to enter the lottery', async () => {
    await lottery.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei('0.02', 'ether')
    });
    await lottery.methods.enter().send({
      from: accounts[1],
      value: web3.utils.toWei('0.015', 'ether')
    });
    await lottery.methods.enter().send({
      from: accounts[2],
      value: web3.utils.toWei('0.015', 'ether')
    });
    const players = await lottery.methods.getPlayers().call({
      from: accounts[0]
    });
    assert.equal(accounts[0], players[0]);
    assert.equal(accounts[1], players[1]);
    assert.equal(accounts[2], players[2]);
    assert.equal(3, players.length);
  });
  it('Requires a certain amount of ethers to enter the lottery (KO scenario)', async () => {
    try{
      await lottery.methods.enter().send({
        from: accounts[0],
        value: web3.utils.toWei('0.05', 'ether')
      });
      assert(false);
    } catch(err) {
        assert(err);
    }
  });
  it('Only the manager can call the pickWinner function (KO scenario)', async () => {
    try {
      await lottery.methods.pickWinner().send({from: accounts[1]});
      assert(false);
    } catch(err) {
      assert(err);
    }
  });

  it("sends money to the winner and resets the players array", async () => {
    await lottery.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei("2", "ether"),
    });

    const initialBalance = await web3.eth.getBalance(accounts[0]);
    await lottery.methods.pickWinner().send({from: accounts[0]});
    const players = await lottery.methods.getPlayers().call({from: accounts[0]});
    const finalBalance = await web3.eth.getBalance(accounts[0]);
    const difference = finalBalance - initialBalance;
  
    assert(difference > web3.utils.toWei("1.8", "ether"));
    assert.equal(players.length, 0)
  });
});
