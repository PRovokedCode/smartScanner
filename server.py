# First install web3 using: pip install web3
from web3 import Web3
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

# Replace with your own API keys
ETHERSCAN_API_KEY = "C9YRJBZ3QZKKG3TBUZRGS7IVHUATMW1VX6"
MORALIS_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjU0YWExMmQ5LWQ1NDktNGMxYy04MjM5LTQwZWYxMTQ4NzBjOSIsIm9yZ0lkIjoiNDM4NjU2IiwidXNlcklkIjoiNDUxMjg1IiwidHlwZSI6IlBST0pFQ1QiLCJ0eXBlSWQiOiIzZmZmZDNmYy0zY2NmLTRjODctYTQ0Zi1kYzM2ZGVhYzliZDQiLCJpYXQiOjE3NDMyNjAxMTksImV4cCI6NDg5OTAyMDExOX0.RloNIaZ9o-v0PeTGYg_47g4AM2fcAT8un7fkAFs3tGU"
COINGECKO_API_KEY = "CG-EtGJqa7LXmNg4dEdobiFuS2Q"

# Permanent contract addresses
NFT_ADDRESS = Web3.to_checksum_address("0xBd3531dA5CF5857e7cfAA92426877b022e612cf8")  # PudgyPenguins NFT
TOKEN_ADDRESS = Web3.to_checksum_address("0xdAC17F958D2ee523a2206206994597C13D831ec7")  # USDT token

rpc_urls = {
    "mainnet": "https://mainnet.infura.io/v3/b0115ff7b3e04a58901ed61410335538",  # Ethereum Mainnet
    "ropsten": "https://ropsten.infura.io/v3/b0115ff7b3e04a58901ed61410335538",  # Ropsten Testnet
    "rinkeby": "https://rinkeby.infura.io/v3/b0115ff7b3e04a58901ed61410335538",  # Rinkeby Testnet
    "goerli": "https://goerli.infura.io/v3/b0115ff7b3e04a58901ed61410335538",  # Goerli Testnet
    "kovan": "https://kovan.infura.io/v3/b0115ff7b3e04a58901ed61410335538",  # Kovan Testnet
    "polygon": "https://polygon-mainnet.infura.io/v3/b0115ff7b3e04a58901ed61410335538",  # Polygon Mainnet
    "arbitrum": "https://arbitrum-mainnet.infura.io/v3/b0115ff7b3e04a58901ed61410335538",  # Arbitrum Mainnet
    "optimism": "https://optimism-mainnet.infura.io/v3/b0115ff7b3e04a58901ed61410335538",  # Optimism Mainnet
    "binance_smart_chain": "https://bsc-mainnet.infura.io/v3/b0115ff7b3e04a58901ed61410335538",  # Binance Smart Chain Mainnet
    "avalanche": "https://avalanche-mainnet.infura.io/v3/b0115ff7b3e04a58901ed61410335538",  # Avalanche Mainnet
    "fantom": "https://fantom-mainnet.infura.io/v3/b0115ff7b3e04a58901ed61410335538"  # Fantom Mainnet
}

# Select network (permanent for now)
selected_network = "mainnet"

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(rpc_urls[selected_network]))

def validate_address(address):
    address = ''.join(char for char in address if char.isprintable())
    if not Web3.is_address(address):
        raise ValueError("Please provide a valid address")
    return address

def is_nft_contract(token_address):
    try:
        url = f"https://deep-index.moralis.io/api/v2/nft/{token_address}/metadata?chain=eth"
        headers = {"X-API-Key": MORALIS_API_KEY}
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            return True
        return False
    except Exception:
        return False

def check_liquidity(token_address):
    try:
        url = f"https://deep-index.moralis.io/api/v2/erc20/{token_address}/stats?chain=eth"
        headers = {"X-API-Key": MORALIS_API_KEY}
        response = requests.get(url, headers=headers)
        response.raise_for_status()  # Raise an error for non-200 status codes
        data = response.json()
        return data.get("total_liquidity", "Unknown")
    except (requests.exceptions.RequestException, ValueError) as e:
        return f"Error checking liquidity: {str(e)}"  # Return error message instead of failing completely

def get_contract_abi(token_address):
    # Example ABI retrieval, should replace with actual logic
    return [
        {
            "name": "owner",
            "type": "function",
            "constant": True,
            "inputs": [],
            "outputs": [{"type": "address"}],
            "payable": False,
            "stateMutability": "view"
        }
    ]

def check_owner_control(token_address):
    try:
        abi = get_contract_abi(token_address)
        if abi:
            contract = w3.eth.contract(address=token_address, abi=abi)
            owner = contract.functions.owner().call()
            return f"Owner Address: {owner}"
        return "Owner control unknown"
    except Exception as e:
        return f"Error checking owner control: {str(e)}"

def check_minting_restriction(token_address):
    try:
        abi = get_contract_abi(token_address)
        if abi:
            contract = w3.eth.contract(address=token_address, abi=abi)
            if "mint" in [func["name"] for func in contract.abi if func["type"] == "function"]:
                return "Minting is enabled (Risky)"
            return "No unlimited minting"
        return "Minting status unknown"
    except Exception as e:
        return f"Error checking minting restriction: {str(e)}"

def check_honeypot_risk(token_address):
    try:
        url = f"https://deep-index.moralis.io/api/v2/erc20/{token_address}/trades?chain=eth"
        headers = {"X-API-Key": MORALIS_API_KEY}
        response = requests.get(url, headers=headers).json()
        if response and "sell" in response:
            return "No honeypot detected"
        return "Honeypot risk detected"
    except Exception as e:
        return f"Error checking honeypot risk: {str(e)}"

def check_transaction_history(token_address):
    try:
        url = f"https://api.etherscan.io/api?module=account&action=txlist&address={token_address}&apikey={ETHERSCAN_API_KEY}"
        response = requests.get(url).json()
        if response["status"] == "1" and len(response["result"]) > 10:
            return "Active transaction history"
        return "Low transaction activity (Suspicious)"
    except Exception as e:
        return f"Error checking transaction history: {str(e)}"

def get_nft_metadata(token_address):
    try:
        url = f"https://deep-index.moralis.io/api/v2/nft/{token_address}/metadata?chain=eth"
        headers = {"X-API-Key": MORALIS_API_KEY}
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()
        return data
    except Exception as e:
        return f"Error fetching NFT metadata: {str(e)}"

def get_nft_floor_price(token_address):
    try:
        url = f"https://api.opensea.io/api/v1/assets?order_direction=desc&order_by=price&order_direction=desc&limit=1&asset_contract_address={token_address}"
        response = requests.get(url).json()
        floor_price = response.get("assets", [{}])[0].get("sell_orders", [{}])[0].get("current_price", "Price not available")
        return floor_price
    except Exception as e:
        return f"Error fetching NFT floor price: {str(e)}"

def get_token_price(token_address):
    url = f"https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses={token_address}&vs_currencies=usd&x_cg_api_key={COINGECKO_API_KEY}"
    response = requests.get(url).json()
    return response.get(token_address.lower(), {}).get("usd", "Price not available")

def analyze_token(token_address):
    try:
        token_address = validate_address(token_address)
        print(f"Analyzing Token: {token_address}")
        print("Liquidity:", check_liquidity(token_address))
        print("Owner Control:", check_owner_control(token_address))
        print("Minting Restriction:", check_minting_restriction(token_address))
        print("Honeypot Risk:", check_honeypot_risk(token_address))
        print("Transaction History:", check_transaction_history(token_address))
        print("Token Price:", get_token_price(token_address))
    except ValueError as e:
        print(f"Error: {str(e)}")
    except Exception as e:
        print(f"Unexpected error: {str(e)}")

def analyze_asset(address):
    try:
        address = validate_address(address)
        print(f"\nAnalyzing Asset: {address}")
        
        if is_nft_contract(address):
            print("Asset Type: NFT Collection")
            metadata = get_nft_metadata(address)
            print("NFT Metadata:", metadata)
            print("Floor Price:", get_nft_floor_price(address))
            print("Owner Control:", check_owner_control(address))
            print("Minting Restriction:", check_minting_restriction(address))
            print("Transaction History:", check_transaction_history(address))
        else:
            print("Asset Type: Token")
            print("Liquidity:", check_liquidity(address))
            print("Owner Control:", check_owner_control(address))
            print("Minting Restriction:", check_minting_restriction(address))
            print("Honeypot Risk:", check_honeypot_risk(address))
            print("Transaction History:", check_transaction_history(address))
            print("Token Price:", get_token_price(address))
            
    except ValueError as e:
        print(f"Error: {str(e)}")
    except Exception as e:
        print(f"Unexpected error: {str(e)}")

# Example usage - This will always analyze the same addresses unless modified
analyze_asset(NFT_ADDRESS)
analyze_asset(TOKEN_ADDRESS)


app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/api/analyze', methods=['POST'])
def analyze_contract():
    try:
        data = request.get_json()
        address = data.get('address')
        
        if not address:
            return jsonify({'error': 'Address is required'}), 400

        # Validate address
        address = validate_address(address)
        
        # Check if it's an NFT or token
        is_nft = is_nft_contract(address)
        
        # Base analysis data
        result = {
            'type': 'NFT' if is_nft else 'TOKEN',
            'address': address,
            'liquidity': check_liquidity(address),
            'owner_control': check_owner_control(address),
            'minting_restriction': check_minting_restriction(address),
            'transaction_history': check_transaction_history(address),
            'rawData': {}  # Initialize rawData object
        }
        
        if is_nft:
            metadata = get_nft_metadata(address)
            floor_price = get_nft_floor_price(address)
            result.update({
                'metadata': metadata,
                'floor_price': floor_price,
                'rawData': {
                    'metadata': metadata,
                    'floor_price': floor_price
                }
            })
        else:
            token_price = get_token_price(address)
            honeypot_risk = check_honeypot_risk(address)
            result.update({
                'honeypot_risk': honeypot_risk,
                'token_price': token_price,
                'rawData': {
                    'token_price': token_price,
                    'honeypot_risk': honeypot_risk,
                    'liquidity': result['liquidity']
                }
            })

        # Add debug logging
        print("Analysis Result:", result)
            
        return jsonify(result)
        
    except Exception as e:
        print("Error during analysis:", str(e))  # Debug logging
        return jsonify({
            'error': str(e),
            'type': 'ERROR',
            'rawData': {'error': str(e)}
        }), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)
