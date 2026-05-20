import json
from pathlib import Path

from django.conf import settings
from web3 import Web3


def _load_contract_abi():
    abi_path = (
        Path(settings.BASE_DIR).parent
        / "smart-contracts"
        / "artifacts"
        / "contracts"
        / "CoffeeChainAudit.sol"
        / "CoffeeChainAudit.json"
    )
    with open(abi_path, "r", encoding="utf-8") as file:
        return json.load(file)["abi"]


def _get_web3():
    provider = Web3.HTTPProvider(settings.POLYGON_RPC_URL)
    return Web3(provider)


def anchor_transaction(transaction_id, hash_value):
    web3 = _get_web3()
    abi = _load_contract_abi()
    contract = web3.eth.contract(
        address=web3.to_checksum_address(settings.POLYGON_CONTRACT_ADDRESS),
        abi=abi,
    )

    account = web3.eth.account.from_key(settings.POLYGON_PRIVATE_KEY)
    nonce = web3.eth.get_transaction_count(account.address)

    tx = contract.functions.anchorTransaction(
        transaction_id, hash_value
    ).build_transaction(
        {
            "from": account.address,
            "nonce": nonce,
            "gas": 200000,
            "gasPrice": web3.eth.gas_price,
            "chainId": 80002,
        }
    )

    signed = web3.eth.account.sign_transaction(tx, private_key=settings.POLYGON_PRIVATE_KEY)
    tx_hash = web3.eth.send_raw_transaction(signed.rawTransaction)
    return web3.to_hex(tx_hash)
